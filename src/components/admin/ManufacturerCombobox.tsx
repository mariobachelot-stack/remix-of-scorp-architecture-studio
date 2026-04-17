import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useManufacturers } from '@/hooks/useManufacturers';
import { EquipmentType } from '@/types/equipment';
import { toast } from 'sonner';

interface ManufacturerComboboxProps {
  equipmentType: EquipmentType;
  value: string | undefined;
  onChange: (manufacturerId: string | undefined) => void;
}

export function ManufacturerCombobox({ equipmentType, value, onChange }: ManufacturerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { manufacturers, createManufacturer, isLoading } = useManufacturers(equipmentType);

  const selectedManufacturer = manufacturers.find((m) => m.id === value);

  // Reset selection when equipment type changes
  useEffect(() => {
    if (value && !manufacturers.find((m) => m.id === value)) {
      onChange(undefined);
    }
  }, [equipmentType, manufacturers, value, onChange]);

  const handleCreateNew = async () => {
    if (!searchValue.trim()) return;
    
    try {
      const result = await createManufacturer.mutateAsync({
        name: searchValue.trim(),
        equipmentType,
      });
      onChange(result.id);
      setOpen(false);
      setSearchValue('');
      toast.success(`Constructeur "${searchValue.trim()}" créé`);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ce constructeur existe déjà');
      } else {
        toast.error('Erreur lors de la création');
      }
    }
  };

  const showCreateOption = searchValue.trim() && 
    !manufacturers.some(m => m.name.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedManufacturer?.name || "Sélectionner un constructeur..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Rechercher ou créer..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                "Chargement..."
              ) : showCreateOption ? (
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                >
                  <Plus className="h-4 w-4" />
                  Créer "{searchValue.trim()}"
                </button>
              ) : (
                "Aucun constructeur trouvé"
              )}
            </CommandEmpty>
            <CommandGroup>
              {manufacturers.map((manufacturer) => (
                <CommandItem
                  key={manufacturer.id}
                  value={manufacturer.name}
                  onSelect={() => {
                    onChange(manufacturer.id === value ? undefined : manufacturer.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === manufacturer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {manufacturer.name}
                </CommandItem>
              ))}
              {showCreateOption && manufacturers.length > 0 && (
                <CommandItem
                  value={`create-${searchValue}`}
                  onSelect={handleCreateNew}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer "{searchValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
