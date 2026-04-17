import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentType } from '@/types/equipment';

export interface Manufacturer {
  id: string;
  name: string;
  equipment_type: string;
  created_at: string;
  updated_at: string;
}

export function useManufacturers(equipmentType?: EquipmentType) {
  const queryClient = useQueryClient();

  const { data: manufacturers = [], isLoading, error } = useQuery({
    queryKey: ['manufacturers', equipmentType],
    queryFn: async () => {
      let query = supabase
        .from('manufacturers')
        .select('*')
        .order('name');
      
      if (equipmentType) {
        query = query.eq('equipment_type', equipmentType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Manufacturer[];
    },
  });

  const createManufacturer = useMutation({
    mutationFn: async ({ name, equipmentType }: { name: string; equipmentType: EquipmentType }) => {
      const { data, error } = await supabase
        .from('manufacturers')
        .insert({ name: name.trim(), equipment_type: equipmentType })
        .select()
        .single();
      
      if (error) throw error;
      return data as Manufacturer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });

  const updateManufacturer = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('manufacturers')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Manufacturer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });

  const deleteManufacturer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('manufacturers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });

  return {
    manufacturers,
    isLoading,
    error,
    createManufacturer,
    updateManufacturer,
    deleteManufacturer,
  };
}
