import { useState, useRef, useEffect } from 'react';
import { Zone } from '@/types/equipment';
import { useDiagram } from '@/contexts/DiagramContext';
import { cn } from '@/lib/utils';
import { GripVertical, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ZoneComponentProps {
  zone: Zone;
  zoom: number;
  pan: { x: number; y: number };
  canvasRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  isGroupSelected?: boolean;
  onSelect: () => void;
  moveSelectedGroup?: (deltaX: number, deltaY: number) => void;
}

export const ZoneComponent = ({ zone, zoom, pan, canvasRef, isSelected, isGroupSelected, onSelect, moveSelectedGroup }: ZoneComponentProps) => {
  const { updateZone, removeZone } = useDiagram();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(zone.name);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, zoneX: 0, zoneY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, zoneX: 0, zoneY: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    
    if ((e.target as HTMLElement).classList.contains('zone-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        zoneX: zone.x,
        zoneY: zone.y,
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: zone.width,
      height: zone.height,
      zoneX: zone.x,
      zoneY: zone.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        if (isGroupSelected && moveSelectedGroup) {
          // Group drag: compute delta from last position
          const dx = (e.clientX - dragStart.x) / zoom;
          const dy = (e.clientY - dragStart.y) / zoom;
          if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            moveSelectedGroup(dx, dy);
            setDragStart(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
          }
        } else {
          const deltaX = (e.clientX - dragStart.x) / zoom;
          const deltaY = (e.clientY - dragStart.y) / zoom;
          updateZone(zone.id, {
            x: dragStart.zoneX + deltaX,
            y: dragStart.zoneY + deltaY,
          });
        }
      } else if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - resizeStart.x) / zoom;
        const deltaY = (e.clientY - resizeStart.y) / zoom;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.zoneX;
        let newY = resizeStart.zoneY;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(150, resizeStart.width + deltaX);
        }
        if (resizeHandle.includes('w')) {
          const potentialWidth = resizeStart.width - deltaX;
          newWidth = Math.max(150, potentialWidth);
          const actualWidthChange = resizeStart.width - newWidth;
          newX = resizeStart.zoneX + actualWidthChange;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(100, resizeStart.height + deltaY);
        }
        if (resizeHandle.includes('n')) {
          const potentialHeight = resizeStart.height - deltaY;
          newHeight = Math.max(100, potentialHeight);
          const actualHeightChange = resizeStart.height - newHeight;
          newY = resizeStart.zoneY + actualHeightChange;
        }

        updateZone(zone.id, { 
          width: newWidth, 
          height: newHeight,
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, resizeHandle, zone.id, updateZone, zoom]);

  const handleNameSave = () => {
    updateZone(zone.id, { name: editName });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(zone.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "absolute rounded-lg border-2 border-dashed transition-shadow",
        isSelected && "ring-2 ring-offset-2 ring-primary shadow-lg",
        isGroupSelected && "ring-2 ring-offset-2 ring-blue-500 shadow-lg"
      )}
      style={{
        left: zone.x,
        top: zone.y,
        width: zone.width,
        height: zone.height,
        borderColor: zone.color,
        backgroundColor: zone.backgroundColor || `${zone.color}15`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Zone header */}
      <div 
        className="zone-header absolute -top-8 left-0 flex items-center gap-1 cursor-move"
        style={{ color: zone.color }}
      >
        <GripVertical className="h-4 w-4 pointer-events-none" />
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            className="h-6 w-32 text-sm px-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className="text-sm font-semibold px-2 py-0.5 rounded pointer-events-none"
            style={{ backgroundColor: `${zone.color}20` }}
          >
            {zone.name}
          </span>
        )}
        
        {isSelected && !isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                removeZone(zone.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Resize handles */}
      {isSelected && (
        <>
          {/* Corners */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-sm cursor-nw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-sm cursor-ne-resize"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-sm cursor-sw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          
          {/* Edges */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/50 rounded-sm cursor-n-resize"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-primary/50 rounded-sm cursor-s-resize"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-primary/50 rounded-sm cursor-w-resize"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-primary/50 rounded-sm cursor-e-resize"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};
