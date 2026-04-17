import { Trash2, Edit, AlertCircle, Lock, Building2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DynamicIcon } from '@/components/DynamicIcon';
import { EquipmentLibraryItem, useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { ProtocolBadge } from '@/components/ProtocolBadge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { cn } from '@/lib/utils';
import { 
  CATEGORY_LABELS, 
  EQUIPMENT_TYPE_LABELS 
} from '@/types/equipment';

interface EquipmentListAdminProps {
  equipment: EquipmentLibraryItem[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

export function EquipmentListAdmin({ equipment, isLoading, onEdit }: EquipmentListAdminProps) {
  const { deleteEquipment, isDeleting } = useEquipmentLibrary();
  const { isOwner } = useAuthContext();
  const { organizations } = useOrganizations();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Aucun équipement</h3>
        <p className="text-muted-foreground">
          Cliquez sur "Initialiser depuis les défauts" ou "Nouvel équipement" pour commencer.
        </p>
      </div>
    );
  }

  // Grouper par catégorie
  const groupedEquipment = equipment.reduce((acc, eq) => {
    if (!acc[eq.category]) {
      acc[eq.category] = [];
    }
    acc[eq.category].push(eq);
    return acc;
  }, {} as Record<string, EquipmentLibraryItem[]>);

  const getOrgName = (orgId: string | null | undefined) => {
    if (!orgId) return null;
    return organizations.find(o => o.id === orgId)?.name;
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" />
          Global — visible par tous, modifiable uniquement par les owners
        </span>
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          Organisation — propre à votre organisation
        </span>
      </div>

      {Object.entries(groupedEquipment).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Protocole</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isGlobal = !item.organization_id;
                  const canModify = isGlobal ? isOwner : true;
                  const orgName = getOrgName(item.organization_id);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn("group", isGlobal && "bg-muted/20")}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                          <DynamicIcon name={item.icon} className="h-4 w-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell className="text-muted-foreground">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EQUIPMENT_TYPE_LABELS[item.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ProtocolBadge protocol={item.protocol} />
                      </TableCell>
                      <TableCell>
                        {isGlobal ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Globe className="h-3 w-3" />
                                Global
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Élément global — modifiable uniquement par les owners</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary">
                                <Building2 className="h-3 w-3" />
                                {orgName || 'Organisation'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Élément propre à votre organisation</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canModify ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(item.id)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer l'équipement ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. L'équipement "{item.label}" sera 
                                      définitivement supprimé de la bibliothèque.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteEquipment(item.id)}
                                      disabled={isDeleting}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-8 w-8 flex items-center justify-center">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Seuls les owners peuvent modifier cet élément</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
