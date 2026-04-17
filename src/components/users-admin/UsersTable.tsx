import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, UserCog } from 'lucide-react';
import { AppRoleV2 } from '@/types/roles';
import { UserRow, StatusFilter, RoleFilter, OrgFilter } from './types';
import UserMembershipsCell from './UserMembershipsCell';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  users: UserRow[];
  currentUserId?: string;
  updatingUser: string | null;
  deletingUser: string | null;
  search: string;
  statusFilter: StatusFilter;
  roleFilter: RoleFilter;
  orgFilter: OrgFilter;
  onRoleChange: (memberId: string, newRole: AppRoleV2) => void;
  onDeleteUser: (userId: string) => void;
  onBulkDelete: (userIds: string[]) => void;
  canDeleteUsers?: boolean;
  canRemoveMembership?: boolean;
  onRemoveMembership?: (memberId: string) => void;
}

export default function UsersTable({
  users, currentUserId, updatingUser, deletingUser,
  search, statusFilter, roleFilter, orgFilter,
  onRoleChange, onDeleteUser, onBulkDelete, canDeleteUsers = true,
  canRemoveMembership = false, onRemoveMembership,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'unassigned') {
      result = result.filter(u => u.memberships.length === 0);
    } else if (statusFilter === 'active') {
      result = result.filter(u => u.memberships.length > 0);
    }
    if (roleFilter !== 'all') {
      result = result.filter(u => u.memberships.some(m => m.role === roleFilter));
    }
    if (orgFilter !== 'all') {
      result = result.filter(u => u.memberships.some(m => m.organization_id === orgFilter));
    }
    return result;
  }, [users, search, statusFilter, roleFilter, orgFilter]);

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.user_id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectableSelected = [...selectedIds].filter(id => id !== currentUserId);

  return (
    <div>
      {canDeleteUsers && selectableSelected.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-3 rounded-lg bg-muted border border-border">
          <span className="text-sm font-medium">{selectableSelected.length} sélectionné(s)</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer {selectableSelected.length} utilisateur(s)</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Les utilisateurs sélectionnés seront supprimés définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { onBulkDelete(selectableSelected); setSelectedIds(new Set()); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {canDeleteUsers && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">Utilisateur</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold w-28">Statut</TableHead>
              <TableHead className="font-semibold">Organisations & Rôles</TableHead>
              {canDeleteUsers && <TableHead className="w-14"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserCog className="h-8 w-8 text-muted-foreground/40" />
                    <span>Aucun utilisateur trouvé</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(u => {
                const isMe = u.user_id === currentUserId;
                const hasOrg = u.memberships.length > 0;
                return (
                  <TableRow
                    key={u.user_id}
                    className="group transition-colors"
                    data-state={selectedIds.has(u.user_id) ? 'selected' : undefined}
                  >
                    {canDeleteUsers && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(u.user_id)}
                          onCheckedChange={() => toggleOne(u.user_id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {(u.display_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{u.display_name || 'Sans nom'}</span>
                            {isMe && (
                              <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">Vous</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${hasOrg ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-xs text-muted-foreground">{hasOrg ? 'Actif' : 'Non assigné'}</span>
                      </div>
                  </TableCell>
                  <TableCell>
                    <UserMembershipsCell
                      memberships={u.memberships}
                      isCurrentUser={isMe}
                      updatingUser={updatingUser}
                      onRoleChange={onRoleChange}
                      canRemoveMembership={canRemoveMembership}
                      onRemoveMembership={onRemoveMembership}
                    />
                  </TableCell>
                  {canDeleteUsers && (
                    <TableCell>
                      {!isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingUser === u.user_id}
                              >
                                {deletingUser === u.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de supprimer <strong>{u.display_name || u.email}</strong> ? Action irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteUser(u.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
