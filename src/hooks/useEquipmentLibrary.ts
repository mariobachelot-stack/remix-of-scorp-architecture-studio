import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Equipment, EquipmentType, EquipmentCategory, Protocol } from '@/types/equipment';
import { toast } from 'sonner';

export interface EquipmentLibraryItem extends Equipment {
  isDefault?: boolean;
  borderColor?: string;
  headerBackgroundColor?: string;
  quantity?: number;
  organization_id?: string | null;
}

interface DbEquipment {
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
  quantity: number | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToEquipment = (db: DbEquipment): EquipmentLibraryItem & { manufacturer_id?: string } => ({
  id: db.id,
  label: db.label,
  name: db.name,
  type: db.type as EquipmentType,
  category: db.category as EquipmentCategory,
  protocol: db.protocol as Protocol,
  icon: db.icon,
  description: db.description || undefined,
  reference: db.reference || undefined,
  manufacturer_id: db.manufacturer_id || undefined,
  isDefault: db.is_default,
  borderColor: db.border_color || undefined,
  headerBackgroundColor: db.header_background_color || undefined,
  quantity: db.quantity || undefined,
  organization_id: db.organization_id,
});

const mapEquipmentToDb = (equipment: Partial<EquipmentLibraryItem> & { manufacturer_id?: string | null; organization_id?: string | null }) => ({
  label: equipment.label,
  name: equipment.name,
  type: equipment.type,
  category: equipment.category,
  protocol: equipment.protocol,
  icon: equipment.icon || 'Box',
  description: equipment.description || null,
  reference: equipment.reference || null,
  manufacturer_id: equipment.manufacturer_id || null,
  is_default: equipment.isDefault || false,
  border_color: equipment.borderColor || null,
  header_background_color: equipment.headerBackgroundColor || null,
  quantity: equipment.quantity || null,
  organization_id: equipment.organization_id !== undefined ? equipment.organization_id : null,
});

export function useEquipmentLibrary() {
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading, error } = useQuery({
    queryKey: ['equipment-library'],
    queryFn: async (): Promise<EquipmentLibraryItem[]> => {
      const { data, error } = await supabase
        .from('equipment_library')
        .select('*')
        .order('category', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return (data as DbEquipment[]).map(mapDbToEquipment);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEquipment: Omit<EquipmentLibraryItem, 'id'>) => {
      const { data, error } = await supabase
        .from('equipment_library')
        .insert(mapEquipmentToDb(newEquipment))
        .select()
        .single();

      if (error) throw error;
      return mapDbToEquipment(data as DbEquipment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-library'] });
      toast.success('Équipement créé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentLibraryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('equipment_library')
        .update(mapEquipmentToDb(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapDbToEquipment(data as DbEquipment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-library'] });
      toast.success('Équipement mis à jour');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipment_library').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-library'] });
      toast.success('Équipement supprimé');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  return {
    equipment,
    isLoading,
    error,
    createEquipment: createMutation.mutate,
    updateEquipment: updateMutation.mutate,
    deleteEquipment: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
