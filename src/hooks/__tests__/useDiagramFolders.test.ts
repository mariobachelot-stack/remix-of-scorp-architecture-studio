import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface DiagramFolder {
  id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Validation functions
const validateFolder = (folder: { name?: string }) => {
  const errors: string[] = [];
  if (!folder.name || folder.name.trim() === '') {
    errors.push('Name is required');
  }
  return errors;
};

const trimName = (name: string) => name.trim();

describe('Diagram Folder Utilities', () => {
  describe('trimName', () => {
    it('should trim whitespace from folder name', () => {
      expect(trimName('  My Folder  ')).toBe('My Folder');
      expect(trimName('Folder Name')).toBe('Folder Name');
    });

    it('should handle empty strings', () => {
      expect(trimName('')).toBe('');
      expect(trimName('   ')).toBe('');
    });
  });

  describe('validateFolder', () => {
    it('should return no errors for valid folder', () => {
      const folder = { name: 'Valid Folder' };
      expect(validateFolder(folder)).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      expect(validateFolder({ name: '' })).toContain('Name is required');
      expect(validateFolder({ name: '   ' })).toContain('Name is required');
      expect(validateFolder({})).toContain('Name is required');
    });
  });
});

describe('Diagram Folder Data Types', () => {
  const mockFolder: DiagramFolder = {
    id: '18a712cb-e421-45df-b674-2d7e16e95c87',
    name: 'Project Folder',
    color: '#3b82f6',
    parent_id: null,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('should have correct structure', () => {
    expect(mockFolder).toHaveProperty('id');
    expect(mockFolder).toHaveProperty('name');
    expect(mockFolder).toHaveProperty('color');
    expect(mockFolder).toHaveProperty('parent_id');
    expect(mockFolder).toHaveProperty('created_by');
    expect(mockFolder).toHaveProperty('created_at');
    expect(mockFolder).toHaveProperty('updated_at');
  });

  it('should have valid UUID for id', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(mockFolder.id)).toBe(true);
  });
});

describe('Folder Hierarchy', () => {
  const folders: DiagramFolder[] = [
    { id: '1', name: 'Root Folder 1', color: '#3b82f6', parent_id: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '2', name: 'Root Folder 2', color: '#22c55e', parent_id: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '3', name: 'Child Folder 1', color: '#f97316', parent_id: '1', created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: '4', name: 'Child Folder 2', color: '#8b5cf6', parent_id: '1', created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  const getRootFolders = (items: DiagramFolder[]) =>
    items.filter(f => f.parent_id === null);

  const getChildFolders = (items: DiagramFolder[], parentId: string) =>
    items.filter(f => f.parent_id === parentId);

  it('should return only root folders', () => {
    const roots = getRootFolders(folders);
    expect(roots).toHaveLength(2);
    expect(roots.every(f => f.parent_id === null)).toBe(true);
  });

  it('should return child folders for a parent', () => {
    const children = getChildFolders(folders, '1');
    expect(children).toHaveLength(2);
    expect(children.every(f => f.parent_id === '1')).toBe(true);
  });

  it('should return empty array for folder with no children', () => {
    const children = getChildFolders(folders, '3');
    expect(children).toHaveLength(0);
  });
});

describe('Folder Sorting', () => {
  const folders = [
    { id: '1', name: 'Zebra Folder', color: null },
    { id: '2', name: 'Alpha Folder', color: null },
    { id: '3', name: 'Beta Folder', color: null },
  ];

  it('should sort folders by name ascending', () => {
    const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe('Alpha Folder');
    expect(sorted[1].name).toBe('Beta Folder');
    expect(sorted[2].name).toBe('Zebra Folder');
  });
});

describe('Folder Color Handling', () => {
  const DEFAULT_COLOR = '#3b82f6';

  const getDisplayColor = (color: string | null) => color || DEFAULT_COLOR;

  it('should return folder color when present', () => {
    expect(getDisplayColor('#ff0000')).toBe('#ff0000');
  });

  it('should return default color when null', () => {
    expect(getDisplayColor(null)).toBe(DEFAULT_COLOR);
  });
});
