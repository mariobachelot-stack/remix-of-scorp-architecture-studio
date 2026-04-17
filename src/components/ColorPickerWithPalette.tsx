import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useDiagram } from '@/contexts/DiagramContext';
import { cn } from '@/lib/utils';

interface ColorPickerWithPaletteProps {
  value: string;
  onChange: (color: string) => void;
  defaultColor?: string;
  onReset?: () => void;
  showReset?: boolean;
  placeholder?: string;
  className?: string;
}

export const ColorPickerWithPalette = ({
  value,
  onChange,
  defaultColor,
  onReset,
  showReset = true,
  placeholder = "#3b82f6",
  className,
}: ColorPickerWithPaletteProps) => {
  const { currentDiagram } = useDiagram();

  // Extract unique colors from the current diagram
  const usedColors = useMemo(() => {
    if (!currentDiagram) return [];
    
    const colors = new Set<string>();
    
    // Equipment colors
    currentDiagram.equipment.forEach(eq => {
      if (eq.borderColor) colors.add(eq.borderColor);
      if (eq.headerBackgroundColor) colors.add(eq.headerBackgroundColor);
    });
    
    // Connection colors
    currentDiagram.connections.forEach(conn => {
      if (conn.color) colors.add(conn.color);
    });
    
    // Zone colors
    currentDiagram.zones.forEach(zone => {
      if (zone.color) colors.add(zone.color);
      if (zone.backgroundColor) colors.add(zone.backgroundColor);
    });
    
    // Return unique colors, limited to 10
    return Array.from(colors).slice(0, 10);
  }, [currentDiagram]);

  const displayValue = value || defaultColor || '#000000';
  const hasCustomValue = value && value !== defaultColor;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main row: color picker + input + reset button */}
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-9 p-1 cursor-pointer"
        />
        <Input
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs"
          placeholder={placeholder}
        />
        {showReset && hasCustomValue && onReset && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onReset}
            title="Réinitialiser la couleur par défaut"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Used colors palette */}
      {usedColors.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">Récentes:</span>
            {usedColors.map((color, index) => (
              <Tooltip key={`${color}-${index}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange(color)}
                    style={{ backgroundColor: color }}
                    className={cn(
                      "w-5 h-5 rounded border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                      value === color && "ring-2 ring-primary ring-offset-1"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-xs">
                  {color}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
};
