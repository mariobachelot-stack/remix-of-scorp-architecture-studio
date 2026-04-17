import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useInvitations } from '@/hooks/useInvitations';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

import UsersAdminHeader from '@/components/users-admin/UsersAdminHeader';
import UsersFilters from '@/components/users-admin/UsersFilters';
import UsersTable from '@/components/users-admin/UsersTable';
import InvitationsTab from '@/components/users-admin/InvitationsTab';
import PermissionsTab from '@/components/users-admin/PermissionsTab';
import { useUsersAdmin } from '@/components/users-admin/useUsersAdmin';
import { StatusFilter, RoleFilter, OrgFilter } from '@/components/users-admin/types';

export default function UsersAdmin() {
  const navigate = useNavigate();
  const { isOwner, isOrgAdmin, isLoading: authLoading, user, memberships } = useAuthContext();
  const { organizations } = useOrganizations();

  // Determine access level
  const hasAccess = isOwner || isOrgAdmin;

  // For org_admins, scope to their organizations only
  const scopedOrgIds = useMemo(() => {
    if (isOwner) return undefined; // Owner sees all
    return memberships
      .filter(m => m.role === 'org_admin' && !m.isDefaultOrg)
      .map(m => m.organization_id);
  }, [isOwner, memberships]);

  const scopedOrganizations = useMemo(() => {
    if (isOwner) return organizations;
    if (!scopedOrgIds) return [];
    return organizations.filter(o => scopedOrgIds.includes(o.id));
  }, [isOwner, organizations, scopedOrgIds]);

  const {
    users, isLoading, updatingUser, deletingUser,
    updateMemberRole, deleteUser, bulkDeleteUsers, removeMembership,
  } = useUsersAdmin(hasAccess, scopedOrgIds);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [orgFilter, setOrgFilter] = useState<OrgFilter>('all');
  const [activeTab, setActiveTab] = useState('users');

  // Invitations: owner sees first org, org_admin sees their first scoped org
  const firstOrgId = scopedOrganizations[0]?.id;
  const { invitations } = useInvitations(firstOrgId);
  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast.error('Accès non autorisé');
      navigate('/');
    }
  }, [hasAccess, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <>
      <Helmet>
        <title>Gestion des utilisateurs | SCorp-io</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <UsersAdminHeader userCount={users.length} />

        <main className="container mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="users" className="gap-1.5">
                  Utilisateurs
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{users.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="invitations" className="gap-1.5">
                  Invitations
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="permissions">Rôles & Permissions</TabsTrigger>
                )}
              </TabsList>

              {activeTab === 'users' && (
                <Button onClick={() => setActiveTab('invitations')} className="gap-1.5">
                  <UserPlus className="h-4 w-4" /> Inviter
                </Button>
              )}
            </div>

            <TabsContent value="users">
              <Card>
                <CardHeader className="pb-3">
                  <UsersFilters
                    search={search} onSearchChange={setSearch}
                    statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
                    roleFilter={roleFilter} onRoleFilterChange={setRoleFilter}
                    orgFilter={orgFilter} onOrgFilterChange={setOrgFilter}
                    organizations={scopedOrganizations}
                  />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <UsersTable
                      users={users}
                      currentUserId={user?.id}
                      updatingUser={updatingUser}
                      deletingUser={deletingUser}
                      search={search}
                      statusFilter={statusFilter}
                      roleFilter={roleFilter}
                      orgFilter={orgFilter}
                      onRoleChange={updateMemberRole}
                      onDeleteUser={(uid) => deleteUser(uid, user?.id)}
                      onBulkDelete={(ids) => bulkDeleteUsers(ids, user?.id)}
                      canDeleteUsers={isOwner}
                      canRemoveMembership={isOwner}
                      onRemoveMembership={removeMembership}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitations">
              <InvitationsTab organizations={scopedOrganizations} />
            </TabsContent>

            {isOwner && (
              <TabsContent value="permissions">
                <PermissionsTab />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </>
  );
}
