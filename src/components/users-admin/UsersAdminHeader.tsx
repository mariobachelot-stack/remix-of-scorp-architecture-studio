import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  userCount: number;
}

export default function UsersAdminHeader({ userCount }: Props) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Gestion des utilisateurs</h1>
              <p className="text-sm text-muted-foreground">
                {userCount} utilisateur{userCount > 1 ? 's' : ''} · Gérez les membres, rôles et invitations
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
