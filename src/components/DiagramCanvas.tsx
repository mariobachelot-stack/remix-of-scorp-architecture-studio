import React, { useRef, useCallback, useState, useEffect, useImperativeHandle } from 'react';
import { useDiagram } from '@/contexts/DiagramContext';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ProtocolBadge } from '@/components/ProtocolBadge';
import { ZoneComponent } from '@/components/ZoneComponent';
import { CanvasImageComponent } from '@/components/CanvasImageComponent';
import { CanvasTextComponent } from '@/components/CanvasTextComponent';
import { Equipment, Protocol, PROTOCOL_COLORS, CanvasEquipment, EQUIPMENT_TYPE_LABELS, CATEGORY_LABELS, ConnectionPathType, ControlPoint, Connection, DEFAULT_DIAGRAM_SETTINGS, DEFAULT_NON_EXPERT_SETTINGS, DEFAULT_EXPERT_SETTINGS, ModeSettings, FONT_SIZE_VALUES, PROTOCOL_LABELS, CommCardPosition, getProtocolColor } from '@/types/equipment';
import { computeAutoCardHeight } from '@/lib/cardUtils';
import { useManufacturers } from '@/hooks/useManufacturers';
import { cn } from '@/lib/utils';
import { getConnectionEndpoints, getOrthogonalPath, getHandlePosition, getCommCardBounds, getPointOnPath, getPerpendicularOffset, projectMouseOnPath } from '@/lib/connectionUtils';
import type { HandleSide } from '@/types/equipment';
import { ZoomIn, ZoomOut, Maximize2, Link, Factory, SquareDashed, Eye, EyeOff, Minus, Spline, CornerDownRight, Plus, Pencil, MoveHorizontal, RectangleHorizontal, RectangleVertical, Grid3X3, ImagePlus, Palette, X, RotateCcw, Undo2, Redo2, Type, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagramCanvasProps {
  draggingEquipment: Equipment | null;
}

export const DiagramCanvas = React.forwardRef<HTMLDivElement, DiagramCanvasProps>(({ draggingEquipment }, forwardedRef) => {
  // Debug: track settings issues that can make nodes disappear (e.g., NaN width)
  const DEBUG_CANVAS = false;

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose the outer overflow-hidden container to parent (for export/screenshot)
  useImperativeHandle(forwardedRef, () => containerRef.current as HTMLDivElement);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 });
  
  const [showGrid, setShowGrid] = useState(true);
  const [showProtocolColors, setShowProtocolColors] = useState(false);
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const shiftHeldRef = useRef(false);

  // Editable connection name state
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editingConnectionName, setEditingConnectionName] = useState('');

  // Control point dragging state
  const [draggingControlPoint, setDraggingControlPoint] = useState<{ connectionId: string; pointId: string } | null>(null);

  // Secure icon dragging state
  const [draggingSecureIcon, setDraggingSecureIcon] = useState<string | null>(null);

  // Label dragging state
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);

  // Connection drag state for creating new connections
  const [draggingConnection, setDraggingConnection] = useState<{
    sourceId: string;
    sourceHandle: HandleSide;
    sourceFromCommCard?: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  

  const {
    currentDiagram,
    selectedEquipment,
    selectedZone,
    isConnecting,
    connectionSource,
    addEquipmentToCanvas,
    updateEquipmentPosition,
    removeEquipmentFromCanvas,
    selectEquipment,
    selectConnection,
    completeConnection,
    cancelConnection,
    startConnection,
    updateConnection,
    removeConnection,
    selectedConnection,
    addZone,
    selectZone,
    removeZone,
    updateDiagramSettings,
    addImage,
    updateImage,
    removeImage,
    selectImage,
    selectedImage,
    addText,
    updateText,
    removeText,
    selectText,
    selectedText,
    copySelection,
    pasteClipboard,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedCanvasIds,
    setSelectedCanvasIds,
    moveSelectedGroup,
    expertMode,
    setExpertMode,
  } = useDiagram();

  // Image file input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Get settings from diagram with safe defaults and clamping
  const rawStrokeWidth = currentDiagram?.settings?.connectionStrokeWidth;

  const toFiniteNumber = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };

  const strokeWidth = Math.max(
    0.5,
    Math.min(3, toFiniteNumber(rawStrokeWidth, DEFAULT_DIAGRAM_SETTINGS.connectionStrokeWidth))
  );

  // Get mode-specific settings
  const nonExpertSettings = currentDiagram?.settings?.nonExpertSettings || DEFAULT_NON_EXPERT_SETTINGS;
  const expertSettings = currentDiagram?.settings?.expertSettings || DEFAULT_EXPERT_SETTINGS;

  // Mode-specific ranges
  const NON_EXPERT_WIDTH_RANGE = { min: 120, max: 370 };
  const NON_EXPERT_HEIGHT_RANGE = { min: 70, max: 160 };
  const EXPERT_WIDTH_RANGE = { min: 10, max: 370 };
  const EXPERT_HEIGHT_RANGE = { min: 70, max: 440 };

  // Get current mode settings and ranges
  const currentModeSettings = expertMode ? expertSettings : nonExpertSettings;
  const widthRange = expertMode ? EXPERT_WIDTH_RANGE : NON_EXPERT_WIDTH_RANGE;
  const heightRange = expertMode ? EXPERT_HEIGHT_RANGE : NON_EXPERT_HEIGHT_RANGE;

  // Calculate clamped values for current mode
  const cardWidth = Math.max(
    widthRange.min,
    Math.min(widthRange.max, toFiniteNumber(currentModeSettings.equipmentCardWidth, expertMode ? DEFAULT_EXPERT_SETTINGS.equipmentCardWidth : DEFAULT_NON_EXPERT_SETTINGS.equipmentCardWidth))
  );
  const cardHeight = Math.max(
    heightRange.min,
    Math.min(heightRange.max, toFiniteNumber(currentModeSettings.equipmentCardHeight, expertMode ? DEFAULT_EXPERT_SETTINGS.equipmentCardHeight : DEFAULT_NON_EXPERT_SETTINGS.equipmentCardHeight))
  );

  // IMPORTANT: avoid reflow/pan jitter while dragging sliders by using a draft value.
  const [strokeWidthDraft, setStrokeWidthDraft] = useState(strokeWidth);
  const [cardWidthDraft, setCardWidthDraft] = useState(cardWidth);
  const [cardHeightDraft, setCardHeightDraft] = useState(cardHeight);

  useEffect(() => setStrokeWidthDraft(strokeWidth), [strokeWidth]);
  useEffect(() => setCardWidthDraft(cardWidth), [cardWidth, expertMode]);
  useEffect(() => setCardHeightDraft(cardHeight), [cardHeight, expertMode]);

  // Track the current diagram ID to detect when a new diagram is opened
  const [lastDiagramId, setLastDiagramId] = useState<string | null>(null);

  // Auto-center diagram when it's first opened
  useEffect(() => {
    if (!currentDiagram?.id || !canvasRef.current) return;
    
    // Only auto-center when diagram changes (not on every re-render)
    if (lastDiagramId === currentDiagram.id) return;
    
    setLastDiagramId(currentDiagram.id);
    
    // Small delay to ensure canvas dimensions are available
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      
      const equipment = currentDiagram?.equipment;
      const zones = currentDiagram?.zones;
      
      if ((!equipment || equipment.length === 0) && (!zones || zones.length === 0)) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const padding = 60;
      const effectiveCardHeight = expertMode ? cardHeight + 50 : cardHeight;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      if (equipment) {
        for (const e of equipment) {
          minX = Math.min(minX, e.x);
          minY = Math.min(minY, e.y);
          maxX = Math.max(maxX, e.x + cardWidth);
          maxY = Math.max(maxY, e.y + effectiveCardHeight);
        }
      }

      if (zones) {
        for (const z of zones) {
          minX = Math.min(minX, z.x);
          minY = Math.min(minY, z.y);
          maxX = Math.max(maxX, z.x + z.width);
          maxY = Math.max(maxY, z.y + z.height);
        }
      }

      if (minX === Infinity || maxX === -Infinity) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const availableWidth = canvasRect.width - padding * 2;
      const availableHeight = canvasRect.height - padding * 2;

      const zoomX = availableWidth / contentWidth;
      const zoomY = availableHeight / contentHeight;
      const newZoom = Math.max(0.25, Math.min(1.5, Math.min(zoomX, zoomY)));

      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      
      const newPanX = canvasRect.width / 2 - contentCenterX * newZoom;
      const newPanY = canvasRect.height / 2 - contentCenterY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDiagram?.id, currentDiagram?.equipment, currentDiagram?.zones, lastDiagramId, cardWidth, expertMode]);

  // Fetch all manufacturers to display names
  const { manufacturers } = useManufacturers();

  useEffect(() => {
    if (!DEBUG_CANVAS) return;
    // eslint-disable-next-line no-console
    console.log('[DiagramCanvas] settings', {
      cardWidth,
      strokeWidth,
      expertMode,
      equipmentCount: currentDiagram?.equipment?.length,
    });
  }, [DEBUG_CANVAS, cardWidth, strokeWidth, expertMode, currentDiagram?.equipment?.length]);

  // If a width change pushes the selected node fully outside the viewport, nudge the pan so it stays visible.
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!selectedEquipment) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = selectedEquipment.x * zoom + pan.x;
    const screenY = selectedEquipment.y * zoom + pan.y;
    const screenW = cardWidth * zoom;
    const screenH = (expertMode ? 140 : 96) * zoom;

    const fullyOffLeft = screenX + screenW < 0;
    const fullyOffRight = screenX > rect.width;
    const fullyOffTop = screenY + screenH < 0;
    const fullyOffBottom = screenY > rect.height;

    if (fullyOffLeft || fullyOffRight || fullyOffTop || fullyOffBottom) {
      const nextPanX = rect.width / 2 - (selectedEquipment.x + cardWidth / 2) * zoom;
      const nextPanY = rect.height / 2 - (selectedEquipment.y + (expertMode ? 70 : 48)) * zoom;
      setPan({ x: nextPanX, y: nextPanY });
    }
  }, [cardWidth, zoom, pan.x, pan.y, selectedEquipment, expertMode]);

  // If no equipment is selected, a width change can still push ALL nodes out of view.
  // In that case, recenter the diagram bounding box so vignettes don't "disappear".
  useEffect(() => {
    if (!canvasRef.current) return;
    if (selectedEquipment) return;
    const equipment = currentDiagram?.equipment;
    if (!equipment || equipment.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const nodeH = (expertMode ? 140 : 96);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const e of equipment) {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + cardWidth);
      maxY = Math.max(maxY, e.y + nodeH);
    }

    const bboxLeft = minX * zoom + pan.x;
    const bboxTop = minY * zoom + pan.y;
    const bboxRight = maxX * zoom + pan.x;
    const bboxBottom = maxY * zoom + pan.y;

    const allOffscreen =
      bboxRight < 0 ||
      bboxLeft > rect.width ||
      bboxBottom < 0 ||
      bboxTop > rect.height;

    if (allOffscreen) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setPan({
        x: rect.width / 2 - centerX * zoom,
        y: rect.height / 2 - centerY * zoom,
      });
    }
  }, [cardWidth, zoom, pan.x, pan.y, selectedEquipment, expertMode, currentDiagram?.equipment]);

  // Keyboard shortcuts: Ctrl+C / Ctrl+V / Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) ) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, pasteClipboard, undo, redo]);

  // Track shift key state for additive selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { shiftHeldRef.current = e.shiftKey; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  const getManufacturerName = useCallback((manufacturerId?: string) => {
    if (!manufacturerId) return null;
    return manufacturers.find(m => m.id === manufacturerId)?.name || null;
  }, [manufacturers]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data || !canvasRef.current) return;

    const equipment: Equipment = JSON.parse(data);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    addEquipmentToCanvas(equipment, x, y);
  }, [addEquipmentToCanvas, pan, zoom]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Wheel zoom handler - centered on cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const pointX = (mouseX - pan.x) / zoom;
    const pointY = (mouseY - pan.y) / zoom;
    
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.25, Math.min(3, zoom + zoomDelta));
    
    const newPanX = mouseX - pointX * newZoom;
    const newPanY = mouseY - pointY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      // Middle click or Alt+left click: pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      // Left click on background
      if (e.button === 0) {
        // Text tool mode: place text
        if (isTextToolActive && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const textX = (e.clientX - rect.left - pan.x) / zoom;
          const textY = (e.clientY - rect.top - pan.y) / zoom;
          addText(textX, textY);
          setIsTextToolActive(false);
          return;
        }

        if (isConnecting) {
          cancelConnection();
          return;
        }

        // Start lasso selection box
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - pan.x) / zoom;
          const canvasY = (e.clientY - rect.top - pan.y) / zoom;
          setSelectionBox({ startX: canvasX, startY: canvasY, currentX: canvasX, currentY: canvasY });

          // If not holding shift, clear existing selection
          if (!shiftHeldRef.current) {
            setSelectedCanvasIds(new Set());
            selectEquipment(null);
            selectConnection(null);
            selectZone(null);
            selectText(null);
            selectImage(null);
            setEditingConnectionId(null);
          }
        }
      }
    }
  };

  const handleAddZone = () => {
    if (!canvasRef.current) return;
    // Add zone at center of visible canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - pan.x) / zoom - 150;
    const centerY = (rect.height / 2 - pan.y) / zoom - 100;
    addZone(centerX, centerY);
  };

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let offsetX = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image valide`);
        continue;
      }

      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('diagram-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
          toast.error(`Erreur lors de l'upload de ${file.name}`);
          console.error('Upload error:', error);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('diagram-images')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Get image dimensions
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Calculate placement
        const centerX = (rect.width / 2 - pan.x) / zoom + offsetX;
        const centerY = (rect.height / 2 - pan.y) / zoom;
        
        // Scale image to max 200px width while maintaining aspect ratio
        const maxWidth = 200;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = img.width * scale;
        const height = img.height * scale;

        addImage(publicUrl, file.name, centerX - width / 2, centerY - height / 2, width, height);
        offsetX += width + 20; // Offset next image

        toast.success(`${file.name} ajouté`);
      } catch (err) {
        toast.error(`Erreur lors de l'upload de ${file.name}`);
        console.error('Upload error:', err);
      }
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Store previous mouse position for delta calculation (group drag)
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();

      // Group drag: use raw mouse delta in canvas space
      if (selectedCanvasIds.size > 1 && selectedCanvasIds.has(draggingNode)) {
        const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
        if (lastDragPosRef.current) {
          const dx = mouseCanvasX - lastDragPosRef.current.x;
          const dy = mouseCanvasY - lastDragPosRef.current.y;
          if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            moveSelectedGroup(dx, dy);
          }
        }
        lastDragPosRef.current = { x: mouseCanvasX, y: mouseCanvasY };
      } else {
        // Single element drag
        const x = (e.clientX - rect.left - pan.x) / zoom - nodeOffset.x;
        const y = (e.clientY - rect.top - pan.y) / zoom - nodeOffset.y;
        updateEquipmentPosition(draggingNode, x, y);
      }
    } else if (selectionBox && canvasRef.current) {
      // Lasso selection: update box and compute intersecting elements
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      const newBox = { ...selectionBox, currentX: canvasX, currentY: canvasY };
      setSelectionBox(newBox);

      const left = Math.min(newBox.startX, newBox.currentX);
      const right = Math.max(newBox.startX, newBox.currentX);
      const top = Math.min(newBox.startY, newBox.currentY);
      const bottom = Math.max(newBox.startY, newBox.currentY);

      const ids = new Set<string>();
      for (const eq of currentDiagram?.equipment || []) {
        const eqR = eq.x + getCardWidth(eq);
        const eqB = eq.y + getCardHeight(eq);
        if (eq.x < right && eqR > left && eq.y < bottom && eqB > top) ids.add(eq.canvasId);
      }
      for (const z of currentDiagram?.zones || []) {
        if (z.x < right && z.x + z.width > left && z.y < bottom && z.y + z.height > top) ids.add(z.id);
      }
      for (const img of currentDiagram?.images || []) {
        if (img.x < right && img.x + img.width > left && img.y < bottom && img.y + img.height > top) ids.add(img.id);
      }
      for (const t of currentDiagram?.texts || []) {
        if (t.x < right && t.x + 100 > left && t.y < bottom && t.y + 20 > top) ids.add(t.id);
      }
      setSelectedCanvasIds(ids);
    }
  };

  // Global mouse move/up for connection dragging (works even outside canvas)
  useEffect(() => {
    if (!draggingConnection) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setDraggingConnection(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!canvasRef.current || !draggingConnection) {
        setDraggingConnection(null);
        return;
      }

      const handleEl = (e.target as HTMLElement | null)?.closest?.('[data-connection-handle="true"]');
      if (handleEl) {
        setDraggingConnection(null);
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Check if dropped on a comm card or main card
      let targetEquipment: CanvasEquipment | undefined;
      let droppedOnCommCard = false;

      for (const eq of currentDiagram?.equipment || []) {
        if (eq.canvasId === draggingConnection.sourceId) continue;
        
        // Check comm card bounds first
        if (eq.hasCommCard) {
          const commBounds = getCommCardBounds(eq, getCardWidth(eq), getCardHeight(eq), eq.commCardPosition || 'right');
          if (x >= commBounds.x && x <= commBounds.x + commBounds.width &&
              y >= commBounds.y && y <= commBounds.y + commBounds.height) {
            targetEquipment = eq;
            droppedOnCommCard = true;
            break;
          }
        }
        
        const eqRight = eq.x + getCardWidth(eq);
        const eqBottom = eq.y + getCardHeight(eq);
        if (x >= eq.x && x <= eqRight && y >= eq.y && y <= eqBottom) {
          targetEquipment = eq;
          break;
        }
      }

      if (targetEquipment) {
        completeConnection(
          targetEquipment.canvasId,
          draggingConnection.sourceHandle,
          undefined,
          draggingConnection.sourceFromCommCard || false,
          droppedOnCommCard || false
        );
      } else {
        cancelConnection();
      }

      setDraggingConnection(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingConnection, pan, zoom, cardWidth, currentDiagram?.equipment, currentDiagram?.connections, completeConnection, cancelConnection]);

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingNode(null);
    lastDragPosRef.current = null;

    if (selectionBox) {
      // If barely moved, treat as click to deselect
      const dx = Math.abs(selectionBox.currentX - selectionBox.startX);
      const dy = Math.abs(selectionBox.currentY - selectionBox.startY);
      if (dx < 3 && dy < 3 && !shiftHeldRef.current) {
        setSelectedCanvasIds(new Set());
        selectEquipment(null);
        selectConnection(null);
        selectZone(null);
        selectText(null);
        selectImage(null);
      }
      setSelectionBox(null);
    }
  };

  // Start connection drag from handle
  const handleConnectionHandleMouseDown = (
    e: React.MouseEvent,
    equipment: CanvasEquipment,
    side: HandleSide,
    fromCommCard?: boolean
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;

    startConnection(equipment.canvasId);

    let handlePos: { x: number; y: number };
    if (fromCommCard) {
      const commBounds = getCommCardBounds(equipment, getCardWidth(equipment), getCardHeight(equipment), equipment.commCardPosition || 'right');
      handlePos = getHandlePosition(commBounds.x, commBounds.y, commBounds.width, commBounds.height, side);
    } else {
      const effectiveCardHeight = getCardHeight(equipment);
      handlePos = getHandlePosition(equipment.x, equipment.y, getCardWidth(equipment), effectiveCardHeight, side);
    }

    setDraggingConnection({
      sourceId: equipment.canvasId,
      sourceHandle: side,
      sourceFromCommCard: fromCommCard,
      startX: handlePos.x,
      startY: handlePos.y,
      currentX: handlePos.x,
      currentY: handlePos.y,
    });
  };

  // Complete connection when mouse up on a target handle (and support click-to-connect)
  const handleConnectionHandleMouseUp = (e: React.MouseEvent, equipment: CanvasEquipment, side: HandleSide, fromCommCard?: boolean) => {
    e.stopPropagation();
    e.preventDefault();

    // Dragging a wire: drop on a different handle => create connection
    if (draggingConnection) {
      if (draggingConnection.sourceId !== equipment.canvasId) {
        completeConnection(
          equipment.canvasId,
          draggingConnection.sourceHandle,
          side,
          draggingConnection.sourceFromCommCard || false,
          fromCommCard || false
        );
      }

      // If mouseup is on the source handle, we keep "connecting" mode alive so the
      // next handle click can complete the connection.
      setDraggingConnection(null);
      return;
    }

    // Click-to-connect: if we're already in connecting mode, clicking a target handle completes it.
    if (isConnecting && connectionSource && connectionSource !== equipment.canvasId) {
      completeConnection(equipment.canvasId, undefined, side, false, fromCommCard || false);
    }
  };

  // Start connection from equipment (click mode - kept for backward compatibility)
  const handleStartConnection = (e: React.MouseEvent, equipment: CanvasEquipment) => {
    e.stopPropagation();
    startConnection(equipment.canvasId);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, equipment: CanvasEquipment) => {
    e.stopPropagation();
    
    // Complete connection if in connecting mode
    if (isConnecting && connectionSource !== equipment.canvasId) {
      completeConnection(equipment.canvasId);
      return;
    }

    // Shift+click: toggle element in multi-selection
    if (shiftHeldRef.current) {
      setSelectedCanvasIds(prev => {
        const next = new Set(prev);
        if (next.has(equipment.canvasId)) next.delete(equipment.canvasId);
        else next.add(equipment.canvasId);
        return next;
      });
    } else if (selectedCanvasIds.size > 1 && selectedCanvasIds.has(equipment.canvasId)) {
      // Part of existing group selection — keep group, start drag
    } else {
      selectEquipment(equipment);
    }
    
    if (!isConnecting) {
      setDraggingNode(equipment.canvasId);
      if (canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const rect = (e.target as HTMLElement).closest('.equipment-node')?.getBoundingClientRect();
        if (rect) {
          const ox = (e.clientX - rect.left) / zoom;
          const oy = (e.clientY - rect.top) / zoom;
          setNodeOffset({ x: ox, y: oy });
        }
        // Initialize lastDragPos with raw mouse position in canvas space (for group drag)
        const mouseCanvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
        lastDragPosRef.current = { x: mouseCanvasX, y: mouseCanvasY };
      }
    }
  };

  // Handle connection click to select
  const handleConnectionClick = (connectionId: string) => {
    const connection = currentDiagram?.connections.find(c => c.id === connectionId);
    if (connection) {
      selectConnection(connection);
    }
  };

  // Handle connection drag to move the connection's bend point
  const handleConnectionMouseDown = (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    
    const connection = currentDiagram?.connections.find(c => c.id === connectionId);
    if (!connection || !canvasRef.current) return;
    
    // Don't allow dragging straight lines
    const pathType = connection.pathType || 'curved';
    if (pathType === 'straight') {
      selectConnection(connection);
      return;
    }
    
    selectConnection(connection);
    
    // If the connection already has control points, don't overwrite them.
    // The user can add new points via double-click or the "+" button.
    if (connection.controlPoints && connection.controlPoints.length > 0) {
      return;
    }

    // No control points yet: create the first one at click position
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    const pointId = `cp-${Date.now()}`;
    const newPathType = pathType === 'orthogonal' ? 'orthogonal' : 'custom';
    updateConnection(connectionId, {
      pathType: newPathType,
      controlPoints: [{ id: pointId, x, y }],
    });
    
    // Start dragging immediately
    setDraggingControlPoint({ connectionId, pointId });
  };

  // Insert a control point at the closest segment of the path
  const insertControlPointOnPath = (connection: Connection, clickX: number, clickY: number): ControlPoint[] => {
    const source = currentDiagram?.equipment.find(e => e.canvasId === connection.sourceId);
    const target = currentDiagram?.equipment.find(e => e.canvasId === connection.targetId);
    if (!source || !target) return connection.controlPoints || [];

    const sourceHeight = getCardHeight(source);
    const targetHeight = getCardHeight(target);
    const sourceWidth = getCardWidth(source);
    const targetWidth = getCardWidth(target);

    const { sourceX, sourceY, targetX, targetY } = getConnectionEndpoints(
      source, target, sourceWidth, sourceHeight,
      connection.sourceHandle, connection.targetHandle,
      targetWidth, targetHeight,
      connection.sourceFromCommCard, connection.targetFromCommCard,
      source, target
    );

    const existingPoints = connection.controlPoints || [];
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...existingPoints,
      { x: targetX, y: targetY },
    ];

    // Find the segment closest to the click
    let bestSegIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < allPoints.length - 1; i++) {
      const ax = allPoints[i].x, ay = allPoints[i].y;
      const bx = allPoints[i + 1].x, by = allPoints[i + 1].y;
      // Project click onto segment
      const abx = bx - ax, aby = by - ay;
      const lenSq = abx * abx + aby * aby;
      let t = lenSq > 0 ? ((clickX - ax) * abx + (clickY - ay) * aby) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const px = ax + abx * t, py = ay + aby * t;
      const dx = clickX - px, dy = clickY - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestSegIdx = i;
      }
    }

    const newPoint: ControlPoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: clickX,
      y: clickY,
    };

    // Insert after the bestSegIdx-th existing point (index in existingPoints is bestSegIdx)
    const insertIdx = bestSegIdx; // 0 = before first existing CP, etc.
    const updated = [...existingPoints];
    updated.splice(insertIdx, 0, newPoint);
    return updated;
  };

  // Handle connection double-click: add a waypoint at click position
  const handleConnectionDoubleClick = (e: React.MouseEvent, connectionId: string) => {
    const connection = currentDiagram?.connections.find(c => c.id === connectionId);
    if (!connection || !canvasRef.current) return;

    const pathType = connection.pathType || 'curved';
    if (pathType === 'straight') {
      // For straight lines, double-click edits the name
      selectConnection(connection);
      setEditingConnectionId(connectionId);
      setEditingConnectionName(connection.name || '');
      return;
    }

    // Calculate canvas position
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const updatedPoints = insertControlPointOnPath(connection, x, y);
    updateConnection(connectionId, {
      pathType: 'custom',
      controlPoints: updatedPoints,
    });
    selectConnection({ ...connection, controlPoints: updatedPoints, pathType: 'custom' });
  };

  // Handle connection name save
  const handleConnectionNameSave = () => {
    if (editingConnectionId && updateConnection) {
      updateConnection(editingConnectionId, { name: editingConnectionName });
    }
    setEditingConnectionId(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.25));
  const handleFitToView = () => {
    if (!canvasRef.current) return;
    
    const equipment = currentDiagram?.equipment;
    const zones = currentDiagram?.zones;
    
    // If no content, just reset to default view
    if ((!equipment || equipment.length === 0) && (!zones || zones.length === 0)) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const padding = 60; // Padding around the content
    const cardHeight = getCardHeight();

    // Calculate bounding box of all equipment and zones
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Include equipment in bounding box
    if (equipment) {
      for (const e of equipment) {
        minX = Math.min(minX, e.x);
        minY = Math.min(minY, e.y);
        maxX = Math.max(maxX, e.x + cardWidth);
        maxY = Math.max(maxY, e.y + cardHeight);
      }
    }

    // Include zones in bounding box
    if (zones) {
      for (const z of zones) {
        minX = Math.min(minX, z.x);
        minY = Math.min(minY, z.y);
        maxX = Math.max(maxX, z.x + z.width);
        maxY = Math.max(maxY, z.y + z.height);
      }
    }

    // If bounding box is invalid, reset to default
    if (minX === Infinity || maxX === -Infinity) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const availableWidth = canvasRect.width - padding * 2;
    const availableHeight = canvasRect.height - padding * 2;

    // Calculate zoom to fit content
    const zoomX = availableWidth / contentWidth;
    const zoomY = availableHeight / contentHeight;
    const newZoom = Math.max(0.25, Math.min(1.5, Math.min(zoomX, zoomY)));

    // Calculate pan to center the content
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    const newPanX = canvasRect.width / 2 - contentCenterX * newZoom;
    const newPanY = canvasRect.height / 2 - contentCenterY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Calculate card dimensions - uses mode-specific individual values if set, otherwise falls back to global
  const getCardHeight = (equipment?: CanvasEquipment) => {
    if (expertMode) {
      if (equipment?.customExpertHeight !== undefined) return equipment.customExpertHeight;
      // In Expert mode without a custom height, auto-calculate based on content
      if (equipment) return computeAutoCardHeight(equipment, manufacturers);
    } else {
      if (equipment?.customHeight !== undefined) return equipment.customHeight;
    }
    return cardHeight;
  };

  const getCardWidth = (equipment?: CanvasEquipment) => {
    if (expertMode) {
      if (equipment?.customExpertWidth !== undefined) return equipment.customExpertWidth;
    } else {
      if (equipment?.customWidth !== undefined) return equipment.customWidth;
    }
    return cardWidth;
  };

  const getConnectionPath = (connection: Connection) => {
    const source = currentDiagram?.equipment.find(e => e.canvasId === connection.sourceId);
    const target = currentDiagram?.equipment.find(e => e.canvasId === connection.targetId);
    if (!source || !target) return '';

    // Use individual equipment heights for correct arrow positioning
    const sourceHeight = getCardHeight(source);
    const targetHeight = getCardHeight(target);
    const sourceWidth = getCardWidth(source);
    const targetWidth = getCardWidth(target);
    
    const pathType = connection.pathType || 'orthogonal';
    const controlPoints = connection.controlPoints;
    
    const { sourceX, sourceY, targetX, targetY, sourceSide, targetSide } = getConnectionEndpoints(
      source,
      target,
      sourceWidth,
      sourceHeight,
      connection.sourceHandle,
      connection.targetHandle,
      targetWidth,
      targetHeight,
      connection.sourceFromCommCard,
      connection.targetFromCommCard,
      source,
      target
    );

    // Custom path with control points
    if (pathType === 'custom' && controlPoints && controlPoints.length > 0) {
      const points = [{ x: sourceX, y: sourceY }, ...controlPoints, { x: targetX, y: targetY }];
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    }

    switch (pathType) {
      case 'straight':
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      case 'orthogonal': {
        // Use orthogonal path that starts perpendicular to the handles
        // Pass control point if available for manual routing adjustment
        const cp = controlPoints && controlPoints.length > 0 ? controlPoints[0] : undefined;
        return getOrthogonalPath(sourceX, sourceY, targetX, targetY, sourceSide, targetSide, 30, cp);
      }
      case 'curved':
      default: {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      }
    }
  };

  // Add a control point at the midpoint of the last segment
  const addControlPoint = (connection: Connection) => {
    const source = currentDiagram?.equipment.find(e => e.canvasId === connection.sourceId);
    const target = currentDiagram?.equipment.find(e => e.canvasId === connection.targetId);
    if (!source || !target) return;

    const sourceHeight = getCardHeight(source);
    const targetHeight = getCardHeight(target);
    const sourceWidth = getCardWidth(source);
    const targetWidth = getCardWidth(target);

    const { sourceX, sourceY, targetX, targetY } = getConnectionEndpoints(
      source, target, sourceWidth, sourceHeight,
      connection.sourceHandle, connection.targetHandle,
      targetWidth, targetHeight,
      connection.sourceFromCommCard, connection.targetFromCommCard,
      source, target
    );

    const existingPoints = connection.controlPoints || [];
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...existingPoints,
      { x: targetX, y: targetY },
    ];

    // Add point at midpoint of the last segment
    const last = allPoints[allPoints.length - 2];
    const end = allPoints[allPoints.length - 1];
    const newPoint: ControlPoint = {
      id: `cp-${Date.now()}`,
      x: (last.x + end.x) / 2,
      y: (last.y + end.y) / 2,
    };

    updateConnection(connection.id, {
      pathType: 'custom',
      controlPoints: [...existingPoints, newPoint],
    });
  };

  // Remove a control point
  const removeControlPoint = (connectionId: string, pointId: string) => {
    const connection = currentDiagram?.connections.find(c => c.id === connectionId);
    if (!connection) return;

    const updatedPoints = (connection.controlPoints || []).filter(p => p.id !== pointId);
    updateConnection(connectionId, {
      controlPoints: updatedPoints,
      pathType: updatedPoints.length > 0 ? 'custom' : 'curved',
    });
  };

  // Handle control point drag
  const handleControlPointMouseDown = (e: React.MouseEvent, connectionId: string, pointId: string) => {
    e.stopPropagation();
    setDraggingControlPoint({ connectionId, pointId });
  };

  const handleControlPointMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingControlPoint || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const connection = currentDiagram?.connections.find(c => c.id === draggingControlPoint.connectionId);
    if (!connection) return;

    const updatedPoints = (connection.controlPoints || []).map(p =>
      p.id === draggingControlPoint.pointId ? { ...p, x, y } : p
    );

    updateConnection(draggingControlPoint.connectionId, { controlPoints: updatedPoints });
  }, [draggingControlPoint, pan, zoom, currentDiagram, updateConnection]);

  const handleControlPointMouseUp = () => {
    setDraggingControlPoint(null);
  };

  // Get connection label position (uses path-based positioning if labelPosition is set)
  const getConnectionLabelPosition = useCallback((connection: Connection) => {
    const source = currentDiagram?.equipment.find(e => e.canvasId === connection.sourceId);
    const target = currentDiagram?.equipment.find(e => e.canvasId === connection.targetId);
    if (!source || !target) return { x: 0, y: 0 };

    const pathStr = getConnectionPath(connection);
    if (!pathStr) {
      const halfWidth = cardWidth / 2;
      const currentCardHeight = getCardHeight();
      return {
        x: (source.x + target.x) / 2 + halfWidth,
        y: (source.y + target.y) / 2 + currentCardHeight / 2 - 15,
      };
    }

    const t = connection.labelPosition ?? 0.5;
    const perpOffset = connection.labelPerpendicularOffset ?? 0;

    const pt = getPointOnPath(pathStr, t);
    const perp = getPerpendicularOffset(pt.dx, pt.dy, perpOffset);

    return {
      x: pt.x + perp.x,
      y: pt.y + perp.y,
    };
  }, [currentDiagram, cardWidth]);

  // Handle secure icon drag
  const handleSecureIconMouseDown = (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    setDraggingSecureIcon(connectionId);
  };

  const handleSecureIconMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingSecureIcon || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const connection = currentDiagram?.connections.find(c => c.id === draggingSecureIcon);
    if (!connection) return;

    const labelPos = getConnectionLabelPosition(connection);
    const offsetX = x - labelPos.x;
    const offsetY = y - labelPos.y;

    updateConnection(draggingSecureIcon, { secureIconOffset: { x: offsetX, y: offsetY } });
  }, [draggingSecureIcon, pan, zoom, currentDiagram, updateConnection, getConnectionLabelPosition]);

  const handleSecureIconMouseUp = () => {
    setDraggingSecureIcon(null);
  };

  // Handle label drag
  const handleLabelMouseDown = (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    setDraggingLabel(connectionId);
  };

  const handleLabelMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingLabel || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const connection = currentDiagram?.connections.find(c => c.id === draggingLabel);
    if (!connection) return;

    const pathStr = getConnectionPath(connection);
    if (!pathStr) return;

    const { t, perpDistance } = projectMouseOnPath(mouseX, mouseY, pathStr);
    updateConnection(draggingLabel, { labelPosition: t, labelPerpendicularOffset: perpDistance });
  }, [draggingLabel, pan, zoom, currentDiagram, updateConnection]);

  const handleLabelMouseUp = () => {
    setDraggingLabel(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        if (isConnecting) {
          cancelConnection();
        }
        if (editingConnectionId) {
          setEditingConnectionId(null);
        }
      }
      if (e.key === 'Enter' && editingConnectionId) {
        handleConnectionNameSave();
      }
      
      // Delete key handling
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnection) {
          removeConnection(selectedConnection.id);
          selectConnection(null);
        } else if (selectedEquipment) {
          removeEquipmentFromCanvas(selectedEquipment.canvasId);
          selectEquipment(null);
        } else if (selectedZone) {
          removeZone(selectedZone.id);
          selectZone(null);
        } else if (selectedText) {
          removeText(selectedText.id);
          selectText(null);
        }
      }
      // Escape to cancel text tool
      if (e.key === 'Escape' && isTextToolActive) {
        setIsTextToolActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnecting, cancelConnection, editingConnectionId, selectedConnection, selectedEquipment, selectedZone, selectedText, isTextToolActive, removeText, selectText]);

  if (!currentDiagram) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Sélectionnez ou créez un schéma</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-canvas">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {/* Add Zone button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddZone}
              className="gap-2 bg-card shadow-sm"
            >
              <SquareDashed className="h-4 w-4" />
              Ajouter une zone
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Créer une zone pour délimiter un site
          </TooltipContent>
        </Tooltip>

        {/* Import Image button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => imageInputRef.current?.click()}
              className="gap-2 bg-card shadow-sm"
            >
              <ImagePlus className="h-4 w-4" />
              Importer image
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Importer une image (logo, schéma...)
          </TooltipContent>
        </Tooltip>

        {/* Text tool button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={isTextToolActive ? "default" : "outline"}
              size="sm" 
              onClick={() => setIsTextToolActive(!isTextToolActive)}
              className="gap-2 shadow-sm"
            >
              <Type className="h-4 w-4" />
              Texte
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Ajouter du texte sur le canvas
          </TooltipContent>
        </Tooltip>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Expert mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={expertMode ? "default" : "outline"}
              size="sm" 
              onClick={() => setExpertMode(!expertMode)}
              className="gap-2 shadow-sm"
            >
              {expertMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Mode expert
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {expertMode ? "Masquer les détails des équipements" : "Afficher les détails des équipements"}
          </TooltipContent>
        </Tooltip>

        {/* Grid toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={showGrid ? "outline" : "default"}
              size="icon"
              onClick={() => setShowGrid(!showGrid)}
              className="h-9 w-9 shadow-sm"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showGrid ? "Masquer la grille" : "Afficher la grille"}
          </TooltipContent>
        </Tooltip>

        {/* Connection stroke width control */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <MoveHorizontal className="h-4 w-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Épaisseur des liens</TooltipContent>
          </Tooltip>
          <Slider
            value={[Math.max(0.5, Math.min(3, strokeWidthDraft || 1.5))]}
            onValueChange={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(0.5, Math.min(3, Math.round(newValue * 2) / 2));
                setStrokeWidthDraft(clampedValue);
              }
            }}
            onValueCommit={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(0.5, Math.min(3, Math.round(newValue * 2) / 2));
                updateDiagramSettings({ connectionStrokeWidth: clampedValue });
              }
            }}
            min={0.5}
            max={3}
            step={0.5}
            className="w-20"
          />
          <span className="text-xs font-medium text-muted-foreground w-6">{strokeWidth}px</span>
        </div>

        {/* Equipment card width control */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <RectangleHorizontal className="h-4 w-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Largeur des vignettes</TooltipContent>
          </Tooltip>
          <Slider
            value={[Math.max(widthRange.min, Math.min(widthRange.max, cardWidthDraft || cardWidth))]}
            onValueChange={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(widthRange.min, Math.min(widthRange.max, Math.round(newValue / 10) * 10));
                setCardWidthDraft(clampedValue);
              }
            }}
            onValueCommit={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(widthRange.min, Math.min(widthRange.max, Math.round(newValue / 10) * 10));
                // Save to the correct mode settings
                if (expertMode) {
                  updateDiagramSettings({ 
                    expertSettings: { ...expertSettings, equipmentCardWidth: clampedValue }
                  });
                } else {
                  updateDiagramSettings({ 
                    nonExpertSettings: { ...nonExpertSettings, equipmentCardWidth: clampedValue }
                  });
                }
              }
            }}
            min={widthRange.min}
            max={widthRange.max}
            step={10}
            className="w-20"
          />
          <span className="text-xs font-medium text-muted-foreground w-8">{cardWidth}px</span>
        </div>

        {/* Equipment card height control */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <RectangleVertical className="h-4 w-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Hauteur des vignettes</TooltipContent>
          </Tooltip>
          <Slider
            value={[Math.max(heightRange.min, Math.min(heightRange.max, cardHeightDraft || cardHeight))]}
            onValueChange={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(heightRange.min, Math.min(heightRange.max, Math.round(newValue / 10) * 10));
                setCardHeightDraft(clampedValue);
              }
            }}
            onValueCommit={(value) => {
              const newValue = value?.[0];
              if (typeof newValue === 'number' && Number.isFinite(newValue)) {
                const clampedValue = Math.max(heightRange.min, Math.min(heightRange.max, Math.round(newValue / 10) * 10));
                // Save to the correct mode settings
                if (expertMode) {
                  updateDiagramSettings({ 
                    expertSettings: { ...expertSettings, equipmentCardHeight: clampedValue }
                  });
                } else {
                  updateDiagramSettings({ 
                    nonExpertSettings: { ...nonExpertSettings, equipmentCardHeight: clampedValue }
                  });
                }
              }
            }}
            min={heightRange.min}
            max={heightRange.max}
            step={10}
            className="w-20"
          />
          <span className="text-xs font-medium text-muted-foreground w-8">{cardHeight}px</span>
        </div>

        {/* Protocol colors settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline"
              size="icon"
              onClick={() => setShowProtocolColors(!showProtocolColors)}
              className="h-9 w-9 shadow-sm"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Couleurs des protocoles</TooltipContent>
        </Tooltip>
      </div>

      {/* Protocol colors panel */}
      {showProtocolColors && (
        <div className="absolute top-16 left-4 z-20 bg-card border border-border rounded-lg p-4 shadow-lg w-72 max-h-[70vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Couleurs des protocoles</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowProtocolColors(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {Object.entries(PROTOCOL_LABELS).filter(([key]) => key !== 'none').map(([key, label]) => {
              const protocol = key as Protocol;
              const customColor = currentDiagram?.settings?.protocolColors?.[protocol];
              const defaultColor = PROTOCOL_COLORS[protocol];
              const currentColor = customColor || defaultColor;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      const protocolColors = { ...currentDiagram?.settings?.protocolColors, [protocol]: e.target.value };
                      updateDiagramSettings({ protocolColors });
                    }}
                    className="w-8 h-7 p-0.5 cursor-pointer border-border"
                  />
                  <span className="text-xs flex-1 text-foreground">{label}</span>
                  {customColor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const protocolColors = { ...currentDiagram?.settings?.protocolColors };
                        delete protocolColors[protocol];
                        updateDiagramSettings({ protocolColors });
                      }}
                      title="Réinitialiser"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zoom & Undo/Redo controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} className="h-8 w-8">
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Annuler (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} className="h-8 w-8">
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rétablir (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
        <div className="w-px h-5 bg-border mx-0.5" />
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleFitToView} className="h-8 w-8">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Connection mode indicator */}
      {isConnecting && (
        <div className="absolute top-16 left-4 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
          Cliquez sur un équipement cible • Échap pour annuler
        </div>
      )}

      {/* Text tool mode indicator */}
      {isTextToolActive && (
        <div className="absolute top-16 left-4 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
          Cliquez sur le canvas pour placer du texte • Échap pour annuler
        </div>
      )}

      {/* Multi-selection badge */}
      {selectedCanvasIds.size > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg pointer-events-none">
          {selectedCanvasIds.size} éléments sélectionnés
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          "w-full h-full cursor-default",
          isPanning && "cursor-grabbing",
          selectionBox && "cursor-crosshair",
          isConnecting && "cursor-crosshair",
          isTextToolActive && "cursor-text"
        )}
        style={{
          backgroundImage: showGrid 
            ? `linear-gradient(hsl(215 25% 88% / 0.5) 1px, transparent 1px),
               linear-gradient(90deg, hsl(215 25% 88% / 0.5) 1px, transparent 1px)`
            : 'none',
          backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : undefined,
          backgroundPosition: showGrid ? `${pan.x}px ${pan.y}px` : undefined,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={(e) => {
          handleCanvasMouseMove(e);
          handleControlPointMouseMove(e);
          handleSecureIconMouseMove(e);
          handleLabelMouseMove(e);
        }}
        onMouseUp={(e) => {
          handleCanvasMouseUp(e);
          handleControlPointMouseUp();
          handleSecureIconMouseUp();
          handleLabelMouseUp();
        }}
        onMouseLeave={(e) => {
          handleCanvasMouseUp(e);
          handleControlPointMouseUp();
          handleSecureIconMouseUp();
          handleLabelMouseUp();
        }}
        onWheel={handleWheel}
      >
        <div
          className="canvas-background absolute left-0 top-0"
          style={{
            width: 8000,
            height: 8000,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Zones (rendered behind everything) */}
          {currentDiagram.zones.map(zone => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              zoom={zoom}
              pan={pan}
              canvasRef={canvasRef}
              isSelected={selectedZone?.id === zone.id}
              isGroupSelected={selectedCanvasIds.size > 1 && selectedCanvasIds.has(zone.id)}
              onSelect={() => {
                if (shiftHeldRef.current) {
                  setSelectedCanvasIds(prev => {
                    const next = new Set(prev);
                    if (next.has(zone.id)) next.delete(zone.id);
                    else next.add(zone.id);
                    return next;
                  });
                } else if (selectedCanvasIds.size > 1 && selectedCanvasIds.has(zone.id)) {
                  // Keep group
                } else {
                  selectZone(zone);
                }
              }}
              moveSelectedGroup={moveSelectedGroup}
            />
          ))}

          {/* Images (rendered between zones and equipment) */}
          {(currentDiagram.images || []).map(image => (
            <CanvasImageComponent
              key={image.id}
              image={image}
              zoom={zoom}
              isSelected={selectedImage?.id === image.id}
              isGroupSelected={selectedCanvasIds.size > 1 && selectedCanvasIds.has(image.id)}
              onSelect={() => {
                if (shiftHeldRef.current) {
                  setSelectedCanvasIds(prev => {
                    const next = new Set(prev);
                    if (next.has(image.id)) next.delete(image.id);
                    else next.add(image.id);
                    return next;
                  });
                } else if (selectedCanvasIds.size > 1 && selectedCanvasIds.has(image.id)) {
                  // Keep group
                } else {
                  selectImage(image);
                }
              }}
              onUpdate={(updates) => updateImage(image.id, updates)}
              onRemove={() => removeImage(image.id)}
              canvasRef={canvasRef}
              pan={pan}
              moveSelectedGroup={moveSelectedGroup}
            />
          ))}

          {/* Text elements (rendered between images and connections) */}
          {(currentDiagram.texts || []).map(text => (
            <CanvasTextComponent
              key={text.id}
              text={text}
              zoom={zoom}
              isSelected={selectedText?.id === text.id}
              isGroupSelected={selectedCanvasIds.size > 1 && selectedCanvasIds.has(text.id)}
              onSelect={() => {
                if (shiftHeldRef.current) {
                  setSelectedCanvasIds(prev => {
                    const next = new Set(prev);
                    if (next.has(text.id)) next.delete(text.id);
                    else next.add(text.id);
                    return next;
                  });
                } else if (selectedCanvasIds.size > 1 && selectedCanvasIds.has(text.id)) {
                  // Keep group
                } else {
                  selectText(text);
                }
              }}
              onUpdate={(updates) => updateText(text.id, updates)}
              onRemove={() => removeText(text.id)}
              canvasRef={canvasRef}
              pan={pan}
              moveSelectedGroup={moveSelectedGroup}
            />
          ))}

          {/* Connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width="100%"
            height="100%"
            style={{ overflow: 'visible' }}
          >
            {/* Arrow markers definitions */}
            <defs>
              {currentDiagram.connections.map(connection => {
                const color = connection.color || getProtocolColor(connection.protocol, currentDiagram?.settings);
                return (
                  <React.Fragment key={`markers-${connection.id}`}>
                    <marker
                      id={`arrow-end-${connection.id}`}
                      viewBox="0 0 12 12"
                      markerWidth={12}
                      markerHeight={12}
                      refX={12}
                      refY={6}
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M 0 0 L 12 6 L 0 12 z" fill={color} stroke={color} />
                    </marker>
                    <marker
                      id={`arrow-start-${connection.id}`}
                      viewBox="0 0 12 12"
                      markerWidth={12}
                      markerHeight={12}
                      refX={0}
                      refY={6}
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M 12 0 L 0 6 L 12 12 z" fill={color} stroke={color} />
                    </marker>
                  </React.Fragment>
                );
              })}
            </defs>
            
            {currentDiagram.connections.map(connection => {
              const pathType = connection.pathType || 'orthogonal';
              const path = getConnectionPath(connection);
              const color = connection.color || getProtocolColor(connection.protocol, currentDiagram?.settings);
              const labelPos = getConnectionLabelPosition(connection);
              const isEditing = editingConnectionId === connection.id;
              const isSelected = selectedConnection?.id === connection.id;
              
              // Arrow markers
              const markerStart = connection.arrowStart ? `url(#arrow-start-${connection.id})` : undefined;
              const markerEnd = connection.arrowEnd ? `url(#arrow-end-${connection.id})` : undefined;
              
              return (
                <g 
                  key={connection.id} 
                  className="pointer-events-auto cursor-grab active:cursor-grabbing"
                  onClick={() => handleConnectionClick(connection.id)}
                  onDoubleClick={(e) => handleConnectionDoubleClick(e, connection.id)}
                >
                  {/* Wider invisible path for easier clicking and dragging */}
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={16}
                    fill="none"
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => handleConnectionMouseDown(e, connection.id)}
                  />
                  <path
                    d={path}
                    stroke={color}
                    strokeWidth={isSelected ? (connection.strokeWidth ?? strokeWidth) + 1 : (connection.strokeWidth ?? strokeWidth)}
                    fill="none"
                    strokeDasharray={(connection.style === 'dashed' || connection.protocol === 'lorawan') ? '8 4' : undefined}
                    markerStart={markerStart}
                    markerEnd={markerEnd}
                    className={cn(
                      "transition-all",
                      selectedEquipment && !isSelected && "opacity-50"
                    )}
                  />
                  
                  {/* Security padlock icon */}
                  {connection.isSecure && (() => {
                    const iconOffset = connection.secureIconOffset || { x: 45, y: -8 };
                    return (
                      <g 
                        transform={`translate(${labelPos.x + iconOffset.x}, ${labelPos.y + iconOffset.y})`}
                        className="cursor-move"
                        onMouseDown={(e) => handleSecureIconMouseDown(e, connection.id)}
                      >
                        <circle
                          cx="0"
                          cy="0"
                          r="12"
                          className="fill-background/95 hover:fill-background"
                          stroke={color}
                          strokeWidth={2}
                        />
                        <g transform="translate(-7, -8) scale(0.6)">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill={color} />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2.5" fill="none" />
                        </g>
                      </g>
                    );
                  })()}
                   {/* Path type selector when selected */}
                  {isSelected && !isEditing && (
                    <foreignObject
                      x={labelPos.x - 90}
                      y={labelPos.y + 12}
                      width={180}
                      height={32}
                    >
                      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-md">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateConnection(connection.id, { pathType: 'straight', controlPoints: [] });
                              }}
                              className={cn(
                                "p-1.5 rounded hover:bg-secondary transition-colors",
                                pathType === 'straight' && "bg-primary text-primary-foreground hover:bg-primary"
                              )}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Ligne droite</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateConnection(connection.id, { pathType: 'curved', controlPoints: [] });
                              }}
                              className={cn(
                                "p-1.5 rounded hover:bg-secondary transition-colors",
                                pathType === 'curved' && "bg-primary text-primary-foreground hover:bg-primary"
                              )}
                            >
                              <Spline className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Courbe</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateConnection(connection.id, { pathType: 'orthogonal', controlPoints: [] });
                              }}
                              className={cn(
                                "p-1.5 rounded hover:bg-secondary transition-colors",
                                pathType === 'orthogonal' && "bg-primary text-primary-foreground hover:bg-primary"
                              )}
                            >
                              <CornerDownRight className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Orthogonal</TooltipContent>
                        </Tooltip>
                        <div className="w-px h-5 bg-border mx-0.5" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addControlPoint(connection);
                              }}
                              className="p-1.5 rounded hover:bg-secondary transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Ajouter un point</TooltipContent>
                        </Tooltip>
                      </div>
                    </foreignObject>
                  )}

                  {/* Control points (all waypoints) */}
                  {isSelected && connection.controlPoints && connection.controlPoints.length > 0 && connection.controlPoints.map((cp) => (
                    <g key={cp.id}>
                      <circle
                        cx={cp.x}
                        cy={cp.y}
                        r={6}
                        className="fill-primary stroke-background cursor-move"
                        strokeWidth={2}
                        onMouseDown={(e) => handleControlPointMouseDown(e as unknown as React.MouseEvent, connection.id, cp.id)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          removeControlPoint(connection.id, cp.id);
                        }}
                      />
                      {/* Delete button on hover */}
                      <g
                        className="opacity-0 hover:opacity-100 cursor-pointer"
                        transform={`translate(${cp.x + 8}, ${cp.y - 8})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeControlPoint(connection.id, cp.id);
                        }}
                      >
                        <circle r={7} className="fill-destructive" />
                        <text x={0} y={4} textAnchor="middle" fontSize={10} className="fill-destructive-foreground font-bold select-none pointer-events-none">×</text>
                      </g>
                    </g>
                  ))}
                  
                  {/* Connection name label */}
                  {isEditing ? (
                    <foreignObject
                      x={labelPos.x - 60}
                      y={labelPos.y - 12}
                      width={120}
                      height={24}
                    >
                      <Input
                        value={editingConnectionName}
                        onChange={(e) => setEditingConnectionName(e.target.value)}
                        onBlur={handleConnectionNameSave}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-6 text-xs text-center px-1"
                        placeholder="Nom du lien..."
                        autoFocus
                      />
                    </foreignObject>
                  ) : connection.name ? (
                    <g
                      className="cursor-move"
                      onMouseDown={(e) => handleLabelMouseDown(e, connection.id)}
                    >
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        className="text-xs font-medium"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={color}
                      >
                        {connection.name}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
            
            {/* Temporary connection line while dragging */}
            {draggingConnection && (
              <g>
                <line
                  x1={draggingConnection.startX}
                  y1={draggingConnection.startY}
                  x2={draggingConnection.currentX}
                  y2={draggingConnection.currentY}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
                <circle
                  cx={draggingConnection.currentX}
                  cy={draggingConnection.currentY}
                  r={6}
                  fill="hsl(var(--primary))"
                  className="animate-pulse"
                />
              </g>
            )}
          </svg>

          {/* Equipment nodes */}
          {currentDiagram.equipment.map(equipment => {
            const manufacturerName = getManufacturerName(equipment.manufacturerId);
            
            const defaultBorderColor = equipment.type === 'cloud' ? '#7c3aed' : 
                               equipment.type === 'interface' ? '#0d9488' :
                               equipment.type === 'automate' ? '#1d4ed8' :
                               '#cbd5e1';
            const defaultHeaderColor = equipment.type === 'cloud' ? '#a78bfa' : 
                               equipment.type === 'interface' ? '#2dd4bf' :
                               equipment.type === 'automate' ? '#3b82f6' :
                               '#e2e8f0';
            
            const borderColor = equipment.borderColor || defaultBorderColor;
            const headerColor = equipment.headerBackgroundColor || defaultHeaderColor;
            
            const equipmentNode = (
              <div
                className={cn(
                  "equipment-node absolute select-none group overflow-visible",
                  "bg-card border-2 rounded-xl shadow-equipment",
                  "transition-shadow duration-200",
                  "hover:shadow-equipment-hover",
                  selectedEquipment?.canvasId === equipment.canvasId && "ring-2 ring-primary ring-offset-2",
                  selectedCanvasIds.size > 1 && selectedCanvasIds.has(equipment.canvasId) && "ring-2 ring-blue-500 ring-offset-2 ring-dashed",
                  isConnecting && connectionSource === equipment.canvasId && "ring-2 ring-accent",
                  isConnecting && connectionSource !== equipment.canvasId && "hover:ring-2 hover:ring-accent cursor-crosshair"
                )}
                style={{
                  left: equipment.x,
                  top: equipment.y,
                  width: getCardWidth(equipment),
                  height: getCardHeight(equipment),
                  borderColor: borderColor,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, equipment)}
              >
            {/* Connection handles on all 4 sides */}
                {/* Top handle */}
                <button
                  data-connection-handle="true"
                  data-equipment-id={equipment.canvasId}
                  data-handle-side="top"
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 -top-2 z-10",
                    "w-4 h-4 rounded-full bg-primary/80 border-2 border-background",
                    "opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-primary",
                    "transition-all duration-200 cursor-crosshair",
                    (selectedEquipment?.canvasId === equipment.canvasId || isConnecting || draggingConnection) && "opacity-100",
                    isConnecting && connectionSource === equipment.canvasId && "bg-accent",
                    draggingConnection?.sourceId === equipment.canvasId && "bg-accent scale-125",
                    draggingConnection && draggingConnection.sourceId !== equipment.canvasId && "bg-green-500 hover:bg-green-400 animate-pulse"
                  )}
                  onMouseDown={(e) => handleConnectionHandleMouseDown(e, equipment, 'top')}
                  onMouseUp={(e) => handleConnectionHandleMouseUp(e, equipment, 'top')}
                  title="Connecter depuis le haut"
                />
                
                {/* Right handle */}
                <button
                  data-connection-handle="true"
                  data-equipment-id={equipment.canvasId}
                  data-handle-side="right"
                  className={cn(
                    "absolute -right-2 top-1/2 -translate-y-1/2 z-10",
                    "w-4 h-4 rounded-full bg-primary/80 border-2 border-background",
                    "opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-primary",
                    "transition-all duration-200 cursor-crosshair",
                    (selectedEquipment?.canvasId === equipment.canvasId || isConnecting || draggingConnection) && "opacity-100",
                    isConnecting && connectionSource === equipment.canvasId && "bg-accent",
                    draggingConnection?.sourceId === equipment.canvasId && "bg-accent scale-125",
                    draggingConnection && draggingConnection.sourceId !== equipment.canvasId && "bg-green-500 hover:bg-green-400 animate-pulse"
                  )}
                  onMouseDown={(e) => handleConnectionHandleMouseDown(e, equipment, 'right')}
                  onMouseUp={(e) => handleConnectionHandleMouseUp(e, equipment, 'right')}
                  title="Connecter depuis la droite"
                />
                
                {/* Bottom handle */}
                <button
                  data-connection-handle="true"
                  data-equipment-id={equipment.canvasId}
                  data-handle-side="bottom"
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 -bottom-2 z-10",
                    "w-4 h-4 rounded-full bg-primary/80 border-2 border-background",
                    "opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-primary",
                    "transition-all duration-200 cursor-crosshair",
                    (selectedEquipment?.canvasId === equipment.canvasId || isConnecting || draggingConnection) && "opacity-100",
                    isConnecting && connectionSource === equipment.canvasId && "bg-accent",
                    draggingConnection?.sourceId === equipment.canvasId && "bg-accent scale-125",
                    draggingConnection && draggingConnection.sourceId !== equipment.canvasId && "bg-green-500 hover:bg-green-400 animate-pulse"
                  )}
                  onMouseDown={(e) => handleConnectionHandleMouseDown(e, equipment, 'bottom')}
                  onMouseUp={(e) => handleConnectionHandleMouseUp(e, equipment, 'bottom')}
                  title="Connecter depuis le bas"
                />
                
                {/* Left handle */}
                <button
                  data-connection-handle="true"
                  data-equipment-id={equipment.canvasId}
                  data-handle-side="left"
                  className={cn(
                    "absolute -left-2 top-1/2 -translate-y-1/2 z-10",
                    "w-4 h-4 rounded-full bg-primary/80 border-2 border-background",
                    "opacity-0 group-hover:opacity-100 hover:scale-125 hover:bg-primary",
                    "transition-all duration-200 cursor-crosshair",
                    (selectedEquipment?.canvasId === equipment.canvasId || isConnecting || draggingConnection) && "opacity-100",
                    isConnecting && connectionSource === equipment.canvasId && "bg-accent",
                    draggingConnection?.sourceId === equipment.canvasId && "bg-accent scale-125",
                    draggingConnection && draggingConnection.sourceId !== equipment.canvasId && "bg-green-500 hover:bg-green-400 animate-pulse"
                  )}
                  onMouseDown={(e) => handleConnectionHandleMouseDown(e, equipment, 'left')}
                  onMouseUp={(e) => handleConnectionHandleMouseUp(e, equipment, 'left')}
                  title="Connecter depuis la gauche"
                />
                
                {(() => {
                  // Calculate dynamic spacing based on card height
                  const effectiveHeight = getCardHeight(equipment);
                  const basePadding = Math.max(8, Math.min(16, effectiveHeight * 0.1));
                  const iconSize = Math.max(28, Math.min(40, effectiveHeight * 0.35));
                  const gap = Math.max(4, Math.min(12, effectiveHeight * 0.08));
                  
                  // Font sizes based on equipment's fontSize setting
                  const fontSizes = equipment.fontSize ? FONT_SIZE_VALUES[equipment.fontSize] : FONT_SIZE_VALUES.medium;
                  const labelFontSize = fontSizes.label;
                  const detailFontSize = fontSizes.detail;
                  
                  return expertMode ? (
                    // Expert mode: show all details
                    <div 
                      className="relative h-full flex flex-col justify-between"
                      style={{ padding: basePadding, gap: gap }}
                    >
                      {/* Quantity badge */}
                      {equipment.quantity && equipment.quantity > 1 && (
                        <div 
                          className="absolute -top-2 -left-2 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md z-10"
                          style={{ backgroundColor: borderColor }}
                        >
                          ×{equipment.quantity}
                        </div>
                      )}

                      <div className="flex items-center" style={{ gap: gap }}>
                        <div 
                          className="rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: headerColor,
                            width: iconSize,
                            height: iconSize,
                          }}
                        >
                          <DynamicIcon 
                            name={equipment.icon} 
                            className="text-white"
                            style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
                          />
                        </div>
                        <div className="flex-1 min-w-0" style={{ gap: gap * 0.4 }}>
                          <div 
                            className="font-semibold text-foreground truncate"
                            style={{ fontSize: labelFontSize }}
                          >
                            {equipment.label}
                          </div>
                          <div 
                            className="text-muted-foreground truncate" 
                            style={{ marginTop: gap * 0.3, fontSize: detailFontSize }}
                          >
                            {equipment.name}
                          </div>
                        </div>
                      </div>

                      {/* Flexible content area */}
                      <div className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ gap: gap * 0.8 }}>
                        {manufacturerName && (
                          <div 
                            className="flex items-center gap-1 text-muted-foreground"
                            style={{ fontSize: detailFontSize }}
                          >
                            <Factory className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate font-medium">{manufacturerName}</span>
                          </div>
                        )}

                        <ProtocolBadge protocol={equipment.protocol} />
                        {equipment.ipAddress && (
                          <div 
                            className="text-muted-foreground font-mono truncate"
                            style={{ fontSize: detailFontSize }}
                          >
                            {equipment.ipAddress}
                          </div>
                        )}
                      </div>

                      {/* Location badge */}
                      {equipment.showLocation && equipment.location && (
                        <div 
                          className="absolute flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm border"
                          style={{ 
                            bottom: -10,
                            right: 4,
                            fontSize: Math.max(8, detailFontSize - 1),
                            backgroundColor: 'hsl(152, 60%, 95%)',
                            borderColor: 'hsl(152, 45%, 70%)',
                            color: 'hsl(152, 50%, 30%)',
                          }}
                        >
                          <MapPin style={{ width: detailFontSize - 2, height: detailFontSize - 2 }} />
                          <span className="font-medium whitespace-nowrap">{equipment.location}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Simple mode: only label and protocol
                    <div 
                      className="flex items-center relative h-full"
                      style={{ padding: basePadding, gap: gap }}
                    >
                      {/* Quantity badge */}
                      {equipment.quantity && equipment.quantity > 1 && (
                        <div 
                          className="absolute -top-2 -left-2 min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md z-10"
                          style={{ backgroundColor: borderColor }}
                        >
                          ×{equipment.quantity}
                        </div>
                      )}
                      <div 
                        className="rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: headerColor,
                          width: iconSize * 1.4,
                          height: iconSize * 1.4,
                        }}
                      >
                        <DynamicIcon 
                          name={equipment.icon} 
                          className="text-white"
                          style={{ width: iconSize * 0.7, height: iconSize * 0.7 }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0" style={{ gap: gap * 0.6 }}>
                        <span 
                          className="font-semibold text-foreground truncate"
                          style={{ fontSize: labelFontSize }}
                        >
                          {equipment.label}
                        </span>
                        <ProtocolBadge protocol={equipment.protocol} />
                      </div>

                      {/* Location badge */}
                      {equipment.showLocation && equipment.location && (
                        <div 
                          className="absolute flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm border"
                          style={{ 
                            bottom: -10,
                            right: 4,
                            fontSize: Math.max(8, detailFontSize - 1),
                            backgroundColor: 'hsl(152, 60%, 95%)',
                            borderColor: 'hsl(152, 45%, 70%)',
                            color: 'hsl(152, 50%, 30%)',
                          }}
                        >
                          <MapPin style={{ width: detailFontSize - 2, height: detailFontSize - 2 }} />
                          <span className="font-medium whitespace-nowrap">{equipment.location}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Communication card (gateway) */}
                {equipment.hasCommCard && (() => {
                  const pos: CommCardPosition = equipment.commCardPosition || 'right';
                  const cw = getCardWidth(equipment);
                  const ch = getCardHeight(equipment);
                  const overlap = 8;
                  const commW = 70;
                  const commH = 55;
                  const commCardColor = getProtocolColor(equipment.commCardProtocol || 'none', currentDiagram?.settings);
                  
                  const posStyle: React.CSSProperties = 
                    pos === 'right' ? { left: cw - overlap, top: '50%', transform: 'translateY(-50%)' } :
                    pos === 'left' ? { right: cw - overlap, top: '50%', transform: 'translateY(-50%)' } :
                    pos === 'top' ? { left: '50%', bottom: ch - overlap, transform: 'translateX(-50%)' } :
                    /* bottom */ { left: '50%', top: ch - overlap, transform: 'translateX(-50%)' };

                  return (
                    <div
                      className="absolute rounded-lg border-2 bg-card flex flex-col items-center justify-center text-center shadow-sm group/comm"
                      style={{
                        ...posStyle,
                        width: commW,
                        height: commH,
                        borderColor: commCardColor,
                        color: commCardColor,
                        fontSize: 9,
                        zIndex: 1,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {/* Comm card connection handles */}
                      {(['top', 'right', 'bottom', 'left'] as HandleSide[]).map(side => {
                        const handleCn = cn(
                          "absolute z-20",
                          "w-3 h-3 rounded-full border-2 border-background",
                          "opacity-0 group-hover/comm:opacity-100 hover:scale-125",
                          "transition-all duration-200 cursor-crosshair",
                          (isConnecting || draggingConnection) && "opacity-100",
                          draggingConnection && draggingConnection.sourceId !== equipment.canvasId && "animate-pulse"
                        );
                        const posStyles: React.CSSProperties =
                          side === 'top' ? { left: '50%', top: -6, transform: 'translateX(-50%)' } :
                          side === 'right' ? { right: -6, top: '50%', transform: 'translateY(-50%)' } :
                          side === 'bottom' ? { left: '50%', bottom: -6, transform: 'translateX(-50%)' } :
                          { left: -6, top: '50%', transform: 'translateY(-50%)' };
                        
                        return (
                          <button
                            key={side}
                            data-connection-handle="true"
                            className={handleCn}
                            style={{ ...posStyles, backgroundColor: commCardColor }}
                            onMouseDown={(e) => handleConnectionHandleMouseDown(e, equipment, side, true)}
                            onMouseUp={(e) => handleConnectionHandleMouseUp(e, equipment, side, true)}
                            title={`Connecter depuis la carte de com (${side})`}
                          />
                        );
                      })}
                      <span className="font-semibold leading-tight" style={{ fontSize: 8 }}>{equipment.commCardLabel || 'Carte de com'}</span>
                      <span className="font-bold mt-0.5" style={{ fontSize: 10 }}>
                        {equipment.commCardProtocol ? PROTOCOL_LABELS[equipment.commCardProtocol] : ''}
                      </span>
                      {equipment.quantity && equipment.quantity > 1 && (
                        <span className="text-[8px] mt-0.5">×{equipment.quantity}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );

            // Only show tooltip in simple mode
            if (expertMode) {
              return <div key={equipment.canvasId}>{equipmentNode}</div>;
            }

            return (
              <TooltipProvider key={equipment.canvasId} delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {equipmentNode}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold">{equipment.label}</p>
                      <p className="text-xs text-muted-foreground">{equipment.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{EQUIPMENT_TYPE_LABELS[equipment.type]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Catégorie:</span>
                        <span>{CATEGORY_LABELS[equipment.category]}</span>
                      </div>
                      {manufacturerName && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Fabricant:</span>
                          <span>{manufacturerName}</span>
                        </div>
                      )}
                      {equipment.reference && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Référence:</span>
                          <span>{equipment.reference}</span>
                        </div>
                      )}
                      {equipment.quantity && equipment.quantity > 1 && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Quantité:</span>
                          <span>{equipment.quantity}</span>
                        </div>
                      )}
                      {equipment.ipAddress && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">IP:</span>
                          <span className="font-mono">{equipment.ipAddress}</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Lasso selection rectangle */}
          {selectionBox && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded-sm"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.currentX),
                top: Math.min(selectionBox.startY, selectionBox.currentY),
                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                height: Math.abs(selectionBox.currentY - selectionBox.startY),
                zIndex: 9999,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

DiagramCanvas.displayName = 'DiagramCanvas';