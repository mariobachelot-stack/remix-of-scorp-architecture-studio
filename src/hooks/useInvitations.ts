import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRoleV2 } from '@/types/roles';
import { toast } from 'sonner';

export interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: AppRoleV2;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export function useInvitations(organizationId?: string) {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
  });

  const createInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRoleV2 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email,
          organization_id: organizationId!,
          role,
          invited_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Check if user already exists and add them directly
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        // User exists, add to org directly
        await supabase
          .from('organization_members')
          .insert({
            user_id: existingProfile.user_id,
            organization_id: organizationId!,
            role,
          });

        await supabase
          .from('invitations')
          .update({ status: 'accepted' })
          .eq('id', data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-members', organizationId] });
      toast.success('Invitation envoyée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
      toast.success('Invitation annulée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { invitations, isLoading, createInvitation, cancelInvitation };
}
