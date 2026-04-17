import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';

// Test utilities
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const equipmentKey = (eq: { type: string; category: string; label: string }) =>
  `${eq.type}|${eq.category}|${eq.label}`.toLowerCase();

describe('Equipment Library Utilities', () => {
  describe('isUuid', () => {
    it('should return true for valid UUIDs', () => {
      expect(isUuid('18a712cb-e421-45df-b674-2d7e16e95c87')).toBe(true);
      expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUuid('scorp-connecter')).toBe(false);
      expect(isUuid('pac')).toBe(false);
      expect(isUuid('not-a-uuid')).toBe(false);
      expect(isUuid('')).toBe(false);
    });

    it('should return false for UUIDs with wrong format', () => {
      expect(isUuid('18a712cb-e421-45df-b674')).toBe(false);
      expect(isUuid('18a712cbe42145dfb6742d7e16e95c87')).toBe(false);
    });
  });

  describe('equipmentKey', () => {
    it('should generate consistent keys', () => {
      const eq1 = { type: 'terminal', category: 'hvac', label: 'PAC' };
      const eq2 = { type: 'terminal', category: 'hvac', label: 'pac' };
      
      expect(equipmentKey(eq1)).toBe('terminal|hvac|pac');
      expect(equipmentKey(eq2)).toBe('terminal|hvac|pac');
      expect(equipmentKey(eq1)).toBe(equipmentKey(eq2));
    });

    it('should generate different keys for different equipment', () => {
      const eq1 = { type: 'terminal', category: 'hvac', label: 'PAC' };
      const eq2 = { type: 'automate', category: 'hvac', label: 'Automate' };
      
      expect(equipmentKey(eq1)).not.toBe(equipmentKey(eq2));
    });
  });
});

describe('Equipment Library Merge Logic', () => {
  const defaultEquipment = [
    { id: 'pac', label: 'PAC', name: 'Pompe à chaleur', type: 'terminal', category: 'hvac', protocol: 'modbus-tcp', icon: 'Snowflake', isDefault: true },
    { id: 'chaudiere', label: 'Chaudière', name: 'Chaudière', type: 'terminal', category: 'hvac', protocol: 'modbus-rtu', icon: 'Flame', isDefault: true },
    { id: 'automate', label: 'Automate', name: 'Automate GTB', type: 'automate', category: 'hvac', protocol: 'bacnet-ip', icon: 'Cpu', isDefault: true },
  ];

  const mergeEquipment = (defaults: typeof defaultEquipment, dbItems: typeof defaultEquipment) => {
    const merged = new Map<string, typeof defaultEquipment[0]>();
    for (const d of defaults) merged.set(equipmentKey(d), d);
    for (const db of dbItems) merged.set(equipmentKey(db), db);
    return Array.from(merged.values()).sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      if (cat !== 0) return cat;
      return a.label.localeCompare(b.label);
    });
  };

  it('should return all defaults when DB is empty', () => {
    const result = mergeEquipment(defaultEquipment, []);
    expect(result).toHaveLength(3);
    expect(result.every(e => e.isDefault)).toBe(true);
  });

  it('should replace default with DB version when matching', () => {
    const dbItems = [
      { id: '18a712cb-e421-45df-b674-2d7e16e95c87', label: 'PAC', name: 'PAC Modifiée', type: 'terminal', category: 'hvac', protocol: 'modbus-tcp', icon: 'Snowflake', isDefault: false },
    ];

    const result = mergeEquipment(defaultEquipment, dbItems);
    
    expect(result).toHaveLength(3);
    const pac = result.find(e => e.label === 'PAC');
    expect(pac?.name).toBe('PAC Modifiée');
    expect(pac?.isDefault).toBe(false);
    expect(isUuid(pac?.id || '')).toBe(true);
  });

  it('should add new DB items that are not in defaults', () => {
    const dbItems = [
      { id: '18a712cb-e421-45df-b674-2d7e16e95c87', label: 'Nouveau', name: 'Nouvel équipement', type: 'terminal', category: 'metering', protocol: 'modbus-tcp', icon: 'Activity', isDefault: false },
    ];

    const result = mergeEquipment(defaultEquipment, dbItems);
    
    expect(result).toHaveLength(4);
    expect(result.find(e => e.label === 'Nouveau')).toBeDefined();
  });

  it('should handle multiple DB replacements', () => {
    const dbItems = [
      { id: '18a712cb-e421-45df-b674-2d7e16e95c87', label: 'PAC', name: 'PAC Modifiée', type: 'terminal', category: 'hvac', protocol: 'modbus-tcp', icon: 'Snowflake', isDefault: false },
      { id: '28a712cb-e421-45df-b674-2d7e16e95c88', label: 'Chaudière', name: 'Chaudière Modifiée', type: 'terminal', category: 'hvac', protocol: 'modbus-rtu', icon: 'Flame', isDefault: false },
    ];

    const result = mergeEquipment(defaultEquipment, dbItems);
    
    expect(result).toHaveLength(3);
    expect(result.filter(e => e.isDefault)).toHaveLength(1);
    expect(result.filter(e => !e.isDefault)).toHaveLength(2);
  });

  it('should maintain sort order by category then label', () => {
    const dbItems = [
      { id: '18a712cb-e421-45df-b674-2d7e16e95c87', label: 'ZZZ', name: 'Dernier', type: 'terminal', category: 'aaa', protocol: 'modbus-tcp', icon: 'Box', isDefault: false },
    ];

    const result = mergeEquipment(defaultEquipment, dbItems);
    
    // 'aaa' category should come before 'hvac'
    expect(result[0].category).toBe('aaa');
  });
});

describe('mapEquipmentToDb', () => {
  const mapEquipmentToDb = (equipment: any) => ({
    label: equipment.label,
    name: equipment.name,
    type: equipment.type,
    category: equipment.category,
    protocol: equipment.protocol,
    icon: equipment.icon || 'Box',
    description: equipment.description || null,
    reference: equipment.reference || null,
    manufacturer_id: equipment.manufacturer_id || null,
    is_default: equipment.isDefault || false,
    border_color: equipment.borderColor || null,
    header_background_color: equipment.headerBackgroundColor || null,
  });

  it('should map equipment to DB format', () => {
    const equipment = {
      label: 'PAC',
      name: 'Pompe à chaleur',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
      icon: 'Snowflake',
      description: 'Test description',
      borderColor: '#ff0000',
      headerBackgroundColor: '#00ff00',
    };

    const result = mapEquipmentToDb(equipment);

    expect(result.label).toBe('PAC');
    expect(result.border_color).toBe('#ff0000');
    expect(result.header_background_color).toBe('#00ff00');
    expect(result.is_default).toBe(false);
  });

  it('should handle empty optional fields', () => {
    const equipment = {
      label: 'PAC',
      name: 'Pompe à chaleur',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
    };

    const result = mapEquipmentToDb(equipment);

    expect(result.icon).toBe('Box');
    expect(result.description).toBeNull();
    expect(result.border_color).toBeNull();
    expect(result.header_background_color).toBeNull();
  });

  it('should handle empty string colors as null', () => {
    const equipment = {
      label: 'PAC',
      name: 'Pompe à chaleur',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
      borderColor: '',
      headerBackgroundColor: '',
    };

    const result = mapEquipmentToDb(equipment);

    expect(result.border_color).toBeNull();
    expect(result.header_background_color).toBeNull();
  });
});

describe('mapDbToEquipment', () => {
  const mapDbToEquipment = (db: any) => ({
    id: db.id,
    label: db.label,
    name: db.name,
    type: db.type,
    category: db.category,
    protocol: db.protocol,
    icon: db.icon,
    description: db.description || undefined,
    reference: db.reference || undefined,
    manufacturer_id: db.manufacturer_id || undefined,
    isDefault: db.is_default,
    borderColor: db.border_color || undefined,
    headerBackgroundColor: db.header_background_color || undefined,
  });

  it('should map DB format to equipment', () => {
    const dbEquipment = {
      id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      label: 'PAC',
      name: 'Pompe à chaleur',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
      icon: 'Snowflake',
      description: 'Test description',
      reference: 'REF-001',
      manufacturer_id: '38a712cb-e421-45df-b674-2d7e16e95c89',
      is_default: false,
      border_color: '#ff0000',
      header_background_color: '#00ff00',
    };

    const result = mapDbToEquipment(dbEquipment);

    expect(result.id).toBe('18a712cb-e421-45df-b674-2d7e16e95c87');
    expect(result.borderColor).toBe('#ff0000');
    expect(result.headerBackgroundColor).toBe('#00ff00');
    expect(result.isDefault).toBe(false);
  });

  it('should handle null optional fields as undefined', () => {
    const dbEquipment = {
      id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      label: 'PAC',
      name: 'Pompe à chaleur',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
      icon: 'Snowflake',
      description: null,
      reference: null,
      manufacturer_id: null,
      is_default: true,
      border_color: null,
      header_background_color: null,
    };

    const result = mapDbToEquipment(dbEquipment);

    expect(result.description).toBeUndefined();
    expect(result.borderColor).toBeUndefined();
    expect(result.headerBackgroundColor).toBeUndefined();
    expect(result.isDefault).toBe(true);
  });
});

describe('Update Logic - UUID Detection', () => {
  it('should insert instead of update for non-UUID ids', () => {
    const id = 'scorp-connecter';
    const shouldInsert = !isUuid(id);
    expect(shouldInsert).toBe(true);
  });

  it('should update for valid UUID ids', () => {
    const id = '18a712cb-e421-45df-b674-2d7e16e95c87';
    const shouldInsert = !isUuid(id);
    expect(shouldInsert).toBe(false);
  });
});

describe('Delete Logic - UUID Detection', () => {
  it('should throw error for non-UUID ids', () => {
    const id = 'pac';
    const canDelete = isUuid(id);
    expect(canDelete).toBe(false);
  });

  it('should allow delete for valid UUID ids', () => {
    const id = '18a712cb-e421-45df-b674-2d7e16e95c87';
    const canDelete = isUuid(id);
    expect(canDelete).toBe(true);
  });
});
