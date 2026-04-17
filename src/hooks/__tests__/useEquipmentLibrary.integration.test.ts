import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, ReactNode } from 'react';
import {
  mockSupabaseReset,
  mockSupabaseSetData,
  mockSupabaseSetError,
  mockSupabaseGetData,
  generateMockUuid,
  MockDbEquipment,
} from '@/test/mocks/supabase';

// Custom waitFor implementation
const waitFor = async (
  callback: () => void,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 3000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCondition = async () => {
      try {
        await callback();
        resolve();
        return;
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
          return;
        }
        setTimeout(checkCondition, interval);
      }
    };
    checkCondition();
  });
};

// Mock modules before imports
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabase } = await import('@/test/mocks/supabase');
  return mockSupabase;
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { useEquipmentLibrary } from '../useEquipmentLibrary';
import { toast } from 'sonner';

// Test wrapper with QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// Sample equipment data
const sampleDbEquipment: MockDbEquipment = {
  id: generateMockUuid(),
  label: 'PAC',
  name: 'Pompe à chaleur',
  type: 'terminal',
  category: 'hvac',
  protocol: 'modbus-tcp',
  icon: 'Snowflake',
  description: 'Test PAC',
  reference: 'REF-001',
  manufacturer_id: null,
  is_default: false,
  border_color: '#ff0000',
  header_background_color: '#00ff00',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('useEquipmentLibrary Integration Tests', () => {
  beforeEach(() => {
    mockSupabaseReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSupabaseReset();
  });

  describe('Query - Fetching Equipment', () => {
    it('should return default equipment when database is empty', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have default equipment (from defaultEquipmentLibrary)
      expect(result.current.equipment.length).toBeGreaterThan(0);
      expect(result.current.equipment.every((e) => e.isDefault)).toBe(true);
    });

    it('should merge DB equipment with defaults', async () => {
      // Set up mock data
      mockSupabaseSetData([sampleDbEquipment]);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have both defaults and DB items
      expect(result.current.equipment.length).toBeGreaterThan(1);
      
      // DB item should be present
      const dbItem = result.current.equipment.find((e) => e.label === 'PAC');
      expect(dbItem).toBeDefined();
    });

    it('should handle fetch errors gracefully', async () => {
      mockSupabaseSetError(new Error('Network error'));

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Mutation - Create Equipment', () => {
    it('should create new equipment successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newEquipment = {
        label: 'TEST',
        name: 'Test Equipment',
        type: 'terminal' as const,
        category: 'hvac' as const,
        protocol: 'modbus-tcp' as const,
        icon: 'Box',
      };

      act(() => {
        result.current.createEquipment(newEquipment);
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Verify data was added to mock store
      const storedData = mockSupabaseGetData();
      expect(storedData.some((e) => e.label === 'TEST')).toBe(true);
      
      // Verify success toast was called
      expect(toast.success).toHaveBeenCalledWith('Équipement créé avec succès');
    });

    it('should handle creation errors', async () => {
      mockSupabaseSetError(new Error('Insert failed'));

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the error for the query, set it for mutation
      mockSupabaseReset();
      mockSupabaseSetError(new Error('Insert failed'));

      const newEquipment = {
        label: 'FAIL',
        name: 'Fail Equipment',
        type: 'terminal' as const,
        category: 'hvac' as const,
        protocol: 'modbus-tcp' as const,
        icon: 'Box',
      };

      act(() => {
        result.current.createEquipment(newEquipment);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should create equipment with custom colors', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newEquipment = {
        label: 'COLORED',
        name: 'Colored Equipment',
        type: 'terminal' as const,
        category: 'hvac' as const,
        protocol: 'modbus-tcp' as const,
        icon: 'Box',
        borderColor: '#123456',
        headerBackgroundColor: '#654321',
      };

      act(() => {
        result.current.createEquipment(newEquipment);
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      const storedData = mockSupabaseGetData();
      const created = storedData.find((e) => e.label === 'COLORED');
      expect(created?.border_color).toBe('#123456');
      expect(created?.header_background_color).toBe('#654321');
    });
  });

  describe('Mutation - Update Equipment', () => {
    it('should update existing equipment with UUID', async () => {
      const existingId = generateMockUuid();
      mockSupabaseSetData([{ ...sampleDbEquipment, id: existingId }]);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateEquipment({
          id: existingId,
          label: 'PAC',
          name: 'PAC Updated',
          type: 'terminal',
          category: 'hvac',
          protocol: 'modbus-tcp',
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      const storedData = mockSupabaseGetData();
      const updated = storedData.find((e) => e.id === existingId);
      expect(updated?.name).toBe('PAC Updated');
      expect(toast.success).toHaveBeenCalledWith('Équipement mis à jour');
    });

    it('should INSERT instead of UPDATE for non-UUID ids (default equipment)', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate updating a default equipment with non-UUID id
      act(() => {
        result.current.updateEquipment({
          id: 'pac', // Non-UUID id
          label: 'PAC',
          name: 'PAC Modified from Default',
          type: 'terminal',
          category: 'hvac',
          protocol: 'modbus-tcp',
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      // Should have inserted a new record with UUID
      const storedData = mockSupabaseGetData();
      expect(storedData.length).toBeGreaterThan(0);
      expect(storedData[0].name).toBe('PAC Modified from Default');
      // New ID should be a valid UUID
      expect(storedData[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should update colors on existing equipment', async () => {
      const existingId = generateMockUuid();
      mockSupabaseSetData([{ ...sampleDbEquipment, id: existingId }]);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateEquipment({
          id: existingId,
          borderColor: '#abcdef',
          headerBackgroundColor: '#fedcba',
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      const storedData = mockSupabaseGetData();
      const updated = storedData.find((e) => e.id === existingId);
      expect(updated?.border_color).toBe('#abcdef');
      expect(updated?.header_background_color).toBe('#fedcba');
    });
  });

  describe('Mutation - Delete Equipment', () => {
    it('should delete equipment with valid UUID', async () => {
      const existingId = generateMockUuid();
      mockSupabaseSetData([{ ...sampleDbEquipment, id: existingId }]);

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = mockSupabaseGetData().length;

      act(() => {
        result.current.deleteEquipment(existingId);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      const storedData = mockSupabaseGetData();
      expect(storedData.length).toBe(initialCount - 1);
      expect(storedData.find((e) => e.id === existingId)).toBeUndefined();
      expect(toast.success).toHaveBeenCalledWith('Équipement supprimé');
    });

    it('should reject deletion of non-UUID ids', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.deleteEquipment('pac'); // Non-UUID
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

});

describe('Edge Cases', () => {
  beforeEach(() => {
    mockSupabaseReset();
    vi.clearAllMocks();
  });

  it('should handle empty label gracefully', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const equipmentWithEmptyLabel = {
      label: '',
      name: 'No Label Equipment',
      type: 'terminal' as const,
      category: 'hvac' as const,
      protocol: 'modbus-tcp' as const,
      icon: 'Box',
    };

    act(() => {
      result.current.createEquipment(equipmentWithEmptyLabel);
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });

    const storedData = mockSupabaseGetData();
    expect(storedData.some((e) => e.name === 'No Label Equipment')).toBe(true);
  });

  it('should handle special characters in equipment data', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const equipmentWithSpecialChars = {
      label: 'CTA',
      name: "Centrale de traitement d'air",
      type: 'terminal' as const,
      category: 'hvac' as const,
      protocol: 'modbus-tcp' as const,
      icon: 'AirVent',
      description: 'Description avec des accents: éèàù et symboles: @#$%',
    };

    act(() => {
      result.current.createEquipment(equipmentWithSpecialChars);
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });

    const storedData = mockSupabaseGetData();
    const created = storedData.find((e) => e.label === 'CTA');
    expect(created?.name).toBe("Centrale de traitement d'air");
    expect(created?.description).toContain('éèàù');
  });

  it('should handle concurrent mutations', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useEquipmentLibrary(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Start multiple creates concurrently
    act(() => {
      result.current.createEquipment({
        label: 'EQ1',
        name: 'Equipment 1',
        type: 'terminal',
        category: 'hvac',
        protocol: 'modbus-tcp',
        icon: 'Box',
      });
      result.current.createEquipment({
        label: 'EQ2',
        name: 'Equipment 2',
        type: 'automate',
        category: 'hvac',
        protocol: 'bacnet-ip',
        icon: 'Cpu',
      });
    });

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });

    const storedData = mockSupabaseGetData();
    expect(storedData.some((e) => e.label === 'EQ1')).toBe(true);
    expect(storedData.some((e) => e.label === 'EQ2')).toBe(true);
  });
});
