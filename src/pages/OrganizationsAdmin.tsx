import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Plus, Pencil, Trash2, Loader2, Save, X, Users, Link2, Mail } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrganizations, Organization } from '@/hooks/useOrganizations';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useInvitations } from '@/hooks/useInvitations';
import { AppRoleV2, ROLE_LABELS, ROLE_COLORS } from '@/types/roles';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrganizationsAdmin() {
  const navigate = useNavigate();
  const { isOwner, isOrgAdmin, isLoading: authLoading, memberships } = useAuthContext();
  const { organizations, isLoading, createOrganization, updateOrganization, deleteOrganization } = useOrganizations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRoleV2>('member');

  const { members, isLoading: membersLoading } = useOrganizationMembers(selectedOrgId || undefined);
  const { invitations, createInvitation, cancelInvitation } = useInvitations(selectedOrgId || undefined);

  // Filter orgs: owners see all, org_admins see their orgs
  const visibleOrgs = isOwner
    ? organizations
    : organizations.filter(o => memberships.some(m => m.organization_id === o.id && m.role === 'org_admin'));

  const handleOpenCreate = () => {
    setEditingOrg(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, description: org.description || '' });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    if (editingOrg) {
      await updateOrganization.mutateAsync({ id: editingOrg.id, name: formData.name, description: formData.description || undefined });
    } else {
      await createOrganization.mutateAsync({ name: formData.name, description: formData.description || undefined });
    }
    setIsDialogOpen(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedOrgId) return;
    await createInvitation.mutateAsync({ email: inviteEmail, role: inviteRole });
    setInviteEmail('');
  };

  const copyJoinLink = (org: Organization) => {
    const link = `${window.location.origin}/join/${org.slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié !');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner && !isOrgAdmin) {
    navigate('/');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Gestion des organisations | SCorp-io</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Gestion des organisations</h1>
                    <p className="text-sm text-muted-foreground">Organisations, membres et invitations</p>
                  </div>
                </div>
              </div>
              {isOwner && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle organisation
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 space-y-6">
          {/* Org list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organisations ({visibleOrgs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOrgs.map(org => (
                      <TableRow
                        key={org.id}
                        className={selectedOrgId === org.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/30'}
                        onClick={() => setSelectedOrgId(org.id)}
                      >
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{org.slug}</TableCell>
                        <TableCell className="text-muted-foreground">{org.description || '-'}</TableCell>
                        <TableCell>
                          {org.is_default ? <Badge variant="secondary">Par défaut</Badge> : <Badge variant="outline">Standard</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => copyJoinLink(org)} title="Copier le lien d'invitation">
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(org)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!org.is_default && isOwner && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer l'organisation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Les membres seront réassignés à l'organisation par défaut.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOrganization.mutate(org.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Selected org details */}
          {selectedOrgId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {organizations.find(o => o.id === selectedOrgId)?.name} — Membres & Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="members">
                  <TabsList>
                    <TabsTrigger value="members">Membres ({members.length})</TabsTrigger>
                    <TabsTrigger value="invitations">Invitations ({invitations.filter(i => i.status === 'pending').length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="mt-4">
                    {membersLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rôle</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map(m => (
                            <TableRow key={m.id}>
                              <TableCell>{m.display_name || '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{m.email}</TableCell>
                              <TableCell>
                                <Badge className={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="invitations" className="mt-4 space-y-4">
                    {/* Invite form */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="email@exemple.com"
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label>Rôle</Label>
                        <Select value={inviteRole} onValueChange={v => setInviteRole(v as AppRoleV2)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                            <SelectItem value="org_admin">Admin Org</SelectItem>
                            <SelectItem value="member">Membre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInvite} disabled={!inviteEmail.trim() || createInvitation.isPending}>
                        {createInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                        Inviter
                      </Button>
                    </div>

                    {/* Pending invitations */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Expire</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell>{inv.email}</TableCell>
                            <TableCell>
                              <Badge className={ROLE_COLORS[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={inv.status === 'pending' ? 'default' : 'secondary'}>
                                {inv.status === 'pending' ? 'En attente' : inv.status === 'accepted' ? 'Acceptée' : inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              {inv.status === 'pending' && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="text-destructive"
                                  onClick={() => cancelInvitation.mutate(inv.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Modifier l'organisation" : 'Nouvelle organisation'}</DialogTitle>
            <DialogDescription>
              {editingOrg ? "Modifiez les informations." : 'Créez une nouvelle organisation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" /> Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim() || createOrganization.isPending || updateOrganization.isPending}>
              {(createOrganization.isPending || updateOrganization.isPending) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingOrg ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
