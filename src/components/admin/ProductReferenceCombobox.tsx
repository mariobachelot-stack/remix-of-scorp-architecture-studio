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
import { useProductReferences } from '@/hooks/useProductReferences';
import { EquipmentType } from '@/types/equipment';
import { toast } from 'sonner';

interface ProductReferenceComboboxProps {
  manufacturerId: string | undefined;
  equipmentType: EquipmentType;
  value: string | undefined;
  onChange: (reference: string | undefined) => void;
}

export function ProductReferenceCombobox({ 
  manufacturerId, 
  equipmentType, 
  value, 
  onChange 
}: ProductReferenceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { references, createReference, isLoading } = useProductReferences(manufacturerId, equipmentType);

  const selectedReference = references.find((r) => r.reference === value);

  // Reset selection when manufacturer changes
  useEffect(() => {
    if (value && !references.find((r) => r.reference === value)) {
      onChange(undefined);
    }
  }, [manufacturerId, references, value, onChange]);

  const handleCreateNew = async () => {
    if (!searchValue.trim() || !manufacturerId) return;
    
    try {
      const result = await createReference.mutateAsync({
        reference: searchValue.trim(),
        manufacturerId,
        equipmentType,
      });
      onChange(result.reference);
      setOpen(false);
      setSearchValue('');
      toast.success(`Référence "${searchValue.trim()}" créée`);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Cette référence existe déjà');
      } else {
        toast.error('Erreur lors de la création');
      }
    }
  };

  const showCreateOption = searchValue.trim() && 
    manufacturerId &&
    !references.some(r => r.reference.toLowerCase() === searchValue.toLowerCase());

  if (!manufacturerId) {
    return (
      <Button
        variant="outline"
        className="w-full justify-between"
        disabled
      >
        Sélectionnez d'abord un constructeur
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedReference?.reference || value || "Sélectionner une référence..."}
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
                "Aucune référence trouvée"
              )}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">Aucune référence</span>
              </CommandItem>
              {references.map((ref) => (
                <CommandItem
                  key={ref.id}
                  value={ref.reference}
                  onSelect={() => {
                    onChange(ref.reference === value ? undefined : ref.reference);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === ref.reference ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-mono">{ref.reference}</span>
                    {ref.description && (
                      <span className="text-xs text-muted-foreground">{ref.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {showCreateOption && references.length > 0 && (
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
