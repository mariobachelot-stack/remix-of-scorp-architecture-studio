import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, XCircle, RefreshCw, Plus, Loader2, Copy } from 'lucide-react';
import { Organization } from '@/hooks/useOrganizations';
import { useInvitations, Invitation } from '@/hooks/useInvitations';
import { AppRoleV2 } from '@/types/roles';
import RoleBadge from './RoleBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  organizations: Organization[];
}

export default function InvitationsTab({ organizations }: Props) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || '');
  const { invitations, isLoading, createInvitation, cancelInvitation } = useInvitations(selectedOrgId);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRoleV2>('member');
  const [sending, setSending] = useState(false);

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const otherInvitations = invitations.filter(i => i.status !== 'pending');

  const handleSend = async () => {
    if (!newEmail.trim()) return;
    if (!selectedOrgId) { toast.error('Sélectionnez une organisation'); return; }
    setSending(true);
    try {
      await createInvitation.mutateAsync({ email: newEmail.trim(), role: newRole });
      setNewEmail('');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    await cancelInvitation.mutateAsync(inv.id);
    await createInvitation.mutateAsync({ email: inv.email, role: inv.role });
    toast.success('Invitation renvoyée');
  };

  const copyInviteLink = (inv: Invitation) => {
    const org = organizations.find(o => o.id === inv.organization_id);
    if (!org) return;
    const link = `${window.location.origin}/join/${org.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien d\'invitation copié');
  };

  return (
    <div className="space-y-6">
      {/* Send new invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Inviter un utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Organisation</label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {organizations.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Rôle</label>
              <Select value={newRole} onValueChange={v => setNewRole(v as AppRoleV2)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Admin Org</SelectItem>
                  <SelectItem value="member">Membre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSend} disabled={sending || !newEmail.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Invitations en attente
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingInvitations.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Invitations n'ayant pas encore été acceptées</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune invitation en attente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell><RoleBadge role={inv.role} size="sm" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inv.expires_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyInviteLink(inv)} title="Copier le lien">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleResend(inv)} title="Renvoyer">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => cancelInvitation.mutate(inv.id)}
                          title="Annuler"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {otherInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherInvitations.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><RoleBadge role={inv.role} size="sm" /></TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'accepted' ? 'default' : 'secondary'} className="text-[10px]">
                        {inv.status === 'accepted' ? 'Acceptée' : inv.status === 'cancelled' ? 'Annulée' : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
