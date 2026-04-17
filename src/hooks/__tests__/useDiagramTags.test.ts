import { describe, it, expect, vi, beforeEach } from 'vitest';

// Types
interface DiagramTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface DiagramTagAssociation {
  diagram_id: string;
  tag_id: string;
}

// Validation functions
const validateTag = (tag: { name?: string }) => {
  const errors: string[] = [];
  if (!tag.name || tag.name.trim() === '') {
    errors.push('Name is required');
  }
  return errors;
};

const trimName = (name: string) => name.trim();

describe('Diagram Tag Utilities', () => {
  describe('trimName', () => {
    it('should trim whitespace from tag name', () => {
      expect(trimName('  Important  ')).toBe('Important');
      expect(trimName('Tag Name')).toBe('Tag Name');
    });

    it('should handle empty strings', () => {
      expect(trimName('')).toBe('');
      expect(trimName('   ')).toBe('');
    });
  });

  describe('validateTag', () => {
    it('should return no errors for valid tag', () => {
      const tag = { name: 'Valid Tag' };
      expect(validateTag(tag)).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      expect(validateTag({ name: '' })).toContain('Name is required');
      expect(validateTag({ name: '   ' })).toContain('Name is required');
      expect(validateTag({})).toContain('Name is required');
    });
  });
});

describe('Diagram Tag Data Types', () => {
  const mockTag: DiagramTag = {
    id: '18a712cb-e421-45df-b674-2d7e16e95c87',
    name: 'Important',
    color: '#ef4444',
    created_at: '2024-01-01T00:00:00Z',
  };

  it('should have correct structure', () => {
    expect(mockTag).toHaveProperty('id');
    expect(mockTag).toHaveProperty('name');
    expect(mockTag).toHaveProperty('color');
    expect(mockTag).toHaveProperty('created_at');
  });

  it('should have valid UUID for id', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(mockTag.id)).toBe(true);
  });

  it('should have valid hex color', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    expect(hexColorRegex.test(mockTag.color)).toBe(true);
  });
});

describe('Tag Association', () => {
  const associations: DiagramTagAssociation[] = [
    { diagram_id: 'diagram-1', tag_id: 'tag-1' },
    { diagram_id: 'diagram-1', tag_id: 'tag-2' },
    { diagram_id: 'diagram-2', tag_id: 'tag-1' },
    { diagram_id: 'diagram-3', tag_id: 'tag-3' },
  ];

  const tags: DiagramTag[] = [
    { id: 'tag-1', name: 'Important', color: '#ef4444', created_at: '2024-01-01' },
    { id: 'tag-2', name: 'Review', color: '#f59e0b', created_at: '2024-01-01' },
    { id: 'tag-3', name: 'Done', color: '#22c55e', created_at: '2024-01-01' },
  ];

  const getTagsForDiagram = (diagramId: string) => {
    const tagIds = associations
      .filter(a => a.diagram_id === diagramId)
      .map(a => a.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  };

  const getDiagramsForTag = (tagId: string) => {
    return associations
      .filter(a => a.tag_id === tagId)
      .map(a => a.diagram_id);
  };

  it('should return tags for a diagram', () => {
    const diagramTags = getTagsForDiagram('diagram-1');
    expect(diagramTags).toHaveLength(2);
    expect(diagramTags.map(t => t.name)).toContain('Important');
    expect(diagramTags.map(t => t.name)).toContain('Review');
  });

  it('should return empty array for diagram with no tags', () => {
    const diagramTags = getTagsForDiagram('diagram-999');
    expect(diagramTags).toHaveLength(0);
  });

  it('should return diagram IDs for a tag', () => {
    const diagramIds = getDiagramsForTag('tag-1');
    expect(diagramIds).toHaveLength(2);
    expect(diagramIds).toContain('diagram-1');
    expect(diagramIds).toContain('diagram-2');
  });
});

describe('Tag Filtering', () => {
  const tags: DiagramTag[] = [
    { id: '1', name: 'Important', color: '#ef4444', created_at: '2024-01-01' },
    { id: '2', name: 'Urgent', color: '#f59e0b', created_at: '2024-01-02' },
    { id: '3', name: 'Review', color: '#3b82f6', created_at: '2024-01-03' },
  ];

  const filterBySearch = (items: DiagramTag[], search: string) => {
    const lowerSearch = search.toLowerCase();
    return items.filter(t => t.name.toLowerCase().includes(lowerSearch));
  };

  it('should filter tags by name', () => {
    const result = filterBySearch(tags, 'imp');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Important');
  });

  it('should return all tags for empty search', () => {
    const result = filterBySearch(tags, '');
    expect(result).toHaveLength(3);
  });

  it('should be case insensitive', () => {
    const result = filterBySearch(tags, 'URGENT');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Urgent');
  });
});

describe('Tag Sorting', () => {
  const tags = [
    { id: '1', name: 'Zebra', color: '#000' },
    { id: '2', name: 'Alpha', color: '#000' },
    { id: '3', name: 'Beta', color: '#000' },
  ];

  it('should sort tags by name ascending', () => {
    const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe('Alpha');
    expect(sorted[1].name).toBe('Beta');
    expect(sorted[2].name).toBe('Zebra');
  });
});

describe('Tag Color Presets', () => {
  const TAG_COLORS = [
    '#ef4444', // red
    '#f59e0b', // amber
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  const getColorByIndex = (index: number) => TAG_COLORS[index % TAG_COLORS.length];

  it('should cycle through colors', () => {
    expect(getColorByIndex(0)).toBe('#ef4444');
    expect(getColorByIndex(5)).toBe('#ec4899');
    expect(getColorByIndex(6)).toBe('#ef4444'); // wraps around
  });

  it('should always return a valid color', () => {
    for (let i = 0; i < 20; i++) {
      expect(TAG_COLORS).toContain(getColorByIndex(i));
    }
  });
});
