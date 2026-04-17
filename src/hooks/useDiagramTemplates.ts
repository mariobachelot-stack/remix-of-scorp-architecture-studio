import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CanvasEquipment, Connection, Zone, DiagramSettings } from '@/types/equipment';
import { toast } from 'sonner';

export interface DiagramTemplate {
  id: string;
  name: string;
  description?: string;
  equipment: CanvasEquipment[];
  connections: Connection[];
  zones: Zone[];
  settings?: DiagramSettings;
  thumbnail?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  equipment: unknown;
  connections: unknown;
  zones: unknown;
  settings: unknown;
  thumbnail: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToTemplate = (db: DbTemplate): DiagramTemplate => ({
  id: db.id,
  name: db.name,
  description: db.description || undefined,
  equipment: (db.equipment as CanvasEquipment[]) || [],
  connections: (db.connections as Connection[]) || [],
  zones: (db.zones as Zone[]) || [],
  settings: db.settings as DiagramSettings | undefined,
  thumbnail: db.thumbnail || undefined,
  createdBy: db.created_by || undefined,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export function useDiagramTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['diagram-templates'],
    queryFn: async (): Promise<DiagramTemplate[]> => {
      // Use type assertion since table may not be in generated types yet
      const { data, error } = await supabase
        .from('diagram_templates' as 'diagrams')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown as DbTemplate[]).map(mapDbToTemplate);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      equipment: CanvasEquipment[];
      connections: Connection[];
      zones: Zone[];
      settings?: DiagramSettings;
      userId?: string;
    }): Promise<DiagramTemplate> => {
      const insertData = {
        name: template.name,
        description: template.description || null,
        equipment: template.equipment,
        connections: template.connections,
        zones: template.zones,
        settings: template.settings || null,
        created_by: template.userId || null,
      };

      const { data, error } = await supabase
        .from('diagram_templates' as 'diagrams')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return mapDbToTemplate(data as unknown as DbTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-templates'] });
      toast.success('Template créé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création du template: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: {
      id: string;
      name: string;
      description?: string;
      equipment: CanvasEquipment[];
      connections: Connection[];
      zones: Zone[];
      settings?: DiagramSettings;
    }): Promise<DiagramTemplate> => {
      const updateData = {
        name: template.name,
        description: template.description || null,
        equipment: template.equipment,
        connections: template.connections,
        zones: template.zones,
        settings: template.settings || null,
      };

      const { data, error } = await supabase
        .from('diagram_templates' as 'diagrams')
        .update(updateData as never)
        .eq('id', template.id)
        .select()
        .single();

      if (error) throw error;
      return mapDbToTemplate(data as unknown as DbTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-templates'] });
      toast.success('Template mis à jour avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour du template: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diagram_templates' as 'diagrams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-templates'] });
      toast.success('Template supprimé');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
