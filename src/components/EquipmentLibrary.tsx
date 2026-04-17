import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ProtocolBadge } from '@/components/ProtocolBadge';
import { useDiagram } from '@/contexts/DiagramContext';
import { EquipmentFormDialog } from '@/components/admin/EquipmentFormDialog';
import { EquipmentLibraryItem } from '@/hooks/useEquipmentLibrary';
import { 
  Equipment, 
  EquipmentCategory, 
  CATEGORY_LABELS,
  EQUIPMENT_TYPE_LABELS 
} from '@/types/equipment';
import { Search, ChevronDown, ChevronRight, GripVertical, Plus, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EquipmentLibraryProps {
  onDragStart: (equipment: Equipment) => void;
}

export const EquipmentLibrary = ({ onDragStart }: EquipmentLibraryProps) => {
  const { equipmentLibrary } = useDiagram();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<EquipmentCategory>>(
    new Set(['hvac', 'scorp-io'])
  );
  const [isEquipmentFormOpen, setIsEquipmentFormOpen] = useState(false);

  const filteredEquipment = equipmentLibrary.filter(eq => 
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedEquipment = filteredEquipment.reduce((acc, eq) => {
    if (!acc[eq.category]) {
      acc[eq.category] = [];
    }
    acc[eq.category].push(eq);
    return acc;
  }, {} as Record<EquipmentCategory, Equipment[]>);

  const toggleCategory = (category: EquipmentCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, equipment: Equipment) => {
    e.dataTransfer.setData('application/json', JSON.stringify(equipment));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(equipment);
  };

  const categories: EquipmentCategory[] = ['hvac', 'lighting', 'metering', 'interface', 'scorp-io', 'saved-model'];

  return (
    <div className="w-full bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Bibliothèque d'équipements
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEquipmentFormOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Créer un nouvel équipement</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {categories.map(category => {
            const items = groupedEquipment[category];
            if (!items || items.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategory(category)}
                  className="w-full justify-start px-2 h-8 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </Button>

                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {items.map(equipment => {
                      const eqItem = equipment as unknown as EquipmentLibraryItem;
                      const isGlobal = !eqItem.organization_id;
                      return (
                        <div
                          key={equipment.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, equipment)}
                          className={cn(
                            "group flex items-start gap-3 p-2.5 rounded-lg cursor-grab",
                            "bg-secondary/50 hover:bg-secondary border border-transparent",
                            "hover:border-border hover:shadow-equipment transition-all duration-200",
                            "active:cursor-grabbing active:shadow-equipment-hover"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ 
                                backgroundColor: equipment.headerBackgroundColor || (
                                  equipment.type === 'cloud' ? '#a78bfa' :
                                  equipment.type === 'interface' ? '#2dd4bf' :
                                  equipment.type === 'automate' ? '#3b82f6' :
                                  '#e2e8f0'
                                )
                              }}
                            >
                              <DynamicIcon 
                                name={equipment.icon} 
                                className="h-4.5 w-4.5 text-white"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground truncate">
                                {equipment.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {EQUIPMENT_TYPE_LABELS[equipment.type]}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {equipment.name}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <ProtocolBadge protocol={equipment.protocol} />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {isGlobal ? (
                                    <Globe className="h-3 w-3 text-muted-foreground/60" />
                                  ) : (
                                    <Building2 className="h-3 w-3 text-primary/60" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {isGlobal ? 'Élément global' : 'Élément de votre organisation'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Equipment creation dialog */}
      <EquipmentFormDialog
        open={isEquipmentFormOpen}
        onOpenChange={setIsEquipmentFormOpen}
        editingId={null}
      />
    </div>
  );
};
