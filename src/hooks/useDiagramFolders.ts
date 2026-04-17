import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiagramFolder {
  id: string;
  name: string;
  parentId?: string;
  color: string;
  createdBy?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DbFolder {
  id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  created_by: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToFolder = (db: DbFolder): DiagramFolder => ({
  id: db.id,
  name: db.name,
  parentId: db.parent_id || undefined,
  color: db.color || '#6b7280',
  createdBy: db.created_by || undefined,
  organizationId: db.organization_id || undefined,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export function useDiagramFolders() {
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: ['diagram-folders'],
    queryFn: async (): Promise<DiagramFolder[]> => {
      const { data, error } = await supabase
        .from('diagram_folders' as 'diagrams')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown as DbFolder[]).map(mapDbToFolder);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (folder: {
      name: string;
      parentId?: string;
      color?: string;
      userId?: string;
      organizationId?: string;
    }): Promise<DiagramFolder> => {
      const insertData = {
        name: folder.name,
        parent_id: folder.parentId || null,
        color: folder.color || '#6b7280',
        created_by: folder.userId || null,
        organization_id: folder.organizationId || null,
      };

      const { data, error } = await supabase
        .from('diagram_folders' as 'diagrams')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return mapDbToFolder(data as unknown as DbFolder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-folders'] });
      toast.success('Dossier créé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiagramFolder> & { id: string }): Promise<DiagramFolder> => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId || null;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { data, error } = await supabase
        .from('diagram_folders' as 'diagrams')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapDbToFolder(data as unknown as DbFolder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-folders'] });
      toast.success('Dossier mis à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diagram_folders' as 'diagrams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-folders'] });
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
      toast.success('Dossier supprimé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    folders,
    isLoading,
    error,
    createFolder: createMutation.mutateAsync,
    updateFolder: updateMutation.mutateAsync,
    deleteFolder: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
