import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface ProductReference {
  id: string;
  reference: string;
  manufacturer_id: string;
  equipment_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductReferenceWithManufacturer extends ProductReference {
  manufacturer_name?: string;
}

describe('Product Reference Utilities', () => {
  describe('Reference Trimming', () => {
    const trimReference = (ref: string) => ref.trim();

    it('should trim whitespace from reference', () => {
      expect(trimReference('  ABC-123  ')).toBe('ABC-123');
      expect(trimReference('DEF-456')).toBe('DEF-456');
    });

    it('should handle empty strings', () => {
      expect(trimReference('')).toBe('');
      expect(trimReference('   ')).toBe('');
    });
  });

  describe('Description Processing', () => {
    const processDescription = (desc?: string): string | null => {
      if (!desc) return null;
      const trimmed = desc.trim();
      return trimmed === '' ? null : trimmed;
    };

    it('should return null for undefined description', () => {
      expect(processDescription(undefined)).toBeNull();
    });

    it('should return null for empty description', () => {
      expect(processDescription('')).toBeNull();
      expect(processDescription('   ')).toBeNull();
    });

    it('should trim and return valid description', () => {
      expect(processDescription('  Test description  ')).toBe('Test description');
    });
  });
});

describe('Product Reference Validation', () => {
  const validateReference = (ref: {
    reference: string;
    manufacturer_id: string;
    equipment_type: string;
  }) => {
    const errors: string[] = [];
    if (!ref.reference || ref.reference.trim() === '') {
      errors.push('Reference is required');
    }
    if (!ref.manufacturer_id) {
      errors.push('Manufacturer is required');
    }
    if (!ref.equipment_type) {
      errors.push('Equipment type is required');
    }
    return errors;
  };

  it('should return no errors for valid reference', () => {
    const ref = {
      reference: 'ABC-123',
      manufacturer_id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      equipment_type: 'terminal',
    };
    expect(validateReference(ref)).toHaveLength(0);
  });

  it('should return error for empty reference', () => {
    const ref = {
      reference: '',
      manufacturer_id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      equipment_type: 'terminal',
    };
    expect(validateReference(ref)).toContain('Reference is required');
  });

  it('should return error for missing manufacturer', () => {
    const ref = {
      reference: 'ABC-123',
      manufacturer_id: '',
      equipment_type: 'terminal',
    };
    expect(validateReference(ref)).toContain('Manufacturer is required');
  });

  it('should return multiple errors when multiple fields invalid', () => {
    const ref = {
      reference: '',
      manufacturer_id: '',
      equipment_type: '',
    };
    expect(validateReference(ref)).toHaveLength(3);
  });
});

describe('Product Reference Filtering', () => {
  const references: ProductReferenceWithManufacturer[] = [
    {
      id: '1',
      reference: 'DAIKIN-001',
      manufacturer_id: 'mfr-1',
      manufacturer_name: 'Daikin',
      equipment_type: 'terminal',
      description: 'PAC inverter',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '2',
      reference: 'DAIKIN-002',
      manufacturer_id: 'mfr-1',
      manufacturer_name: 'Daikin',
      equipment_type: 'terminal',
      description: 'PAC réversible',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '3',
      reference: 'SIEMENS-001',
      manufacturer_id: 'mfr-2',
      manufacturer_name: 'Siemens',
      equipment_type: 'automate',
      description: 'PLC S7',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  const filterReferences = (
    refs: ProductReferenceWithManufacturer[],
    manufacturerId?: string,
    equipmentType?: string
  ) => {
    return refs.filter(r => {
      if (manufacturerId && r.manufacturer_id !== manufacturerId) return false;
      if (equipmentType && r.equipment_type !== equipmentType) return false;
      return true;
    });
  };

  it('should return all references when no filter', () => {
    const result = filterReferences(references);
    expect(result).toHaveLength(3);
  });

  it('should filter by manufacturer_id', () => {
    const result = filterReferences(references, 'mfr-1');
    expect(result).toHaveLength(2);
    expect(result.every(r => r.manufacturer_id === 'mfr-1')).toBe(true);
  });

  it('should filter by equipment_type', () => {
    const result = filterReferences(references, undefined, 'automate');
    expect(result).toHaveLength(1);
    expect(result[0].equipment_type).toBe('automate');
  });

  it('should filter by both manufacturer and type', () => {
    const result = filterReferences(references, 'mfr-1', 'terminal');
    expect(result).toHaveLength(2);
  });

  it('should return empty for non-matching filters', () => {
    const result = filterReferences(references, 'mfr-1', 'automate');
    expect(result).toHaveLength(0);
  });
});

describe('Product Reference Sorting', () => {
  const references = [
    { id: '1', reference: 'ZZZ-999' },
    { id: '2', reference: 'AAA-001' },
    { id: '3', reference: 'MMM-500' },
  ];

  it('should sort by reference ascending', () => {
    const sorted = [...references].sort((a, b) => a.reference.localeCompare(b.reference));
    expect(sorted[0].reference).toBe('AAA-001');
    expect(sorted[1].reference).toBe('MMM-500');
    expect(sorted[2].reference).toBe('ZZZ-999');
  });
});

describe('Product Reference Data Mapping', () => {
  const mapDbResponse = (item: any): ProductReferenceWithManufacturer => ({
    id: item.id,
    reference: item.reference,
    manufacturer_id: item.manufacturer_id,
    equipment_type: item.equipment_type,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at,
    manufacturer_name: item.manufacturers?.name,
  });

  it('should map DB response with manufacturer join', () => {
    const dbItem = {
      id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      reference: 'TEST-001',
      manufacturer_id: 'mfr-1',
      equipment_type: 'terminal',
      description: 'Test description',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      manufacturers: { name: 'Daikin' },
    };

    const result = mapDbResponse(dbItem);

    expect(result.id).toBe('18a712cb-e421-45df-b674-2d7e16e95c87');
    expect(result.reference).toBe('TEST-001');
    expect(result.manufacturer_name).toBe('Daikin');
  });

  it('should handle missing manufacturer in join', () => {
    const dbItem = {
      id: '18a712cb-e421-45df-b674-2d7e16e95c87',
      reference: 'TEST-001',
      manufacturer_id: 'mfr-1',
      equipment_type: 'terminal',
      description: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      manufacturers: null,
    };

    const result = mapDbResponse(dbItem);

    expect(result.manufacturer_name).toBeUndefined();
  });
});
