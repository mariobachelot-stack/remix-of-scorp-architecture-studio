import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRoleV2 } from '@/types/roles';
import { UserRow } from './types';

/**
 * @param hasAccess - whether the current user has access
 * @param scopedOrgIds - if defined, only show members of these orgs (for org_admins). undefined = all (owner).
 */
export function useUsersAdmin(hasAccess: boolean, scopedOrgIds?: string[]) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let membersQuery = supabase
        .from('organization_members')
        .select('*, organizations(name)');

      // Scope to specific orgs for org_admins
      if (scopedOrgIds) {
        membersQuery = membersQuery.in('organization_id', scopedOrgIds);
      }

      const { data: members, error: mErr } = await membersQuery;
      if (mErr) throw mErr;

      // Get unique user IDs from members
      const userIds = [...new Set((members || []).map((m: any) => m.user_id))];

      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      // If owner, fetch all profiles; if org_admin, only fetch profiles for scoped members
      let profilesQuery = supabase.from('profiles').select('*');
      if (scopedOrgIds) {
        profilesQuery = profilesQuery.in('user_id', userIds);
      }

      const { data: profiles, error: pErr } = await profilesQuery;
      if (pErr) throw pErr;

      const rows: UserRow[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        memberships: (members || [])
          .filter((m: any) => m.user_id === p.user_id)
          .map((m: any) => ({
            id: m.id,
            organization_id: m.organization_id,
            organization_name: m.organizations?.name || '—',
            role: m.role as AppRoleV2,
          })),
      }));

      setUsers(rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [scopedOrgIds]);

  useEffect(() => {
    if (hasAccess) fetchUsers();
  }, [hasAccess, fetchUsers]);

  const updateMemberRole = async (memberId: string, newRole: AppRoleV2) => {
    setUpdatingUser(memberId);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
      await fetchUsers();
      toast.success('Rôle mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingUser(null);
    }
  };

  const deleteUser = async (userId: string, currentUserId?: string) => {
    if (userId === currentUserId) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    setDeletingUser(userId);
    try {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success('Utilisateur supprimé');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingUser(null);
    }
  };

  const bulkDeleteUsers = async (userIds: string[], currentUserId?: string) => {
    const filtered = userIds.filter(id => id !== currentUserId);
    for (const uid of filtered) {
      await deleteUser(uid, currentUserId);
    }
  };

  const bulkUpdateRole = async (memberIds: { memberId: string; newRole: AppRoleV2 }[]) => {
    for (const { memberId, newRole } of memberIds) {
      await updateMemberRole(memberId, newRole);
    }
  };

  const removeMembership = async (memberId: string) => {
    setUpdatingUser(memberId);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      await fetchUsers();
      toast.success('Membre retiré de l\'organisation');
    } catch {
      toast.error('Erreur lors du retrait');
    } finally {
      setUpdatingUser(null);
    }
  };

  return {
    users, isLoading, updatingUser, deletingUser,
    fetchUsers, updateMemberRole, deleteUser, bulkDeleteUsers, bulkUpdateRole, removeMembership,
  };
}
