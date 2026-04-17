import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

const PERMISSIONS = [
  { label: 'Accès complet toutes orgs', owner: true, org_admin: false, member: false },
  { label: 'Gestion utilisateurs & rôles', owner: true, org_admin: false, member: false },
  { label: 'Templates & bibliothèque globaux', owner: true, org_admin: false, member: false },
  { label: 'Impersonation', owner: true, org_admin: false, member: false },
  { label: 'Gestion de son organisation', owner: true, org_admin: true, member: false },
  { label: 'Inviter des membres', owner: true, org_admin: true, member: false },
  { label: 'Créer/modifier schémas org', owner: true, org_admin: true, member: false },
  { label: 'Bibliothèque org', owner: true, org_admin: true, member: false },
  { label: 'Accès à son organisation', owner: true, org_admin: true, member: true },
  { label: 'Lecture schémas org', owner: true, org_admin: true, member: true },
  { label: 'Modification schémas', owner: true, org_admin: true, member: false },
];

function PermIcon({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Check className="h-4 w-4 text-accent" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/40" />
  );
}

export default function PermissionsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Matrice des permissions par rôle</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Permission</TableHead>
              <TableHead className="text-center w-28">
                <span className="inline-flex items-center gap-1 text-accent-foreground font-semibold">Owner</span>
              </TableHead>
              <TableHead className="text-center w-28">
                <span className="inline-flex items-center gap-1 text-primary font-semibold">Admin Org</span>
              </TableHead>
              <TableHead className="text-center w-28">
                <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">Membre</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSIONS.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{p.label}</TableCell>
                <TableCell className="text-center"><PermIcon allowed={p.owner} /></TableCell>
                <TableCell className="text-center"><PermIcon allowed={p.org_admin} /></TableCell>
                <TableCell className="text-center"><PermIcon allowed={p.member} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
