import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test utilities extracted from useManufacturers logic
const trimName = (name: string) => name.trim();

const validateManufacturer = (manufacturer: { name: string; equipment_type: string }) => {
  const errors: string[] = [];
  if (!manufacturer.name || manufacturer.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!manufacturer.equipment_type) {
    errors.push('Equipment type is required');
  }
  return errors;
};

describe('Manufacturer Utilities', () => {
  describe('trimName', () => {
    it('should trim whitespace from name', () => {
      expect(trimName('  Daikin  ')).toBe('Daikin');
      expect(trimName('Mitsubishi')).toBe('Mitsubishi');
    });

    it('should handle empty strings', () => {
      expect(trimName('')).toBe('');
      expect(trimName('   ')).toBe('');
    });
  });

  describe('validateManufacturer', () => {
    it('should return no errors for valid manufacturer', () => {
      const manufacturer = { name: 'Daikin', equipment_type: 'terminal' };
      expect(validateManufacturer(manufacturer)).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      const manufacturer = { name: '', equipment_type: 'terminal' };
      const errors = validateManufacturer(manufacturer);
      expect(errors).toContain('Name is required');
    });

    it('should return error for whitespace-only name', () => {
      const manufacturer = { name: '   ', equipment_type: 'terminal' };
      const errors = validateManufacturer(manufacturer);
      expect(errors).toContain('Name is required');
    });

    it('should return error for missing equipment_type', () => {
      const manufacturer = { name: 'Daikin', equipment_type: '' };
      const errors = validateManufacturer(manufacturer);
      expect(errors).toContain('Equipment type is required');
    });

    it('should return multiple errors when both fields are invalid', () => {
      const manufacturer = { name: '', equipment_type: '' };
      const errors = validateManufacturer(manufacturer);
      expect(errors).toHaveLength(2);
    });
  });
});

describe('Manufacturer Data Types', () => {
  interface Manufacturer {
    id: string;
    name: string;
    equipment_type: string;
    created_at: string;
    updated_at: string;
  }

  const mockManufacturer: Manufacturer = {
    id: '18a712cb-e421-45df-b674-2d7e16e95c87',
    name: 'Daikin',
    equipment_type: 'terminal',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should have correct structure', () => {
    expect(mockManufacturer).toHaveProperty('id');
    expect(mockManufacturer).toHaveProperty('name');
    expect(mockManufacturer).toHaveProperty('equipment_type');
    expect(mockManufacturer).toHaveProperty('created_at');
    expect(mockManufacturer).toHaveProperty('updated_at');
  });

  it('should have valid UUID for id', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(mockManufacturer.id)).toBe(true);
  });
});

describe('Manufacturer Filtering', () => {
  const manufacturers = [
    { id: '1', name: 'Daikin', equipment_type: 'terminal' },
    { id: '2', name: 'Mitsubishi', equipment_type: 'terminal' },
    { id: '3', name: 'Siemens', equipment_type: 'automate' },
    { id: '4', name: 'Schneider', equipment_type: 'automate' },
  ];

  const filterByType = (items: typeof manufacturers, type?: string) => {
    if (!type) return items;
    return items.filter(m => m.equipment_type === type);
  };

  it('should return all manufacturers when no filter', () => {
    const result = filterByType(manufacturers);
    expect(result).toHaveLength(4);
  });

  it('should filter by equipment type', () => {
    const terminals = filterByType(manufacturers, 'terminal');
    expect(terminals).toHaveLength(2);
    expect(terminals.every(m => m.equipment_type === 'terminal')).toBe(true);
  });

  it('should return empty array for unknown type', () => {
    const result = filterByType(manufacturers, 'unknown');
    expect(result).toHaveLength(0);
  });
});

describe('Manufacturer Sorting', () => {
  const manufacturers = [
    { id: '1', name: 'Siemens', equipment_type: 'automate' },
    { id: '2', name: 'Daikin', equipment_type: 'terminal' },
    { id: '3', name: 'Mitsubishi', equipment_type: 'terminal' },
  ];

  it('should sort by name ascending', () => {
    const sorted = [...manufacturers].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe('Daikin');
    expect(sorted[1].name).toBe('Mitsubishi');
    expect(sorted[2].name).toBe('Siemens');
  });
});
