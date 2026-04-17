import { useState } from 'react';
import { useProductReferences, ProductReferenceWithManufacturer } from '@/hooks/useProductReferences';
import { useManufacturers } from '@/hooks/useManufacturers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Search, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { EquipmentType, EQUIPMENT_TYPE_LABELS } from '@/types/equipment';

export function ProductReferenceListAdmin() {
  const { isOwner } = useAuthContext();
  const [filterType, setFilterType] = useState<EquipmentType | 'all'>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<ProductReferenceWithManufacturer | null>(null);
  const [formData, setFormData] = useState({ 
    reference: '', 
    manufacturerId: '', 
    equipmentType: 'terminal' as EquipmentType,
    description: '' 
  });

  const { manufacturers } = useManufacturers(filterType === 'all' ? undefined : filterType);
  const { references, isLoading, createReference, updateReference, deleteReference } = useProductReferences(
    filterManufacturer === 'all' ? undefined : filterManufacturer,
    filterType === 'all' ? undefined : filterType
  );

  // Get manufacturers for the form based on selected equipment type
  const { manufacturers: formManufacturers } = useManufacturers(formData.equipmentType);

  const filteredReferences = references.filter(r =>
    r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.manufacturer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingReference(null);
    setFormData({ reference: '', manufacturerId: '', equipmentType: 'terminal', description: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (reference: ProductReferenceWithManufacturer) => {
    setEditingReference(reference);
    setFormData({ 
      reference: reference.reference,
      manufacturerId: reference.manufacturer_id,
      equipmentType: reference.equipment_type as EquipmentType,
      description: reference.description || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.reference.trim()) {
      toast.error('La référence est requise');
      return;
    }
    if (!formData.manufacturerId) {
      toast.error('Le constructeur est requis');
      return;
    }

    try {
      if (editingReference) {
        await updateReference.mutateAsync({ 
          id: editingReference.id, 
          reference: formData.reference,
          description: formData.description,
        });
        toast.success('Référence mise à jour');
      } else {
        await createReference.mutateAsync({ 
          reference: formData.reference,
          manufacturerId: formData.manufacturerId,
          equipmentType: formData.equipmentType,
          description: formData.description,
        });
        toast.success('Référence créée');
      }
      setDialogOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Cette référence existe déjà');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    }
  };

  const handleDelete = async (reference: ProductReferenceWithManufacturer) => {
    if (!confirm(`Supprimer "${reference.reference}" ?`)) return;
    
    try {
      await deleteReference.mutateAsync(reference.id);
      toast.success('Référence supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Globe className="h-3.5 w-3.5" />
        Données globales — partagées entre toutes les organisations
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => {
            setFilterType(v as EquipmentType | 'all');
            setFilterManufacturer('all');
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Constructeur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les constructeurs</SelectItem>
              {manufacturers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isOwner && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Constructeur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredReferences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucune référence trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredReferences.map((ref) => (
                <TableRow key={ref.id} className="group">
                  <TableCell className="font-medium font-mono">{ref.reference}</TableCell>
                  <TableCell>{ref.manufacturer_name}</TableCell>
                  <TableCell>{EQUIPMENT_TYPE_LABELS[ref.equipment_type as EquipmentType] || ref.equipment_type}</TableCell>
                  <TableCell className="max-w-xs truncate">{ref.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Globe className="h-3 w-3" />
                      Global
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isOwner ? (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(ref)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ref)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-8 w-8 flex items-center justify-center">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Seuls les owners peuvent modifier les données globales</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReference ? 'Modifier la référence' : 'Nouvelle référence'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingReference && (
              <>
                <div className="space-y-2">
                  <Label>Type d'équipement</Label>
                  <Select 
                    value={formData.equipmentType} 
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      equipmentType: v as EquipmentType,
                      manufacturerId: '' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Constructeur</Label>
                  <Select 
                    value={formData.manufacturerId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, manufacturerId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un constructeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {formManufacturers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Ex: PAC-YT52CRA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la référence"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createReference.isPending || updateReference.isPending}>
              {editingReference ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
