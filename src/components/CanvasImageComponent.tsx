import React, { useState, useRef, useCallback } from 'react';
import { CanvasImage } from '@/types/equipment';
import { cn } from '@/lib/utils';
import { Move, Trash2 } from 'lucide-react';

interface CanvasImageComponentProps {
  image: CanvasImage;
  zoom: number;
  isSelected: boolean;
  isGroupSelected?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasImage>) => void;
  onRemove: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  pan: { x: number; y: number };
  moveSelectedGroup?: (dx: number, dy: number) => void;
}

export const CanvasImageComponent: React.FC<CanvasImageComponentProps> = ({
  image,
  zoom,
  isSelected,
  isGroupSelected,
  onSelect,
  onUpdate,
  onRemove,
  canvasRef,
  pan,
  moveSelectedGroup,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const lastGroupDragRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    
    if (isGroupSelected) {
      lastGroupDragRef.current = { x: mouseX, y: mouseY };
    } else {
      setDragOffset({ x: mouseX - image.x, y: mouseY - image.y });
    }
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    onSelect();
    
    setIsResizing(corner);
    setInitialSize({ width: image.width, height: image.height });
    setInitialPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (isDragging) {
      if (isGroupSelected && moveSelectedGroup) {
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        const dx = mouseX - lastGroupDragRef.current.x;
        const dy = mouseY - lastGroupDragRef.current.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          moveSelectedGroup(dx, dy);
          lastGroupDragRef.current = { x: mouseX, y: mouseY };
        }
      } else {
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        onUpdate({
          x: mouseX - dragOffset.x,
          y: mouseY - dragOffset.y,
        });
      }
    } else if (isResizing) {
      const dx = (e.clientX - initialPos.x) / zoom;
      const dy = (e.clientY - initialPos.y) / zoom;
      
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;
      let newX = image.x;
      let newY = image.y;
      
      const aspectRatio = initialSize.width / initialSize.height;
      
      switch (isResizing) {
        case 'se':
          newWidth = Math.max(50, initialSize.width + dx);
          newHeight = newWidth / aspectRatio;
          break;
        case 'sw':
          newWidth = Math.max(50, initialSize.width - dx);
          newHeight = newWidth / aspectRatio;
          newX = image.x + (initialSize.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(50, initialSize.width + dx);
          newHeight = newWidth / aspectRatio;
          newY = image.y + (initialSize.height - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(50, initialSize.width - dx);
          newHeight = newWidth / aspectRatio;
          newX = image.x + (initialSize.width - newWidth);
          newY = image.y + (initialSize.height - newHeight);
          break;
      }
      
      onUpdate({ width: newWidth, height: newHeight, x: newX, y: newY });
    }
  }, [isDragging, isResizing, canvasRef, pan, zoom, dragOffset, initialPos, initialSize, image, onUpdate, isGroupSelected, moveSelectedGroup]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={imageRef}
      className={cn(
        "absolute select-none group",
        "rounded-lg overflow-hidden",
        "transition-shadow duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isGroupSelected && "ring-2 ring-blue-500 ring-offset-2",
        isDragging && "cursor-grabbing",
        !isDragging && "cursor-grab"
      )}
      style={{
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
      }}
      onMouseDown={handleMouseDown}
    >
      <img
        src={image.url}
        alt={image.name || 'Image'}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {/* Delete button */}
      {isSelected && (
        <button
          className="absolute -top-3 -right-3 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Supprimer l'image"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      
      {/* Move indicator */}
      {isSelected && (
        <div className="absolute top-1 left-1 w-5 h-5 bg-card/80 rounded flex items-center justify-center">
          <Move className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      
      {/* Resize handles */}
      {isSelected && (
        <>
          <div
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-nw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-ne-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-sw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-se-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
        </>
      )}
    </div>
  );
};
