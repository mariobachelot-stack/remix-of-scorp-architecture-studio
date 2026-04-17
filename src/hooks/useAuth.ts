import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRoleV2, OrgMembership, UserProfile } from '@/types/roles';

// Keep backward compat export
export type AppRole = 'admin' | 'editor' | 'reader' | 'library_admin';

export type { AppRoleV2, OrgMembership, UserProfile };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as unknown as UserProfile);
      }

      // Fetch organization memberships
      const { data: membershipsData } = await supabase
        .from('organization_members')
        .select('*, organizations(name, slug, is_default)')
        .eq('user_id', userId);

      if (membershipsData) {
        setMemberships(
          membershipsData.map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            organization_id: m.organization_id,
            organization_name: m.organizations?.name,
            organization_slug: m.organizations?.slug,
            isDefaultOrg: m.organizations?.is_default ?? false,
            role: m.role as AppRoleV2,
            created_at: m.created_at,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setMemberships([]);
        }

        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setMemberships([]);
    }
    return { error };
  };

  const refreshMemberships = useCallback(() => {
    if (user) {
      fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  // Derived permissions
  const isOwner = memberships.some(m => m.role === 'owner');
  const isOrgAdmin = memberships.some(m => m.role === 'org_admin');
  const canEdit = isOwner || isOrgAdmin;
  const canManageLibrary = isOwner || isOrgAdmin;
  // User has a real org if they belong to at least one non-default organization
  const hasOrganization = memberships.some(m => !m.isDefaultOrg);

  // Backward compat
  const isAdmin = isOwner;
  const roles: AppRole[] = [];
  if (isOwner) roles.push('admin');
  if (isOrgAdmin) roles.push('editor');
  if (!isOwner && !isOrgAdmin) roles.push('reader');

  // Helper: get role in a specific org
  const getRoleInOrg = (orgId: string): AppRoleV2 | null => {
    const m = memberships.find(m => m.organization_id === orgId);
    return m?.role ?? null;
  };

  return {
    user,
    session,
    profile,
    memberships,
    roles,
    isLoading,
    isOwner,
    isOrgAdmin,
    isAdmin,
    canEdit,
    canManageLibrary,
    hasOrganization,
    getRoleInOrg,
    refreshMemberships,
    signIn,
    signUp,
    signOut,
  };
}
