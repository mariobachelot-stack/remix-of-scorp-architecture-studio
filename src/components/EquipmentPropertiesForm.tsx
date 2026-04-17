import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ColorPickerWithPalette } from '@/components/ColorPickerWithPalette';
import { useDiagram } from '@/contexts/DiagramContext';
import { useManufacturers } from '@/hooks/useManufacturers';
import { useProductReferences } from '@/hooks/useProductReferences';
import { 
  Protocol, 
  EquipmentType,
  CanvasEquipment,
  PROTOCOL_LABELS, 
  EQUIPMENT_TYPE_LABELS,
  FontSizePreset,
  FONT_SIZE_LABELS,
  CommCardPosition,
  COMM_CARD_POSITION_LABELS,
  LOCATION_PRESETS,
} from '@/types/equipment';
import { Switch } from '@/components/ui/switch';
import { X, Link2, Trash2, Check, ChevronsUpDown, Plus, RotateCcw, Maximize, Save, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';

// Available icons for equipment
const AVAILABLE_ICONS = [
  'Box', 'Flame', 'Snowflake', 'Wind', 'AirVent', 'Thermometer', 'Fan', 
  'Gauge', 'Smartphone', 'Cpu', 'Lightbulb', 'Activity', 'ArrowLeftRight', 
  'Cloud', 'Server', 'Router', 'Wifi', 'Plug', 'Zap', 'Battery',
  'Monitor', 'Tv', 'Radio', 'Speaker', 'Mic', 'Camera', 'Printer'
];

// Default colors based on equipment type
const getDefaultBorderColor = (type: EquipmentType): string => {
  switch (type) {
    case 'cloud': return '#7c3aed';
    case 'interface': return '#0d9488';
    case 'automate': return '#1d4ed8';
    default: return '#cbd5e1';
  }
};

const getDefaultHeaderColor = (type: EquipmentType): string => {
  switch (type) {
    case 'cloud': return '#a78bfa';
    case 'interface': return '#2dd4bf';
    case 'automate': return '#3b82f6';
    default: return '#e2e8f0';
  }
};

interface EquipmentPropertiesFormProps {
  equipment: CanvasEquipment & { manufacturerId?: string };
  onClose: () => void;
}

export const EquipmentPropertiesForm = ({ equipment, onClose }: EquipmentPropertiesFormProps) => {
  const { 
    updateEquipmentDetails,
    removeEquipmentFromCanvas,
    startConnection,
    expertMode,
  } = useDiagram();

  // Icon selector state
  const [iconOpen, setIconOpen] = useState(false);

  // Save as model
  const { createEquipment, isCreating: isSavingModel } = useEquipmentLibrary();

  const handleSaveAsModel = () => {
    createEquipment({
      label: equipment.label,
      name: equipment.name,
      type: equipment.type,
      category: 'saved-model',
      protocol: equipment.protocol,
      icon: equipment.icon,
      description: equipment.description,
      reference: equipment.reference,
      borderColor: equipment.borderColor,
      headerBackgroundColor: equipment.headerBackgroundColor,
    });
  };

  // Manufacturer state
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string | undefined>(
    equipment.manufacturerId
  );
  
  const { manufacturers, createManufacturer, isLoading: manufacturersLoading } = useManufacturers(equipment.type);

  // Reference state
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  
  const { references, createReference, isLoading: referencesLoading } = useProductReferences(
    selectedManufacturerId, 
    equipment.type
  );

  // Update selected manufacturer when equipment changes
  useEffect(() => {
    setSelectedManufacturerId(equipment.manufacturerId);
  }, [equipment.manufacturerId]);

  // Reset manufacturer selection when equipment type changes
  // Guard: only act once manufacturers have fully loaded for the current type
  const prevTypeRef = useRef(equipment.type);
  useEffect(() => {
    // Only reset if the equipment type actually changed (not on initial mount or re-render)
    if (prevTypeRef.current !== equipment.type) {
      prevTypeRef.current = equipment.type;
      if (selectedManufacturerId && !manufacturersLoading && manufacturers.length > 0) {
        const manufacturerExists = manufacturers.some(m => m.id === selectedManufacturerId);
        if (!manufacturerExists) {
          setSelectedManufacturerId(undefined);
          updateEquipmentDetails(equipment.canvasId, { 
            manufacturerId: undefined,
            reference: undefined 
          });
        }
      }
    }
  }, [equipment.type, manufacturers, manufacturersLoading]);

  const selectedManufacturer = manufacturers.find(m => m.id === selectedManufacturerId);

  const filteredManufacturers = manufacturers.filter(m => 
    m.name.toLowerCase().includes(manufacturerSearch.toLowerCase())
  );

  const showCreateManufacturer = manufacturerSearch.trim() && 
    !manufacturers.some(m => m.name.toLowerCase() === manufacturerSearch.toLowerCase());

  const handleManufacturerSelect = async (manufacturerId: string | '__create_new__') => {
    if (manufacturerId === '__create_new__') {
      try {
        const result = await createManufacturer.mutateAsync({
          name: manufacturerSearch.trim(),
          equipmentType: equipment.type,
        });
        setSelectedManufacturerId(result.id);
        updateEquipmentDetails(equipment.canvasId, { 
          manufacturerId: result.id,
          reference: undefined // Reset reference when manufacturer changes
        });
        toast.success(`Constructeur "${manufacturerSearch.trim()}" créé`);
      } catch (error: any) {
        if (error.code === '23505') {
          toast.error('Ce constructeur existe déjà');
        } else {
          toast.error('Erreur lors de la création');
        }
      }
    } else {
      setSelectedManufacturerId(manufacturerId);
      updateEquipmentDetails(equipment.canvasId, { 
        manufacturerId,
        reference: undefined // Reset reference when manufacturer changes
      });
    }
    setManufacturerOpen(false);
    setManufacturerSearch('');
  };

  const filteredReferences = references.filter(ref => 
    ref.reference.toLowerCase().includes(referenceSearch.toLowerCase())
  );

  const showCreateReference = referenceSearch.trim() && 
    selectedManufacturerId &&
    !references.some(r => r.reference.toLowerCase() === referenceSearch.toLowerCase());

  const handleReferenceSelect = async (value: string) => {
    if (value === '__create_new__' && selectedManufacturerId) {
      try {
        const result = await createReference.mutateAsync({
          reference: referenceSearch.trim(),
          manufacturerId: selectedManufacturerId,
          equipmentType: equipment.type,
        });
        updateEquipmentDetails(equipment.canvasId, { reference: result.reference });
        toast.success(`Référence "${referenceSearch.trim()}" créée`);
      } catch (error: any) {
        if (error.code === '23505') {
          toast.error('Cette référence existe déjà');
        } else {
          toast.error('Erreur lors de la création');
        }
      }
    } else if (value === '__clear__') {
      updateEquipmentDetails(equipment.canvasId, { reference: undefined });
    } else {
      updateEquipmentDetails(equipment.canvasId, { reference: value });
    }
    setReferenceOpen(false);
    setReferenceSearch('');
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            equipment.type === 'cloud' && "bg-purple-100",
            equipment.type === 'interface' && "bg-teal-100",
            equipment.type === 'automate' && "bg-blue-100",
            equipment.type === 'terminal' && "bg-slate-100"
          )}>
            <DynamicIcon 
              name={equipment.icon} 
              className={cn(
                "h-5 w-5",
                equipment.type === 'cloud' && "text-purple-600",
                equipment.type === 'interface' && "text-teal-600",
                equipment.type === 'automate' && "text-blue-600",
                equipment.type === 'terminal' && "text-slate-600"
              )} 
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {equipment.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {EQUIPMENT_TYPE_LABELS[equipment.type]}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-auto">
        <div className="space-y-2">
          <Label htmlFor="eq-label">Label</Label>
          <Input
            id="eq-label"
            value={equipment.label}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-name">Nom complet</Label>
          <Input
            id="eq-name"
            value={equipment.name}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Type d'équipement</Label>
          <Select
            value={equipment.type}
            onValueChange={(value: EquipmentType) => 
              updateEquipmentDetails(equipment.canvasId, { type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EQUIPMENT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Icon selector */}
        <div className="space-y-2">
          <Label>Icône</Label>
          <Popover open={iconOpen} onOpenChange={setIconOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <DynamicIcon name={equipment.icon} className="h-4 w-4" />
                  <span>{equipment.icon}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" align="start">
              <ScrollArea className="h-48">
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        updateEquipmentDetails(equipment.canvasId, { icon });
                        setIconOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-md transition-colors",
                        equipment.icon === icon 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                      title={icon}
                    >
                      <DynamicIcon name={icon} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Manufacturer field */}
        <div className="space-y-2">
          <Label>Constructeur</Label>
          <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={manufacturerOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  !selectedManufacturer && "text-muted-foreground"
                )}
              >
                {selectedManufacturer?.name || "Sélectionner ou créer..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Rechercher ou créer..." 
                  value={manufacturerSearch}
                  onValueChange={setManufacturerSearch}
                />
                <CommandList>
                  {manufacturersLoading ? (
                    <CommandEmpty>Chargement...</CommandEmpty>
                  ) : (
                    <>
                      {filteredManufacturers.length === 0 && !showCreateManufacturer && (
                        <CommandEmpty>Aucun constructeur trouvé</CommandEmpty>
                      )}
                      {showCreateManufacturer && (
                        <CommandGroup heading="Nouveau constructeur">
                          <CommandItem
                            value="__create_new__"
                            onSelect={() => handleManufacturerSelect('__create_new__')}
                            className="text-primary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Créer "{manufacturerSearch}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                      <CommandGroup heading="Constructeurs existants">
                        <CommandItem
                          value="__clear__"
                          onSelect={() => {
                            setSelectedManufacturerId(undefined);
                            updateEquipmentDetails(equipment.canvasId, { 
                              manufacturerId: undefined,
                              reference: undefined 
                            });
                            setManufacturerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedManufacturerId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">Aucun constructeur</span>
                        </CommandItem>
                        {filteredManufacturers.map((manufacturer) => (
                          <CommandItem
                            key={manufacturer.id}
                            value={manufacturer.name}
                            onSelect={() => handleManufacturerSelect(manufacturer.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedManufacturerId === manufacturer.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {manufacturer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Reference field - depends on manufacturer */}
        <div className="space-y-2">
          <Label>Référence</Label>
          <Popover open={referenceOpen} onOpenChange={setReferenceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={referenceOpen}
                disabled={!selectedManufacturerId}
                className={cn(
                  "w-full justify-between font-normal",
                  !equipment.reference && "text-muted-foreground"
                )}
              >
                {!selectedManufacturerId 
                  ? "Sélectionnez d'abord un constructeur"
                  : equipment.reference || "Sélectionner ou créer..."
                }
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Rechercher ou créer..." 
                  value={referenceSearch}
                  onValueChange={setReferenceSearch}
                />
                <CommandList>
                  {referencesLoading ? (
                    <CommandEmpty>Chargement...</CommandEmpty>
                  ) : (
                    <>
                      {filteredReferences.length === 0 && !showCreateReference && (
                        <CommandEmpty>Aucune référence trouvée</CommandEmpty>
                      )}
                      {showCreateReference && (
                        <CommandGroup heading="Nouvelle référence">
                          <CommandItem
                            value="__create_new__"
                            onSelect={() => handleReferenceSelect('__create_new__')}
                            className="text-primary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Créer "{referenceSearch}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                      <CommandGroup heading="Références existantes">
                        <CommandItem
                          value="__clear__"
                          onSelect={() => handleReferenceSelect('__clear__')}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !equipment.reference ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">Aucune référence</span>
                        </CommandItem>
                        {filteredReferences.map((ref) => (
                          <CommandItem
                            key={ref.id}
                            value={ref.reference}
                            onSelect={() => handleReferenceSelect(ref.reference)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                equipment.reference === ref.reference
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">{ref.reference}</span>
                              {ref.description && (
                                <span className="text-xs text-muted-foreground">{ref.description}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Protocole</Label>
          <Select
            value={equipment.protocol}
            onValueChange={(value: Protocol) => 
              updateEquipmentDetails(equipment.canvasId, { protocol: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROTOCOL_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Communication card / gateway */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="eq-commcard" className="text-sm font-medium">Passerelle de communication</Label>
            <Switch
              id="eq-commcard"
              checked={equipment.hasCommCard || false}
              onCheckedChange={(checked) => {
                const updates: Partial<CanvasEquipment> = { hasCommCard: checked };
                if (checked && !equipment.commCardProtocol) {
                  updates.commCardProtocol = 'modbus-tcp';
                  updates.commCardLabel = 'Carte Modbus TCP';
                }
                if (!checked) {
                  updates.commCardProtocol = undefined;
                  updates.commCardLabel = undefined;
                }
                updateEquipmentDetails(equipment.canvasId, updates);
              }}
            />
          </div>
          {equipment.hasCommCard && (
            <div className="space-y-2 pl-1 border-l-2 border-orange-300 ml-1">
              <div className="space-y-1 pl-3">
                <Label className="text-xs text-muted-foreground">Position</Label>
                <Select
                  value={equipment.commCardPosition || 'right'}
                  onValueChange={(value: CommCardPosition) => {
                    updateEquipmentDetails(equipment.canvasId, { commCardPosition: value });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMM_CARD_POSITION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 pl-3">
                <Label className="text-xs text-muted-foreground">Protocole de la carte</Label>
                <Select
                  value={equipment.commCardProtocol || 'modbus-tcp'}
                  onValueChange={(value: Protocol) => {
                    updateEquipmentDetails(equipment.canvasId, { 
                      commCardProtocol: value,
                      commCardLabel: `Carte ${PROTOCOL_LABELS[value]}`,
                    });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROTOCOL_LABELS).filter(([key]) => key !== 'none').map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 pl-3">
                <Label className="text-xs text-muted-foreground">Label de la carte</Label>
                <Input
                  value={equipment.commCardLabel || ''}
                  onChange={(e) => updateEquipmentDetails(equipment.canvasId, { commCardLabel: e.target.value })}
                  placeholder="Carte Modbus TCP"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Location indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="eq-location" className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Localisation
            </Label>
            <Switch
              id="eq-location-toggle"
              checked={equipment.showLocation || false}
              onCheckedChange={(checked) => {
                const updates: Partial<CanvasEquipment> = { showLocation: checked };
                if (checked && !equipment.location) {
                  updates.location = 'RDC';
                }
                updateEquipmentDetails(equipment.canvasId, updates);
              }}
            />
          </div>
          {equipment.showLocation && (
            <div className="space-y-2 pl-1 border-l-2 border-emerald-400 ml-1">
              <div className="space-y-1 pl-3">
                <Label className="text-xs text-muted-foreground">Étage / Emplacement</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal h-8 text-sm"
                    >
                      {equipment.location || 'Sélectionner...'}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher ou saisir..." />
                      <CommandList>
                        <CommandEmpty>
                          <span className="text-xs text-muted-foreground">Tapez pour définir un emplacement personnalisé</span>
                        </CommandEmpty>
                        <CommandGroup>
                          {LOCATION_PRESETS.map((loc) => (
                            <CommandItem
                              key={loc}
                              value={loc}
                              onSelect={() => updateEquipmentDetails(equipment.canvasId, { location: loc })}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  equipment.location === loc ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {loc}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  value={equipment.location || ''}
                  onChange={(e) => updateEquipmentDetails(equipment.canvasId, { location: e.target.value })}
                  placeholder="Saisie libre..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="eq-ip">Adresse IP</Label>
          <Input
            id="eq-ip"
            value={equipment.ipAddress || ''}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { ipAddress: e.target.value })}
            placeholder="192.168.1.x"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-slave">Numéro d'esclave</Label>
          <Input
            id="eq-slave"
            type="number"
            value={equipment.slaveNumber || ''}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { 
              slaveNumber: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            placeholder="1-247"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-quantity">Quantité</Label>
          <Input
            id="eq-quantity"
            type="number"
            min="1"
            value={equipment.quantity || ''}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { 
              quantity: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            placeholder="Ex: 3"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-desc">Description</Label>
          <Input
            id="eq-desc"
            value={equipment.description || ''}
            onChange={(e) => updateEquipmentDetails(equipment.canvasId, { description: e.target.value })}
            placeholder="Notes techniques..."
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Couleur de bordure</Label>
          <ColorPickerWithPalette
            value={equipment.borderColor || getDefaultBorderColor(equipment.type)}
            onChange={(color) => updateEquipmentDetails(equipment.canvasId, { borderColor: color })}
            defaultColor={getDefaultBorderColor(equipment.type)}
            onReset={() => updateEquipmentDetails(equipment.canvasId, { borderColor: undefined })}
            showReset={!!equipment.borderColor}
            placeholder="#1d4ed8"
          />
        </div>

        <div className="space-y-2">
          <Label>Couleur de fond du bandeau</Label>
          <ColorPickerWithPalette
            value={equipment.headerBackgroundColor || getDefaultHeaderColor(equipment.type)}
            onChange={(color) => updateEquipmentDetails(equipment.canvasId, { headerBackgroundColor: color })}
            defaultColor={getDefaultHeaderColor(equipment.type)}
            onReset={() => updateEquipmentDetails(equipment.canvasId, { headerBackgroundColor: undefined })}
            showReset={!!equipment.headerBackgroundColor}
            placeholder="#3b82f6"
          />
        </div>

        <Separator />

        {/* Appearance Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Apparence de la carte</Label>
          
          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Taille de police</Label>
            <Select
              value={equipment.fontSize || 'medium'}
              onValueChange={(value: FontSizePreset) => 
                updateEquipmentDetails(equipment.canvasId, { fontSize: value })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(FONT_SIZE_LABELS) as [FontSizePreset, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Largeur{expertMode ? ' (expert)' : ''}: {(expertMode ? equipment.customExpertWidth : equipment.customWidth) ?? 'auto'}px
              </Label>
              {(expertMode ? equipment.customExpertWidth : equipment.customWidth) !== undefined && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateEquipmentDetails(equipment.canvasId, expertMode ? { customExpertWidth: undefined } : { customWidth: undefined })}
                  title="Réinitialiser (utiliser valeur globale)"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Slider
              value={[(expertMode ? equipment.customExpertWidth : equipment.customWidth) ?? 160]}
              min={80}
              max={370}
              step={5}
              onValueChange={([value]) => updateEquipmentDetails(equipment.canvasId, expertMode ? { customExpertWidth: value } : { customWidth: value })}
              className="w-full"
            />
          </div>

          {/* Custom Height */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Hauteur{expertMode ? ' (expert)' : ''}: {(expertMode ? equipment.customExpertHeight : equipment.customHeight) ?? 'auto'}px
              </Label>
              {(expertMode ? equipment.customExpertHeight : equipment.customHeight) !== undefined && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateEquipmentDetails(equipment.canvasId, expertMode ? { customExpertHeight: undefined } : { customHeight: undefined })}
                  title="Réinitialiser (utiliser valeur globale)"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Slider
              value={[(expertMode ? equipment.customExpertHeight : equipment.customHeight) ?? 90]}
              min={60}
              max={440}
              step={5}
              onValueChange={([value]) => updateEquipmentDetails(equipment.canvasId, expertMode ? { customExpertHeight: value } : { customHeight: value })}
              className="w-full"
            />
          </div>

          {/* Auto-fit Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              // Estimate text dimensions for auto-fit
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              // Measure label text
              ctx.font = 'bold 12px system-ui';
              const labelWidth = ctx.measureText(equipment.label).width;
              
              // Measure name text  
              ctx.font = '11px system-ui';
              const nameWidth = ctx.measureText(equipment.name).width;

              // Calculate optimal dimensions
              const iconSize = 40;
              const padding = 16;
              const gap = 8;
              const lineHeight = 18;
              
              // Width: icon + gap + max text width + padding
              const textWidth = Math.max(labelWidth, nameWidth);
              const optimalWidth = Math.max(120, Math.ceil(iconSize + gap + textWidth + padding * 2));

              if (expertMode) {
                // Expert mode: taller cards with more info lines (manufacturer, protocol, IP, etc.)
                const expertLinesCount = 5; // label + name + manufacturer + protocol + IP
                const expertOptimalHeight = Math.max(120, Math.ceil(padding * 2 + iconSize + expertLinesCount * lineHeight));
                updateEquipmentDetails(equipment.canvasId, { 
                  customExpertWidth: Math.min(370, optimalWidth),
                  customExpertHeight: Math.min(440, expertOptimalHeight)
                });
              } else {
                // Normal mode: compact cards
                const linesCount = 2; // label + name minimum
                const optimalHeight = Math.max(70, Math.ceil(padding * 2 + Math.max(iconSize, linesCount * lineHeight)));
                updateEquipmentDetails(equipment.canvasId, { 
                  customWidth: Math.min(300, optimalWidth),
                  customHeight: Math.min(200, optimalHeight)
                });
              }
              
              toast.success(`Dimensions ajustées (${expertMode ? 'mode expert' : 'mode normal'})`);
            }}
          >
            <Maximize className="h-4 w-4 mr-2" />
            Ajuster au contenu{expertMode ? ' (expert)' : ''}
          </Button>
        </div>

        <Separator />

        <Button
          variant="outline"
          size="sm"
          onClick={() => startConnection(equipment.canvasId)}
          className="w-full"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Créer une connexion
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveAsModel}
          disabled={isSavingModel}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSavingModel ? 'Enregistrement...' : 'Enregistrer comme modèle'}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => removeEquipmentFromCanvas(equipment.canvasId)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
      </div>
    </div>
  );
};