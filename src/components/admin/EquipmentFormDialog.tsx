import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthContext } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DynamicIcon } from '@/components/DynamicIcon';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { ManufacturerCombobox } from './ManufacturerCombobox';
import { ProductReferenceCombobox } from './ProductReferenceCombobox';
import { 
  CATEGORY_LABELS, 
  EQUIPMENT_TYPE_LABELS,
  PROTOCOL_LABELS,
  EquipmentType,
} from '@/types/equipment';

const AVAILABLE_ICONS = [
  'Box', 'Flame', 'Snowflake', 'Wind', 'AirVent', 'Thermometer', 'Fan', 
  'Gauge', 'Smartphone', 'Cpu', 'Lightbulb', 'Activity', 'ArrowLeftRight', 
  'Cloud', 'Server', 'Router', 'Wifi', 'Plug', 'Zap', 'Battery',
  'Monitor', 'Tv', 'Radio', 'Speaker', 'Mic', 'Camera', 'Printer'
];

const formSchema = z.object({
  label: z.string().min(1, 'Le label est requis').max(20, 'Max 20 caractères'),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Max 100 caractères'),
  type: z.enum(['terminal', 'automate', 'interface', 'cloud', 'sensor']),
  category: z.enum(['hvac', 'lighting', 'metering', 'interface', 'scorp-io', 'saved-model']),
  protocol: z.enum(['none', 'modbus-tcp', 'modbus-rtu', 'bacnet-ip', 'bacnet-mstp', 'lon', 'cloud-api', 'ethernet', 'lorawan', 'Constructeur', 'multi-protocole']),
  icon: z.string().min(1, 'L\'icône est requise'),
  description: z.string().optional(),
  manufacturerId: z.string().optional(),
  reference: z.string().optional(),
  borderColor: z.string().optional(),
  headerBackgroundColor: z.string().optional(),
  quantity: z.coerce.number().int().min(1).optional().or(z.literal('')),
});

// Default colors based on equipment type
const getDefaultColors = (type: EquipmentType) => {
  switch (type) {
    case 'cloud': return { border: '#7c3aed', header: '#a78bfa' };
    case 'interface': return { border: '#0d9488', header: '#2dd4bf' };
    case 'automate': return { border: '#1d4ed8', header: '#3b82f6' };
    case 'sensor': return { border: '#ea580c', header: '#fb923c' };
    default: return { border: '#cbd5e1', header: '#e2e8f0' };
  }
};

type FormData = z.infer<typeof formSchema>;

interface EquipmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
}

export function EquipmentFormDialog({ open, onOpenChange, editingId }: EquipmentFormDialogProps) {
  const { equipment, createEquipment, updateEquipment, isCreating, isUpdating } = useEquipmentLibrary();
  const { isOwner, memberships } = useAuthContext();
  const [selectedIcon, setSelectedIcon] = useState('Box');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string | undefined>();

  const editingEquipment = editingId ? equipment.find(e => e.id === editingId) : null;
  const isEditing = !!editingId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      name: '',
      type: 'terminal',
      category: 'hvac',
      protocol: 'modbus-tcp',
      icon: 'Box',
      description: '',
      manufacturerId: '',
      reference: '',
      borderColor: '',
      headerBackgroundColor: '',
      quantity: '',
    },
  });

  const watchedType = form.watch('type');
  const watchedBorderColor = form.watch('borderColor');
  const watchedHeaderColor = form.watch('headerBackgroundColor');
  const defaultColors = getDefaultColors(watchedType as EquipmentType);

  useEffect(() => {
    if (editingEquipment) {
      form.reset({
        label: editingEquipment.label,
        name: editingEquipment.name,
        type: editingEquipment.type,
        category: editingEquipment.category,
        protocol: editingEquipment.protocol,
        icon: editingEquipment.icon,
        description: editingEquipment.description || '',
        manufacturerId: (editingEquipment as any).manufacturer_id || '',
        reference: editingEquipment.reference || '',
        borderColor: editingEquipment.borderColor || '',
        headerBackgroundColor: editingEquipment.headerBackgroundColor || '',
        quantity: (editingEquipment as any).quantity || '',
      });
      setSelectedIcon(editingEquipment.icon);
      setSelectedManufacturerId((editingEquipment as any).manufacturer_id);
    } else {
      form.reset({
        label: '',
        name: '',
        type: 'terminal',
        category: 'hvac',
        protocol: 'modbus-tcp',
        icon: 'Box',
        description: '',
        manufacturerId: '',
        reference: '',
        borderColor: '',
        headerBackgroundColor: '',
        quantity: '',
      });
      setSelectedIcon('Box');
      setSelectedManufacturerId(undefined);
    }
  }, [editingEquipment, form, open]);

  const onSubmit = (data: FormData) => {
    const equipmentData: any = {
      label: data.label,
      name: data.name,
      type: data.type,
      category: data.category,
      protocol: data.protocol,
      icon: data.icon,
      description: data.description || undefined,
      manufacturer_id: data.manufacturerId || null,
      reference: data.reference || undefined,
      quantity: data.quantity && typeof data.quantity === 'number' ? data.quantity : undefined,
    };

    // Only add color properties if they have values
    if (data.borderColor && data.borderColor.trim() !== '') {
      equipmentData.borderColor = data.borderColor;
    }
    if (data.headerBackgroundColor && data.headerBackgroundColor.trim() !== '') {
      equipmentData.headerBackgroundColor = data.headerBackgroundColor;
    }

    // Owners create global equipment (null), org_admins create org-scoped equipment
    if (!isEditing) {
      if (isOwner) {
        equipmentData.organization_id = null;
      } else {
        const nonDefaultMembership = memberships.find(m => !m.isDefaultOrg);
        equipmentData.organization_id = nonDefaultMembership?.organization_id || null;
      }
    }

    if (isEditing && editingId) {
      updateEquipment({ id: editingId, ...equipmentData });
    } else {
      createEquipment(equipmentData);
    }
    onOpenChange(false);
  };

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
    form.setValue('icon', icon);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'équipement' : 'Nouvel équipement'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les paramètres de l\'équipement. Les modifications seront sauvegardées automatiquement.'
              : 'Créez un nouvel équipement pour la bibliothèque.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Paramètres fonctionnels */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Paramètres fonctionnels
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PAC" {...field} />
                      </FormControl>
                      <FormDescription>Abréviation courte</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pompe à chaleur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="protocol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocole *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Protocole" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PROTOCOL_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="manufacturerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Constructeur</FormLabel>
                    <FormControl>
                      <ManufacturerCombobox
                        equipmentType={watchedType as EquipmentType}
                        value={selectedManufacturerId}
                        onChange={(id) => {
                          setSelectedManufacturerId(id);
                          field.onChange(id || '');
                          // Reset reference when manufacturer changes
                          form.setValue('reference', '');
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Sélectionnez ou créez un constructeur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence produit</FormLabel>
                    <FormControl>
                      <ProductReferenceCombobox
                        manufacturerId={selectedManufacturerId}
                        equipmentType={watchedType as EquipmentType}
                        value={field.value}
                        onChange={(ref) => field.onChange(ref || '')}
                      />
                    </FormControl>
                    <FormDescription>
                      Sélectionnez ou créez une référence
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantité</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          placeholder="Ex: 3"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>Nombre d'unités</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description..."
                          className="resize-none h-[72px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Paramètres visuels */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Paramètres visuels
              </h3>
              
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icône *</FormLabel>
                    <div className="space-y-3">
                      {/* Preview */}
                      <div 
                        className="flex items-center gap-3 p-4 border-2 rounded-lg bg-card"
                        style={{ borderColor: watchedBorderColor || defaultColors.border }}
                      >
                        <div 
                          className="flex items-center justify-center w-12 h-12 rounded-lg"
                          style={{ backgroundColor: watchedHeaderColor || defaultColors.header }}
                        >
                          <DynamicIcon name={selectedIcon} className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{form.watch('label') || 'Label'}</p>
                          <p className="text-sm text-muted-foreground">{form.watch('name') || 'Nom'}</p>
                        </div>
                      </div>
                      
                      {/* Icon Grid */}
                      <div className="grid grid-cols-9 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                        {AVAILABLE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => handleIconSelect(icon)}
                            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                              selectedIcon === icon 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <DynamicIcon name={icon} className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="borderColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur de bordure</FormLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={field.value || defaultColors.border}
                          onChange={field.onChange}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={defaultColors.border}
                            className="flex-1 font-mono text-xs"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>Laissez vide pour utiliser la couleur par défaut</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headerBackgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur du bandeau</FormLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={field.value || defaultColors.header}
                          onChange={field.onChange}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={defaultColors.header}
                            className="flex-1 font-mono text-xs"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>Laissez vide pour utiliser la couleur par défaut</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
