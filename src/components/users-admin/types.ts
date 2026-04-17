import { AppRoleV2 } from '@/types/roles';

export interface UserMembership {
  id: string;
  organization_id: string;
  organization_name: string;
  role: AppRoleV2;
}

export interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  memberships: UserMembership[];
}

export type StatusFilter = 'all' | 'active' | 'unassigned';
export type RoleFilter = 'all' | AppRoleV2;
export type OrgFilter = 'all' | string;
