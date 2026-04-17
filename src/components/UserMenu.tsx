import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Crown, Building2, Users, Settings } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/roles';
import { toast } from 'sonner';

export function UserMenu() {
  const navigate = useNavigate();
  const { user, profile, memberships, isOwner, isOrgAdmin, signOut } = useAuthContext();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erreur lors de la déconnexion');
    } else {
      toast.success('Déconnexion réussie');
      navigate('/auth');
    }
  };

  if (!user) {
    return (
      <Button variant="outline" onClick={() => navigate('/auth')} className="gap-2">
        <User className="h-4 w-4" />
        Connexion
      </Button>
    );
  }

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.display_name || 'Utilisateur'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {memberships.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Organisations
            </DropdownMenuLabel>
            {memberships.map(m => (
              <div key={m.id} className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{m.organization_name}</span>
                </div>
                <Badge variant="secondary" className={`text-xs ${ROLE_COLORS[m.role]}`}>
                  {ROLE_LABELS[m.role]}
                </Badge>
              </div>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {(isOwner || isOrgAdmin) && (
          <>
            <DropdownMenuItem onClick={() => navigate('/admin/users')}>
              <Users className="mr-2 h-4 w-4" />
              Gestion des utilisateurs
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem onClick={() => navigate('/admin/organizations')}>
                <Building2 className="mr-2 h-4 w-4" />
                Gestion des organisations
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
