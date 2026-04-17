import { useMemo } from 'react';
import { useDiagram } from '@/contexts/DiagramContext';
import { CanvasEquipment, CATEGORY_LABELS, EQUIPMENT_TYPE_LABELS } from '@/types/equipment';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EquipmentGroup {
  category: string;
  categoryLabel: string;
  items: CanvasEquipment[];
}

export const EquipmentTreeView = () => {
  const { currentDiagram, selectEquipment, selectedEquipment } = useDiagram();

  const groupedEquipment = useMemo(() => {
    if (!currentDiagram?.equipment?.length) return [];

    const groups: Record<string, CanvasEquipment[]> = {};
    
    currentDiagram.equipment.forEach((eq) => {
      const category = eq.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(eq);
    });

    return Object.entries(groups).map(([category, items]): EquipmentGroup => ({
      category,
      categoryLabel: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
      items: items.sort((a, b) => a.label.localeCompare(b.label)),
    })).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
  }, [currentDiagram?.equipment]);

  const totalCount = currentDiagram?.equipment?.length || 0;

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Layers className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Aucun équipement dans le schéma
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Glissez des équipements depuis la bibliothèque
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Équipements</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {totalCount} élément{totalCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groupedEquipment.map((group) => (
            <Collapsible key={group.category} defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group.categoryLabel}
                </span>
                <span className="text-xs text-muted-foreground/70 ml-auto">
                  {group.items.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-1 space-y-0.5">
                  {group.items.map((equipment) => (
                    <button
                      key={equipment.canvasId}
                      onClick={() => selectEquipment(equipment)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left",
                        "hover:bg-muted/50 transition-colors",
                        selectedEquipment?.canvasId === equipment.canvasId && "bg-primary/10 text-primary"
                      )}
                    >
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: equipment.headerBackgroundColor || '#f3f4f6',
                          borderColor: equipment.borderColor || '#e5e7eb',
                          borderWidth: 1,
                          borderStyle: 'solid'
                        }}
                      >
                        <DynamicIcon 
                          name={equipment.icon} 
                          className="h-3.5 w-3.5" 
                          style={{ color: equipment.borderColor || '#6b7280' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {equipment.label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {EQUIPMENT_TYPE_LABELS[equipment.type] || equipment.type}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
