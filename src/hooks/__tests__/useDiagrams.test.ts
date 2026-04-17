import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface Diagram {
  id: string;
  name: string;
  description?: string;
  equipment: any[];
  connections: any[];
  zones: any[];
  settings?: any;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  creatorName?: string;
  folderId?: string;
}

interface DbDiagram {
  id: string;
  name: string;
  description: string | null;
  equipment: any;
  connections: any;
  zones: any;
  settings?: any;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  folder_id: string | null;
}

// Mapping functions from useDiagrams
const mapDbToDiagram = (db: DbDiagram, creatorName?: string): Diagram => ({
  id: db.id,
  name: db.name,
  description: db.description || undefined,
  equipment: db.equipment || [],
  connections: db.connections || [],
  zones: db.zones || [],
  settings: db.settings || undefined,
  thumbnail: db.thumbnail || undefined,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
  createdBy: db.created_by || undefined,
  creatorName,
  folderId: db.folder_id || undefined,
});

const mapDiagramToDb = (diagram: Partial<Diagram>) => {
  const result: Record<string, unknown> = {};
  if (diagram.name !== undefined) result.name = diagram.name;
  if (diagram.description !== undefined) result.description = diagram.description || null;
  if (diagram.equipment !== undefined) result.equipment = diagram.equipment;
  if (diagram.connections !== undefined) result.connections = diagram.connections;
  if (diagram.zones !== undefined) result.zones = diagram.zones;
  if (diagram.settings !== undefined) result.settings = diagram.settings;
  if (diagram.thumbnail !== undefined) result.thumbnail = diagram.thumbnail || null;
  return result;
};

describe('Diagram Mapping', () => {
  describe('mapDbToDiagram', () => {
    it('should map DB diagram to frontend format', () => {
      const dbDiagram: DbDiagram = {
        id: '18a712cb-e421-45df-b674-2d7e16e95c87',
        name: 'Test Diagram',
        description: 'A test diagram',
        equipment: [{ id: 'eq1', label: 'PAC' }],
        connections: [{ id: 'conn1', from: 'eq1', to: 'eq2' }],
        zones: [{ id: 'zone1', name: 'Zone 1' }],
        thumbnail: 'data:image/png;base64,abc123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        created_by: 'user-123',
        folder_id: 'folder-123',
      };

      const result = mapDbToDiagram(dbDiagram, 'John Doe');

      expect(result.id).toBe('18a712cb-e421-45df-b674-2d7e16e95c87');
      expect(result.name).toBe('Test Diagram');
      expect(result.description).toBe('A test diagram');
      expect(result.equipment).toHaveLength(1);
      expect(result.connections).toHaveLength(1);
      expect(result.zones).toHaveLength(1);
      expect(result.thumbnail).toBe('data:image/png;base64,abc123');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdBy).toBe('user-123');
      expect(result.creatorName).toBe('John Doe');
    });

    it('should handle null values correctly', () => {
      const dbDiagram: DbDiagram = {
        id: '18a712cb-e421-45df-b674-2d7e16e95c87',
        name: 'Empty Diagram',
        description: null,
        equipment: null,
        connections: null,
        zones: null,
        thumbnail: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        folder_id: null,
      };

      const result = mapDbToDiagram(dbDiagram);

      expect(result.description).toBeUndefined();
      expect(result.equipment).toEqual([]);
      expect(result.connections).toEqual([]);
      expect(result.zones).toEqual([]);
      expect(result.thumbnail).toBeUndefined();
      expect(result.createdBy).toBeUndefined();
      expect(result.creatorName).toBeUndefined();
    });
  });

  describe('mapDiagramToDb', () => {
    it('should map frontend diagram to DB format', () => {
      const diagram: Partial<Diagram> = {
        name: 'New Diagram',
        description: 'A new diagram',
        equipment: [{ id: 'eq1' }],
        connections: [{ id: 'conn1' }],
        zones: [{ id: 'zone1' }],
        thumbnail: 'data:image/png;base64,xyz789',
      };

      const result = mapDiagramToDb(diagram);

      expect(result.name).toBe('New Diagram');
      expect(result.description).toBe('A new diagram');
      expect(result.equipment).toEqual([{ id: 'eq1' }]);
      expect(result.connections).toEqual([{ id: 'conn1' }]);
      expect(result.zones).toEqual([{ id: 'zone1' }]);
      expect(result.thumbnail).toBe('data:image/png;base64,xyz789');
    });

    it('should convert undefined description to null', () => {
      const diagram: Partial<Diagram> = {
        name: 'Test',
      };

      const result = mapDiagramToDb(diagram);

      expect(result.description).toBeNull();
      expect(result.thumbnail).toBeNull();
    });
  });
});

describe('Diagram Validation', () => {
  const validateDiagram = (diagram: { name?: string }) => {
    const errors: string[] = [];
    if (!diagram.name || diagram.name.trim() === '') {
      errors.push('Name is required');
    }
    return errors;
  };

  it('should return no errors for valid diagram', () => {
    const diagram = { name: 'Valid Diagram' };
    expect(validateDiagram(diagram)).toHaveLength(0);
  });

  it('should return error for empty name', () => {
    expect(validateDiagram({ name: '' })).toContain('Name is required');
    expect(validateDiagram({ name: '   ' })).toContain('Name is required');
    expect(validateDiagram({})).toContain('Name is required');
  });
});

describe('Diagram Duplication', () => {
  const duplicateDiagram = (original: Diagram): Partial<Diagram> => ({
    name: `${original.name} (copie)`,
    description: original.description,
    equipment: JSON.parse(JSON.stringify(original.equipment)),
    connections: JSON.parse(JSON.stringify(original.connections)),
    zones: JSON.parse(JSON.stringify(original.zones)),
  });

  it('should create copy with modified name', () => {
    const original: Diagram = {
      id: '1',
      name: 'Original',
      equipment: [{ id: 'eq1', x: 100, y: 200 }],
      connections: [{ id: 'conn1' }],
      zones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const copy = duplicateDiagram(original);

    expect(copy.name).toBe('Original (copie)');
    expect(copy.equipment).toEqual(original.equipment);
    expect(copy.connections).toEqual(original.connections);
  });

  it('should deep copy equipment to avoid reference sharing', () => {
    const original: Diagram = {
      id: '1',
      name: 'Original',
      equipment: [{ id: 'eq1', x: 100 }],
      connections: [],
      zones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const copy = duplicateDiagram(original);
    
    // Modify copy
    if (copy.equipment) {
      copy.equipment[0].x = 500;
    }

    // Original should be unchanged
    expect(original.equipment[0].x).toBe(100);
  });
});

describe('Diagram Sorting', () => {
  const diagrams: Diagram[] = [
    {
      id: '1',
      name: 'Old Diagram',
      equipment: [],
      connections: [],
      zones: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      name: 'Recent Diagram',
      equipment: [],
      connections: [],
      zones: [],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: '3',
      name: 'Middle Diagram',
      equipment: [],
      connections: [],
      zones: [],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
    },
  ];

  it('should sort by updatedAt descending', () => {
    const sorted = [...diagrams].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    expect(sorted[0].name).toBe('Recent Diagram');
    expect(sorted[2].name).toBe('Old Diagram');
  });

  it('should sort by createdAt descending', () => {
    const sorted = [...diagrams].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    expect(sorted[0].name).toBe('Recent Diagram');
    expect(sorted[2].name).toBe('Old Diagram');
  });
});

describe('Diagram Creator Mapping', () => {
  const createProfilesMap = (profiles: { user_id: string; display_name: string | null }[]) => {
    return profiles.reduce((acc, p) => {
      acc[p.user_id] = p.display_name || 'Utilisateur';
      return acc;
    }, {} as Record<string, string>);
  };

  it('should create map from profiles', () => {
    const profiles = [
      { user_id: 'user-1', display_name: 'John Doe' },
      { user_id: 'user-2', display_name: 'Jane Smith' },
    ];

    const map = createProfilesMap(profiles);

    expect(map['user-1']).toBe('John Doe');
    expect(map['user-2']).toBe('Jane Smith');
  });

  it('should use default name for null display_name', () => {
    const profiles = [
      { user_id: 'user-1', display_name: null },
    ];

    const map = createProfilesMap(profiles);

    expect(map['user-1']).toBe('Utilisateur');
  });
});

describe('Equipment/Connection Operations', () => {
  describe('Add Equipment', () => {
    const addEquipment = (diagram: Diagram, equipment: any) => ({
      ...diagram,
      equipment: [...diagram.equipment, equipment],
    });

    it('should add equipment to diagram', () => {
      const diagram: Diagram = {
        id: '1',
        name: 'Test',
        equipment: [{ id: 'eq1' }],
        connections: [],
        zones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = addEquipment(diagram, { id: 'eq2', label: 'New' });

      expect(result.equipment).toHaveLength(2);
      expect(result.equipment[1].id).toBe('eq2');
    });
  });

  describe('Remove Equipment', () => {
    const removeEquipment = (diagram: Diagram, equipmentId: string) => ({
      ...diagram,
      equipment: diagram.equipment.filter(e => e.id !== equipmentId),
      // Also remove connections involving this equipment
      connections: diagram.connections.filter(
        c => c.fromEquipmentId !== equipmentId && c.toEquipmentId !== equipmentId
      ),
    });

    it('should remove equipment and related connections', () => {
      const diagram: Diagram = {
        id: '1',
        name: 'Test',
        equipment: [{ id: 'eq1' }, { id: 'eq2' }],
        connections: [
          { id: 'c1', fromEquipmentId: 'eq1', toEquipmentId: 'eq2' },
          { id: 'c2', fromEquipmentId: 'eq2', toEquipmentId: 'eq3' },
        ],
        zones: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = removeEquipment(diagram, 'eq1');

      expect(result.equipment).toHaveLength(1);
      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].id).toBe('c2');
    });
  });
});
