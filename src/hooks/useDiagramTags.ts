import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiagramTag {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  organizationId?: string;
  createdAt: Date;
}

interface DbTag {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  organization_id: string | null;
  created_at: string;
}

const mapDbToTag = (db: DbTag): DiagramTag => ({
  id: db.id,
  name: db.name,
  color: db.color,
  isDefault: db.is_default,
  organizationId: db.organization_id || undefined,
  createdAt: new Date(db.created_at),
});

export function useDiagramTags() {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ['diagram-tags'],
    queryFn: async (): Promise<DiagramTag[]> => {
      const { data, error } = await supabase
        .from('diagram_tags' as 'diagrams')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return ((data || []) as unknown as DbTag[]).map(mapDbToTag);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tag: { name: string; color?: string; organizationId?: string }): Promise<DiagramTag> => {
      const insertData = {
        name: tag.name,
        color: tag.color || '#3b82f6',
        organization_id: tag.organizationId || null,
      };

      const { data, error } = await supabase
        .from('diagram_tags' as 'diagrams')
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return mapDbToTag(data as unknown as DbTag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-tags'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiagramTag> & { id: string }): Promise<DiagramTag> => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.color !== undefined) updateData.color = updates.color;

      const { data, error } = await supabase
        .from('diagram_tags' as 'diagrams')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapDbToTag(data as unknown as DbTag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-tags'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diagram_tags' as 'diagrams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram-tags'] });
      toast.success('Étiquette supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Manage diagram-tag associations
  const addTagToDiagram = useMutation({
    mutationFn: async ({ diagramId, tagId }: { diagramId: string; tagId: string }) => {
      const { error } = await supabase
        .from('diagrams_tags' as 'diagrams')
        .insert({ diagram_id: diagramId, tag_id: tagId } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
      queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram'] });
    },
  });

  const removeTagFromDiagram = useMutation({
    mutationFn: async ({ diagramId, tagId }: { diagramId: string; tagId: string }) => {
      const { error } = await supabase
        .from('diagrams_tags' as 'diagrams')
        .delete()
        .match({ diagram_id: diagramId, tag_id: tagId } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
      queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram'] });
    },
  });

  return {
    tags,
    isLoading,
    error,
    createTag: createMutation.mutateAsync,
    updateTag: updateMutation.mutateAsync,
    deleteTag: deleteMutation.mutate,
    addTagToDiagram: addTagToDiagram.mutateAsync,
    removeTagFromDiagram: removeTagFromDiagram.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

// Hook to get ALL diagram-tag associations (for filtering)
export function useAllDiagramTagAssociations() {
  return useQuery({
    queryKey: ['all-diagram-tag-associations'],
    queryFn: async (): Promise<{ diagram_id: string; tag_id: string }[]> => {
      const { data, error } = await supabase
        .from('diagrams_tags')
        .select('diagram_id, tag_id');

      if (error) throw error;
      return (data || []) as { diagram_id: string; tag_id: string }[];
    },
  });
}

// Hook to get tags for a specific diagram
export function useDiagramTagsForDiagram(diagramId: string | undefined) {
  return useQuery({
    queryKey: ['diagram-tags-for-diagram', diagramId],
    queryFn: async (): Promise<DiagramTag[]> => {
      if (!diagramId) return [];
      
      const { data, error } = await supabase
        .from('diagrams_tags' as 'diagrams')
        .select('tag_id')
        .match({ diagram_id: diagramId } as never);

      if (error) throw error;
      
      const tagIds = ((data || []) as unknown as { tag_id: string }[]).map(d => d.tag_id);
      if (tagIds.length === 0) return [];

      const { data: tagsData, error: tagsError } = await supabase
        .from('diagram_tags' as 'diagrams')
        .select('*')
        .in('id', tagIds as string[]);

      if (tagsError) throw tagsError;
      return ((tagsData || []) as unknown as DbTag[]).map(mapDbToTag);
    },
    enabled: !!diagramId,
  });
}
