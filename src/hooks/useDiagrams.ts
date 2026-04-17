import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Diagram, CanvasEquipment, Connection, Zone, DiagramSettings, CanvasImage, CanvasText } from '@/types/equipment';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface DbDiagram {
  id: string;
  name: string;
  description: string | null;
  equipment: Json;
  connections: Json;
  zones: Json;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  folder_id: string | null;
  organization_id: string | null;
  settings?: Json;
}

const mapDbToDiagram = (db: DbDiagram, creatorName?: string): Diagram & { folderId?: string } => {
  // Extract images from equipment JSON if stored there, or from a dedicated field
  const equipmentData = db.equipment as unknown as CanvasEquipment[] | { equipment?: CanvasEquipment[]; images?: CanvasImage[] };
  let equipment: CanvasEquipment[] = [];
  let images: CanvasImage[] = [];
  let texts: CanvasText[] = [];
  
  if (Array.isArray(equipmentData)) {
    equipment = equipmentData;
    // Check if images/texts are stored in settings (for backward compatibility)
    const settingsData = db.settings as unknown as DiagramSettings & { images?: CanvasImage[]; texts?: CanvasText[] } | undefined;
    images = settingsData?.images || [];
    texts = settingsData?.texts || [];
  } else if (equipmentData && typeof equipmentData === 'object') {
    equipment = equipmentData.equipment || [];
    images = equipmentData.images || [];
  }
  
  return {
    id: db.id,
    name: db.name,
    description: db.description || undefined,
    equipment,
    connections: (db.connections as unknown as Connection[]) || [],
    zones: (db.zones as unknown as Zone[]) || [],
    images,
    texts,
    settings: db.settings as unknown as DiagramSettings | undefined,
    thumbnail: db.thumbnail || undefined,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    createdBy: db.created_by || undefined,
    creatorName,
    folderId: db.folder_id || undefined,
    organizationId: db.organization_id || undefined,
  };
};

const mapDiagramToDb = (diagram: Partial<Diagram>) => {
  const result: Record<string, unknown> = {};
  if (diagram.name !== undefined) result.name = diagram.name;
  if (diagram.description !== undefined) result.description = diagram.description || null;
  if (diagram.equipment !== undefined) result.equipment = diagram.equipment as unknown as Json;
  if (diagram.connections !== undefined) result.connections = diagram.connections as unknown as Json;
  if (diagram.zones !== undefined) result.zones = diagram.zones as unknown as Json;
  // Store images and texts in settings (since diagrams table doesn't have dedicated columns)
  if (diagram.settings !== undefined || diagram.images !== undefined || diagram.texts !== undefined) {
    const settingsWithExtra = {
      ...(diagram.settings || {}),
      images: diagram.images || [],
      texts: diagram.texts || [],
    };
    result.settings = settingsWithExtra as unknown as Json;
  }
  if (diagram.thumbnail !== undefined) result.thumbnail = diagram.thumbnail || null;
  return result;
};


export function useDiagrams() {
  const queryClient = useQueryClient();

  const { data: diagrams = [], isLoading, error } = useQuery({
    queryKey: ['diagrams'],
    queryFn: async (): Promise<Diagram[]> => {
      // Fetch diagrams
      const { data: diagramsData, error: diagramsError } = await supabase
        .from('diagrams')
        .select('*')
        .order('updated_at', { ascending: false });

      if (diagramsError) throw diagramsError;

      // Get unique creator IDs
      const creatorIds = [...new Set((diagramsData as DbDiagram[])
        .map(d => d.created_by)
        .filter(Boolean))] as string[];

      // Fetch profiles for creators
      let profilesMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', creatorIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.display_name || 'Utilisateur';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return (diagramsData as DbDiagram[]).map(d => 
        mapDbToDiagram(d, d.created_by ? profilesMap[d.created_by] : undefined)
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newDiagram: { 
      name: string; 
      description?: string; 
      userId?: string;
      equipment?: CanvasEquipment[];
      connections?: Connection[];
      zones?: Zone[];
      settings?: DiagramSettings;
    }): Promise<Diagram> => {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Use the DB function to get the organization reliably
      const { data: orgId } = await supabase.rpc('get_user_organization', { _user_id: user.id });

      const { data, error } = await supabase
        .from('diagrams')
        .insert({
          name: newDiagram.name,
          description: newDiagram.description || null,
          equipment: (newDiagram.equipment || []) as unknown as Json,
          connections: (newDiagram.connections || []) as unknown as Json,
          zones: (newDiagram.zones || []) as unknown as Json,
          settings: (newDiagram.settings || null) as unknown as Json,
          created_by: user.id,
          organization_id: orgId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToDiagram(data as DbDiagram);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Diagram> & { id: string }): Promise<Diagram> => {
      const dbUpdates = mapDiagramToDb(updates);
      
      // First update without .select().single() to avoid RLS read-back issues
      const { error: updateError } = await supabase
        .from('diagrams')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Then fetch the updated row separately
      const { data, error: fetchError } = await supabase
        .from('diagrams')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Schéma introuvable après mise à jour');
      return mapDbToDiagram(data as DbDiagram);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diagrams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string): Promise<Diagram> => {
      const original = diagrams.find(d => d.id === id);
      if (!original) throw new Error('Diagram not found');

      const { data, error } = await supabase
        .from('diagrams')
        .insert({
          name: `${original.name} (copie)`,
          description: original.description || null,
          equipment: original.equipment as unknown as Json,
          connections: original.connections as unknown as Json,
          zones: original.zones as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToDiagram(data as DbDiagram);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la duplication: ${error.message}`);
    },
  });

  return {
    diagrams,
    isLoading,
    error,
    createDiagram: createMutation.mutateAsync,
    updateDiagram: updateMutation.mutateAsync,
    deleteDiagram: deleteMutation.mutate,
    duplicateDiagram: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
