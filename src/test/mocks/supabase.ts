import { vi } from 'vitest';

// Types for mock data
export interface MockDbEquipment {
  id: string;
  label: string;
  name: string;
  type: string;
  category: string;
  protocol: string;
  icon: string;
  description: string | null;
  reference: string | null;
  manufacturer_id: string | null;
  is_default: boolean;
  border_color: string | null;
  header_background_color: string | null;
  created_at: string;
  updated_at: string;
}

// Mock data store
let mockEquipmentData: MockDbEquipment[] = [];
let mockError: Error | null = null;

// Helper to generate UUID
export const generateMockUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// Mock control functions
export const mockSupabaseReset = () => {
  mockEquipmentData = [];
  mockError = null;
};

export const mockSupabaseSetData = (data: MockDbEquipment[]) => {
  mockEquipmentData = [...data];
};

export const mockSupabaseSetError = (error: Error | null) => {
  mockError = error;
};

export const mockSupabaseGetData = () => [...mockEquipmentData];

// Create chainable mock
const createChainableMock = () => {
  const chainable: any = {};

  // SELECT chain
  chainable.select = vi.fn(() => {
    const selectChain: any = {};
    
    selectChain.order = vi.fn(() => {
      const orderChain: any = {};
      orderChain.order = vi.fn(() => {
        if (mockError) {
          return Promise.resolve({ data: null, error: mockError });
        }
        return Promise.resolve({ data: [...mockEquipmentData], error: null });
      });
      return orderChain;
    });

    selectChain.single = vi.fn(() => {
      if (mockError) {
        return Promise.resolve({ data: null, error: mockError });
      }
      return Promise.resolve({ data: mockEquipmentData[0] || null, error: null });
    });

    selectChain.eq = vi.fn((column: string, value: string) => {
      const eqChain: any = {};
      eqChain.single = vi.fn(() => {
        if (mockError) {
          return Promise.resolve({ data: null, error: mockError });
        }
        const found = mockEquipmentData.find((item: any) => item[column] === value);
        return Promise.resolve({ data: found || null, error: null });
      });
      return eqChain;
    });

    return selectChain;
  });

  // INSERT chain
  chainable.insert = vi.fn((data: Partial<MockDbEquipment> | Partial<MockDbEquipment>[]) => {
    const insertChain: any = {};
    
    insertChain.select = vi.fn(() => {
      const selectChain: any = {};
      
      selectChain.single = vi.fn(() => {
        if (mockError) {
          return Promise.resolve({ data: null, error: mockError });
        }
        
        const items = Array.isArray(data) ? data : [data];
        const newItems: MockDbEquipment[] = items.map((item) => ({
          id: generateMockUuid(),
          label: item.label || '',
          name: item.name || '',
          type: item.type || 'terminal',
          category: item.category || 'hvac',
          protocol: item.protocol || 'modbus-tcp',
          icon: item.icon || 'Box',
          description: item.description || null,
          reference: item.reference || null,
          manufacturer_id: item.manufacturer_id || null,
          is_default: item.is_default || false,
          border_color: item.border_color || null,
          header_background_color: item.header_background_color || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        mockEquipmentData.push(...newItems);
        return Promise.resolve({ data: newItems[0], error: null });
      });

      return selectChain;
    });

    // For batch insert without select
    if (mockError) {
      return Promise.resolve({ data: null, error: mockError });
    }
    
    const items = Array.isArray(data) ? data : [data];
    const newItems: MockDbEquipment[] = items.map((item) => ({
      id: generateMockUuid(),
      label: item.label || '',
      name: item.name || '',
      type: item.type || 'terminal',
      category: item.category || 'hvac',
      protocol: item.protocol || 'modbus-tcp',
      icon: item.icon || 'Box',
      description: item.description || null,
      reference: item.reference || null,
      manufacturer_id: item.manufacturer_id || null,
      is_default: item.is_default || false,
      border_color: item.border_color || null,
      header_background_color: item.header_background_color || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    mockEquipmentData.push(...newItems);
    
    return Object.assign(Promise.resolve({ data: newItems, error: null }), insertChain);
  });

  // UPDATE chain
  chainable.update = vi.fn((updates: Partial<MockDbEquipment>) => {
    const updateChain: any = {};
    
    updateChain.eq = vi.fn((column: string, value: string) => {
      const eqChain: any = {};
      
      eqChain.select = vi.fn(() => {
        const selectChain: any = {};
        
        selectChain.single = vi.fn(() => {
          if (mockError) {
            return Promise.resolve({ data: null, error: mockError });
          }
          
          const index = mockEquipmentData.findIndex((item: any) => item[column] === value);
          if (index === -1) {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Row not found', code: 'PGRST116' } 
            });
          }
          
          mockEquipmentData[index] = {
            ...mockEquipmentData[index],
            ...updates,
            updated_at: new Date().toISOString(),
          };
          
          return Promise.resolve({ data: mockEquipmentData[index], error: null });
        });

        return selectChain;
      });

      return eqChain;
    });

    return updateChain;
  });

  // DELETE chain
  chainable.delete = vi.fn(() => {
    const deleteChain: any = {};
    
    deleteChain.eq = vi.fn((column: string, value: string) => {
      if (mockError) {
        return Promise.resolve({ error: mockError });
      }
      
      const index = mockEquipmentData.findIndex((item: any) => item[column] === value);
      if (index !== -1) {
        mockEquipmentData.splice(index, 1);
      }
      
      return Promise.resolve({ error: null });
    });

    return deleteChain;
  });

  return chainable;
};

// Main mock
export const createMockSupabase = () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'equipment_library') {
        return createChainableMock();
      }
      // Default mock for other tables
      return createChainableMock();
    }),
  },
});

// Export the mock for use in tests
export const mockSupabase = createMockSupabase();
