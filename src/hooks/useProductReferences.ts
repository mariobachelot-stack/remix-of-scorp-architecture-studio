import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentType } from '@/types/equipment';

export interface ProductReference {
  id: string;
  reference: string;
  manufacturer_id: string;
  equipment_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductReferenceWithManufacturer extends ProductReference {
  manufacturer_name?: string;
}

export function useProductReferences(manufacturerId?: string, equipmentType?: EquipmentType) {
  const queryClient = useQueryClient();

  const { data: references = [], isLoading, error } = useQuery({
    queryKey: ['product-references', manufacturerId, equipmentType],
    queryFn: async () => {
      let query = supabase
        .from('equipment_product_references')
        .select('*, manufacturers(name)')
        .order('reference');
      
      if (manufacturerId) {
        query = query.eq('manufacturer_id', manufacturerId);
      }
      
      if (equipmentType) {
        query = query.eq('equipment_type', equipmentType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        manufacturer_name: item.manufacturers?.name,
      })) as ProductReferenceWithManufacturer[];
    },
  });

  const createReference = useMutation({
    mutationFn: async ({ 
      reference, 
      manufacturerId, 
      equipmentType, 
      description 
    }: { 
      reference: string; 
      manufacturerId: string; 
      equipmentType: EquipmentType;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('equipment_product_references')
        .insert({ 
          reference: reference.trim(), 
          manufacturer_id: manufacturerId,
          equipment_type: equipmentType,
          description: description?.trim() || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ProductReference;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-references'] });
    },
  });

  const updateReference = useMutation({
    mutationFn: async ({ 
      id, 
      reference, 
      description 
    }: { 
      id: string; 
      reference: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('equipment_product_references')
        .update({ 
          reference: reference.trim(),
          description: description?.trim() || null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ProductReference;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-references'] });
    },
  });

  const deleteReference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_product_references')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-references'] });
    },
  });

  return {
    references,
    isLoading,
    error,
    createReference,
    updateReference,
    deleteReference,
  };
}
