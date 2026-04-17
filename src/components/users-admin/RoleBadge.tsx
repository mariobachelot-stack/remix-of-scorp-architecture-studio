import { Badge } from '@/components/ui/badge';
import { Crown, Shield, User } from 'lucide-react';
import { AppRoleV2 } from '@/types/roles';

const ROLE_CONFIG: Record<AppRoleV2, { label: string; icon: typeof Crown; className: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'bg-[hsl(262,83%,58%)] text-white border-[hsl(262,83%,48%)]',
  },
  org_admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-[hsl(217,91%,50%)] text-white border-[hsl(217,91%,40%)]',
  },
  member: {
    label: 'Membre',
    icon: User,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

interface Props {
  role: AppRoleV2;
  size?: 'sm' | 'default';
}

export default function RoleBadge({ role, size = 'default' }: Props) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  return (
    <Badge className={`${config.className} ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} gap-1 font-medium border`}>
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {config.label}
    </Badge>
  );
}
