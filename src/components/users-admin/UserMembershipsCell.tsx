import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';
import { AppRoleV2 } from '@/types/roles';
import { UserMembership } from './types';
import RoleBadge from './RoleBadge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  memberships: UserMembership[];
  isCurrentUser: boolean;
  updatingUser: string | null;
  onRoleChange: (memberId: string, newRole: AppRoleV2) => void;
  canRemoveMembership?: boolean;
  onRemoveMembership?: (memberId: string) => void;
}

export default function UserMembershipsCell({
  memberships, isCurrentUser, updatingUser, onRoleChange,
  canRemoveMembership = false, onRemoveMembership,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (memberships.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-destructive/5 border border-destructive/15 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Aucune organisation</span>
      </div>
    );
  }

  const visibleMemberships = expanded ? memberships : memberships.slice(0, 2);
  const hasMore = memberships.length > 2;

  return (
    <div className="space-y-1">
      {visibleMemberships.map(m => (
        <div key={m.id} className="flex items-center gap-2 group/membership rounded-md px-1.5 py-0.5 hover:bg-muted/50 transition-colors">
          <span className="text-xs flex items-center gap-1.5 text-muted-foreground min-w-[90px] truncate">
            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{m.organization_name}</span>
          </span>
          {isCurrentUser ? (
            <RoleBadge role={m.role} size="sm" />
          ) : (
            <Select
              value={m.role}
              onValueChange={(v) => onRoleChange(m.id, v as AppRoleV2)}
              disabled={updatingUser === m.id}
            >
              <SelectTrigger className="h-6 w-24 text-[10px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                <RoleBadge role={m.role} size="sm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="org_admin">Admin Org</SelectItem>
                <SelectItem value="member">Membre</SelectItem>
              </SelectContent>
            </Select>
          )}
          {canRemoveMembership && !isCurrentUser && onRemoveMembership && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/membership:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Retirer de l'organisation</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Retirer de l'organisation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Retirer ce membre de <strong>{m.organization_name}</strong> ? Il perdra l'accès aux ressources de cette organisation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRemoveMembership(m.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Retirer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[10px] text-muted-foreground px-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
          {expanded ? 'Réduire' : `+${memberships.length - 2} autres`}
        </Button>
      )}
    </div>
  );
}
