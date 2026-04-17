import { useState, useRef } from 'react';
import { EquipmentLibrary } from '@/components/EquipmentLibrary';
import { DiagramCanvas } from '@/components/DiagramCanvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { EditorHeader } from '@/components/EditorHeader';
import { Equipment } from '@/types/equipment';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagramEditorProps {
  onBack: () => void;
}

export const DiagramEditor = ({ onBack }: DiagramEditorProps) => {
  const [draggingEquipment, setDraggingEquipment] = useState<Equipment | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorHeader onBack={onBack} canvasRef={canvasContainerRef} />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Equipment Library */}
        <div 
          className={cn(
            "bg-card border-r border-border flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
            leftPanelOpen ? "w-72" : "w-0"
          )}
        >
          {leftPanelOpen && <EquipmentLibrary onDragStart={setDraggingEquipment} />}
        </div>

        {/* Left Panel Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={cn(
                "absolute z-20 h-8 w-8 rounded-r-lg rounded-l-none",
                "bg-card border border-l-0 border-border shadow-sm",
                "hover:bg-secondary transition-all duration-300",
                leftPanelOpen ? "left-72" : "left-0"
              )}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              {leftPanelOpen ? (
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {leftPanelOpen ? "Masquer la bibliothèque" : "Afficher la bibliothèque"}
          </TooltipContent>
        </Tooltip>

        {/* Canvas */}
        <div className="flex-1 flex">
          <DiagramCanvas ref={canvasContainerRef} draggingEquipment={draggingEquipment} />
        </div>

        {/* Right Panel Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                "absolute z-20 h-8 w-8 rounded-l-lg rounded-r-none",
                "bg-card border border-r-0 border-border shadow-sm",
                "hover:bg-secondary transition-all duration-300",
                rightPanelOpen ? "right-80" : "right-0"
              )}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              {rightPanelOpen ? (
                <PanelRightClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {rightPanelOpen ? "Masquer les propriétés" : "Afficher les propriétés"}
          </TooltipContent>
        </Tooltip>

        {/* Right Panel - Properties */}
        <div 
          className={cn(
            "bg-card border-l border-border flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
            rightPanelOpen ? "w-80" : "w-0"
          )}
        >
          {rightPanelOpen && <PropertiesPanel />}
        </div>
      </div>
    </div>
  );
};