import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Organization } from '@/hooks/useOrganizations';
import { StatusFilter, RoleFilter, OrgFilter } from './types';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (v: RoleFilter) => void;
  orgFilter: OrgFilter;
  onOrgFilterChange: (v: OrgFilter) => void;
  organizations: Organization[];
}

export default function UsersFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  roleFilter, onRoleFilterChange,
  orgFilter, onOrgFilterChange,
  organizations,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={orgFilter} onValueChange={v => onOrgFilterChange(v as OrgFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Organisation" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les orgs</SelectItem>
          {organizations.map(o => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={roleFilter} onValueChange={v => onRoleFilterChange(v as RoleFilter)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Rôle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les rôles</SelectItem>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="org_admin">Admin Org</SelectItem>
          <SelectItem value="member">Membre</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={v => onStatusFilterChange(v as StatusFilter)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="active">Avec organisation</SelectItem>
          <SelectItem value="unassigned">Sans organisation</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
