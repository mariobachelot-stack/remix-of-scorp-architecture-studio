import { useState } from 'react';
import { useManufacturers, Manufacturer } from '@/hooks/useManufacturers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/AuthContext';
import { Plus, Pencil, Trash2, Search, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { EquipmentType, EQUIPMENT_TYPE_LABELS } from '@/types/equipment';

export function ManufacturerListAdmin() {
  const { isOwner } = useAuthContext();
  const [filterType, setFilterType] = useState<EquipmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState({ name: '', equipmentType: 'terminal' as EquipmentType });

  const { manufacturers, isLoading, createManufacturer, updateManufacturer, deleteManufacturer } = useManufacturers(
    filterType === 'all' ? undefined : filterType
  );

  const filteredManufacturers = manufacturers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingManufacturer(null);
    setFormData({ name: '', equipmentType: 'terminal' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (manufacturer: Manufacturer) => {
    setEditingManufacturer(manufacturer);
    setFormData({ 
      name: manufacturer.name, 
      equipmentType: manufacturer.equipment_type as EquipmentType 
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      if (editingManufacturer) {
        await updateManufacturer.mutateAsync({ 
          id: editingManufacturer.id, 
          name: formData.name 
        });
        toast.success('Constructeur mis à jour');
      } else {
        await createManufacturer.mutateAsync({ 
          name: formData.name, 
          equipmentType: formData.equipmentType 
        });
        toast.success('Constructeur créé');
      }
      setDialogOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ce constructeur existe déjà pour ce type');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    }
  };

  const handleDelete = async (manufacturer: Manufacturer) => {
    if (!confirm(`Supprimer "${manufacturer.name}" ?`)) return;
    
    try {
      await deleteManufacturer.mutateAsync(manufacturer.id);
      toast.success('Constructeur supprimé');
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

      <div className="flex items-center justify-between gap-4">
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
          <Select value={filterType} onValueChange={(v) => setFilterType(v as EquipmentType | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
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
              <TableHead>Nom</TableHead>
              <TableHead>Type d'équipement</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredManufacturers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Aucun constructeur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredManufacturers.map((manufacturer) => (
                <TableRow key={manufacturer.id} className="group">
                  <TableCell className="font-medium">{manufacturer.name}</TableCell>
                  <TableCell>{EQUIPMENT_TYPE_LABELS[manufacturer.equipment_type as EquipmentType] || manufacturer.equipment_type}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Globe className="h-3 w-3" />
                      Global
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isOwner ? (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(manufacturer)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(manufacturer)}>
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
              {editingManufacturer ? 'Modifier le constructeur' : 'Nouveau constructeur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du constructeur"
              />
            </div>
            {!editingManufacturer && (
              <div className="space-y-2">
                <Label htmlFor="type">Type d'équipement</Label>
                <Select 
                  value={formData.equipmentType} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, equipmentType: v as EquipmentType }))}
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createManufacturer.isPending || updateManufacturer.isPending}>
              {editingManufacturer ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
