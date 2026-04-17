import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRoleV2 } from '@/types/roles';
import { toast } from 'sonner';

export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRoleV2;
  created_at: string;
  display_name: string | null;
  email: string | null;
}

export function useOrganizationMembers(organizationId?: string) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org-members', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, profiles!organization_members_user_id_fkey(display_name, email)')
        .eq('organization_id', organizationId!);

      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        organization_id: m.organization_id,
        role: m.role as AppRoleV2,
        created_at: m.created_at,
        display_name: m.profiles?.display_name ?? null,
        email: m.profiles?.email ?? null,
      })) as OrgMember[];
    },
  });

  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRoleV2 }) => {
      const { error } = await supabase
        .from('organization_members')
        .insert({ user_id: userId, organization_id: organizationId!, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
      toast.success('Membre ajouté');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: AppRoleV2 }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
      toast.success('Rôle mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
      toast.success('Membre retiré');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { members, isLoading, addMember, updateRole, removeMember };
}
