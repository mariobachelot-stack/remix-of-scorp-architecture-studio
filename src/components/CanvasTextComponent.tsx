import { useState, useRef, useEffect } from 'react';
import { CanvasText } from '@/types/equipment';
import { cn } from '@/lib/utils';

interface CanvasTextComponentProps {
  text: CanvasText;
  zoom: number;
  isSelected: boolean;
  isGroupSelected?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasText>) => void;
  onRemove: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  pan: { x: number; y: number };
  moveSelectedGroup?: (dx: number, dy: number) => void;
}

export const CanvasTextComponent = ({
  text,
  zoom,
  isSelected,
  isGroupSelected,
  onSelect,
  onUpdate,
  onRemove,
  canvasRef,
  pan,
  moveSelectedGroup,
}: CanvasTextComponentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(text.content);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, textX: 0, textY: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastGroupDragRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Sync editContent when text.content changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditContent(text.content);
    }
  }, [text.content, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    if (!isEditing) {
      setIsDragging(true);
      if (isGroupSelected && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        lastGroupDragRef.current = {
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        };
      }
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        textX: text.x,
        textY: text.y,
      });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isGroupSelected && moveSelectedGroup && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        const dx = mouseX - lastGroupDragRef.current.x;
        const dy = mouseY - lastGroupDragRef.current.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          moveSelectedGroup(dx, dy);
          lastGroupDragRef.current = { x: mouseX, y: mouseY };
        }
      } else {
        const deltaX = (e.clientX - dragStart.x) / zoom;
        const deltaY = (e.clientY - dragStart.y) / zoom;
        onUpdate({
          x: dragStart.textX + deltaX,
          y: dragStart.textY + deltaY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate, isGroupSelected, moveSelectedGroup, canvasRef, pan]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editContent.trim() === '') {
      onRemove();
    } else {
      onUpdate({ content: editContent });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditContent(text.content);
      setIsEditing(false);
    }
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "absolute cursor-move select-none",
        isSelected && "ring-2 ring-primary ring-offset-1 rounded",
        isGroupSelected && "ring-2 ring-blue-500 ring-offset-1 rounded",
        isDragging && "opacity-80"
      )}
      style={{
        left: text.x,
        top: text.y,
        zIndex: isSelected ? 10 : 5,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent border border-primary/50 rounded px-1 py-0.5 outline-none resize-both min-w-[40px] min-h-[20px]"
          style={{
            fontFamily: text.fontFamily,
            fontSize: `${text.fontSize}px`,
            color: text.color,
            lineHeight: 1.4,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="whitespace-pre-wrap block px-1 py-0.5"
          style={{
            fontFamily: text.fontFamily,
            fontSize: `${text.fontSize}px`,
            color: text.color,
            lineHeight: 1.4,
          }}
        >
          {text.content}
        </span>
      )}
    </div>
  );
};
