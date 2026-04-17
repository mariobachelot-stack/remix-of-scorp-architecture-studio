import { createContext, useContext, ReactNode } from 'react';
import { useAuth, AppRole, AppRoleV2, OrgMembership, UserProfile } from '@/hooks/useAuth';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  memberships: OrgMembership[];
  roles: AppRole[];
  isLoading: boolean;
  isOwner: boolean;
  isOrgAdmin: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  canManageLibrary: boolean;
  hasOrganization: boolean;
  getRoleInOrg: (orgId: string) => AppRoleV2 | null;
  refreshMemberships: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
