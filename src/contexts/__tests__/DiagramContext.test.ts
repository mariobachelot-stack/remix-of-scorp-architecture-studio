import { describe, it, expect } from 'vitest';
import { DiagramSettings, DEFAULT_DIAGRAM_SETTINGS } from '@/types/equipment';

describe('DiagramSettings', () => {
  describe('DEFAULT_DIAGRAM_SETTINGS', () => {
    it('should have correct default connectionStrokeWidth', () => {
      expect(DEFAULT_DIAGRAM_SETTINGS.connectionStrokeWidth).toBe(1.5);
    });

    it('should have correct default equipmentCardWidth', () => {
      expect(DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth).toBe(160);
    });
  });

  describe('Settings Merge', () => {
    const mergeSettings = (
      current: DiagramSettings | undefined,
      updates: Partial<DiagramSettings>
    ): DiagramSettings => {
      const currentSettings = current || DEFAULT_DIAGRAM_SETTINGS;
      return { ...currentSettings, ...updates };
    };

    it('should merge settings with defaults when current is undefined', () => {
      const result = mergeSettings(undefined, { connectionStrokeWidth: 2 });
      expect(result.connectionStrokeWidth).toBe(2);
      expect(result.equipmentCardWidth).toBe(DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth);
    });

    it('should merge settings with existing settings', () => {
      const current: DiagramSettings = {
        connectionStrokeWidth: 1.5,
        equipmentCardWidth: 180,
        equipmentCardHeight: 90,
      };
      const result = mergeSettings(current, { connectionStrokeWidth: 2.5 });
      expect(result.connectionStrokeWidth).toBe(2.5);
      expect(result.equipmentCardWidth).toBe(180);
    });

    it('should not modify original settings object', () => {
      const current: DiagramSettings = {
        connectionStrokeWidth: 1.5,
        equipmentCardWidth: 180,
        equipmentCardHeight: 90,
      };
      mergeSettings(current, { connectionStrokeWidth: 2.5 });
      expect(current.connectionStrokeWidth).toBe(1.5);
    });
  });

  describe('Settings Validation', () => {
    const validateSettings = (settings: Partial<DiagramSettings>) => {
      const errors: string[] = [];
      
      if (settings.connectionStrokeWidth !== undefined) {
        if (settings.connectionStrokeWidth < 0.5 || settings.connectionStrokeWidth > 3) {
          errors.push('connectionStrokeWidth must be between 0.5 and 3');
        }
      }
      
      if (settings.equipmentCardWidth !== undefined) {
        if (settings.equipmentCardWidth < 120 || settings.equipmentCardWidth > 240) {
          errors.push('equipmentCardWidth must be between 120 and 240');
        }
      }
      
      return errors;
    };

    it('should return no errors for valid settings', () => {
      const settings: Partial<DiagramSettings> = {
        connectionStrokeWidth: 2,
        equipmentCardWidth: 160,
      };
      expect(validateSettings(settings)).toHaveLength(0);
    });

    it('should return error for connectionStrokeWidth below minimum', () => {
      const settings: Partial<DiagramSettings> = {
        connectionStrokeWidth: 0,
      };
      expect(validateSettings(settings)).toContain('connectionStrokeWidth must be between 0.5 and 3');
    });

    it('should return error for connectionStrokeWidth above maximum', () => {
      const settings: Partial<DiagramSettings> = {
        connectionStrokeWidth: 5,
      };
      expect(validateSettings(settings)).toContain('connectionStrokeWidth must be between 0.5 and 3');
    });

    it('should return error for equipmentCardWidth below minimum', () => {
      const settings: Partial<DiagramSettings> = {
        equipmentCardWidth: 100,
      };
      expect(validateSettings(settings)).toContain('equipmentCardWidth must be between 120 and 240');
    });

    it('should return error for equipmentCardWidth above maximum', () => {
      const settings: Partial<DiagramSettings> = {
        equipmentCardWidth: 300,
      };
      expect(validateSettings(settings)).toContain('equipmentCardWidth must be between 120 and 240');
    });

    it('should validate boundary values correctly', () => {
      expect(validateSettings({ connectionStrokeWidth: 0.5 })).toHaveLength(0);
      expect(validateSettings({ connectionStrokeWidth: 3 })).toHaveLength(0);
      expect(validateSettings({ equipmentCardWidth: 120 })).toHaveLength(0);
      expect(validateSettings({ equipmentCardWidth: 240 })).toHaveLength(0);
    });
  });
});

describe('Connection Path Calculations', () => {
  const getConnectionPath = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    pathType: 'curved' | 'straight' | 'orthogonal' = 'curved'
  ) => {
    switch (pathType) {
      case 'straight':
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      case 'orthogonal': {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
      }
      case 'curved':
      default: {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      }
    }
  };

  it('should generate straight path', () => {
    const path = getConnectionPath(0, 0, 100, 100, 'straight');
    expect(path).toBe('M 0 0 L 100 100');
  });

  it('should generate orthogonal path', () => {
    const path = getConnectionPath(0, 0, 100, 100, 'orthogonal');
    expect(path).toContain('H 50');
    expect(path).toContain('V 100');
  });

  it('should generate curved path', () => {
    const path = getConnectionPath(0, 0, 100, 100, 'curved');
    expect(path).toContain('C 50 0');
    expect(path).toContain('50 100');
  });
});

describe('Zone Operations', () => {
  interface Zone {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  }

  const zones: Zone[] = [
    { id: '1', name: 'Zone 1', x: 0, y: 0, width: 300, height: 200, color: '#3b82f6' },
    { id: '2', name: 'Zone 2', x: 350, y: 0, width: 300, height: 200, color: '#22c55e' },
  ];

  const isPointInZone = (x: number, y: number, zone: Zone) => {
    return (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    );
  };

  it('should detect point inside zone', () => {
    expect(isPointInZone(150, 100, zones[0])).toBe(true);
  });

  it('should detect point outside zone', () => {
    expect(isPointInZone(400, 100, zones[0])).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isPointInZone(0, 0, zones[0])).toBe(true); // top-left corner
    expect(isPointInZone(300, 200, zones[0])).toBe(true); // bottom-right corner
  });
});
