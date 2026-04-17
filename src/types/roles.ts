export type AppRoleV2 = 'owner' | 'org_admin' | 'member';

export interface OrgMembership {
  id: string;
  user_id: string;
  organization_id: string;
  organization_name?: string;
  organization_slug?: string;
  isDefaultOrg?: boolean;
  role: AppRoleV2;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  organization_id: string;
}

export const ROLE_LABELS: Record<AppRoleV2, string> = {
  owner: 'Owner',
  org_admin: 'Admin Org',
  member: 'Membre',
};

export const ROLE_COLORS: Record<AppRoleV2, string> = {
  owner: 'bg-destructive text-destructive-foreground',
  org_admin: 'bg-primary text-primary-foreground',
  member: 'bg-secondary text-secondary-foreground',
};
