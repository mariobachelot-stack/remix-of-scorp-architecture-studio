import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Diagram, 
  CanvasEquipment, 
  Connection, 
  Equipment,
  Zone,
  CanvasImage,
  CanvasText,
  DiagramSettings,
  DEFAULT_DIAGRAM_SETTINGS,
  DEFAULT_NON_EXPERT_SETTINGS,
  DEFAULT_EXPERT_SETTINGS,
  HandleSide,
  ModeSettings,
} from '@/types/equipment';
import { useDiagrams } from '@/hooks/useDiagrams';
import { useEquipmentLibrary as useEquipmentLibraryHook } from '@/hooks/useEquipmentLibrary';
import { DiagramTemplate } from '@/hooks/useDiagramTemplates';
import { toast } from 'sonner';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface DiagramContextType {
  diagrams: Diagram[];
  currentDiagram: Diagram | null;
  equipmentLibrary: Equipment[];
  selectedEquipment: CanvasEquipment | null;
  selectedConnection: Connection | null;
  selectedZone: Zone | null;
  selectedImage: CanvasImage | null;
  selectedText: CanvasText | null;
  isConnecting: boolean;
  connectionSource: string | null;
  isLoading: boolean;
  saveStatus: SaveStatus;
  
  // Diagram operations
  createDiagram: (name: string, description?: string, userId?: string, template?: DiagramTemplate) => Promise<Diagram>;
  openDiagram: (id: string) => void;
  saveDiagram: () => Promise<void>;
  deleteDiagram: (id: string) => void;
  duplicateDiagram: (id: string) => Promise<Diagram>;
  updateDiagramName: (name: string) => void;
  updateDiagramSettings: (settings: Partial<DiagramSettings>) => void;
  closeDiagram: () => void;
  
  // Equipment operations
  addEquipmentToCanvas: (equipment: Equipment, x: number, y: number) => void;
  updateEquipmentPosition: (canvasId: string, x: number, y: number) => void;
  updateEquipmentDetails: (canvasId: string, updates: Partial<CanvasEquipment>) => void;
  removeEquipmentFromCanvas: (canvasId: string) => void;
  selectEquipment: (equipment: CanvasEquipment | null) => void;
  
  // Connection operations
  startConnection: (sourceId: string) => void;
  completeConnection: (targetId: string, sourceHandle?: HandleSide, targetHandle?: HandleSide, sourceFromCommCard?: boolean, targetFromCommCard?: boolean) => void;
  cancelConnection: () => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;
  removeConnection: (connectionId: string) => void;
  selectConnection: (connection: Connection | null) => void;
  
  // Zone operations
  addZone: (x: number, y: number) => void;
  updateZone: (zoneId: string, updates: Partial<Zone>) => void;
  removeZone: (zoneId: string) => void;
  selectZone: (zone: Zone | null) => void;
  
  // Image operations
  addImage: (url: string, name: string, x: number, y: number, width: number, height: number) => void;
  updateImage: (imageId: string, updates: Partial<CanvasImage>) => void;
  removeImage: (imageId: string) => void;
  selectImage: (image: CanvasImage | null) => void;

  // Text operations
  addText: (x: number, y: number) => void;
  updateText: (textId: string, updates: Partial<CanvasText>) => void;
  removeText: (textId: string) => void;
  selectText: (text: CanvasText | null) => void;

  // Clipboard operations
  copySelection: () => void;
  pasteClipboard: (offsetX?: number, offsetY?: number) => void;
  hasClipboard: boolean;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Multi-selection (group after paste or lasso)
  selectedCanvasIds: Set<string>;
  setSelectedCanvasIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  moveSelectedGroup: (deltaX: number, deltaY: number) => void;

  // Expert mode (shared between canvas and properties panel)
  expertMode: boolean;
  setExpertMode: React.Dispatch<React.SetStateAction<boolean>>;
}

// eslint-disable-next-line react-refresh/only-export-components
const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

export const DiagramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    diagrams: dbDiagrams, 
    isLoading,
    createDiagram: dbCreateDiagram,
    updateDiagram: dbUpdateDiagram,
    deleteDiagram: dbDeleteDiagram,
    duplicateDiagram: dbDuplicateDiagram,
  } = useDiagrams();

  const { equipment: dbEquipment } = useEquipmentLibraryHook();

  const [currentDiagram, setCurrentDiagramRaw] = useState<Diagram | null>(null);
  const [expertMode, setExpertModeRaw] = useState(false);

  // Wrap setExpertMode to also persist into diagram settings
  const setExpertMode: React.Dispatch<React.SetStateAction<boolean>> = useCallback((value) => {
    setExpertModeRaw(value);
    // Sync into current diagram settings so it gets auto-saved
    setCurrentDiagramRaw(prev => {
      if (!prev) return prev;
      const newExpertMode = typeof value === 'function' ? value(prev.settings?.expertMode ?? false) : value;
      if (prev.settings?.expertMode === newExpertMode) return prev;
      return {
        ...prev,
        settings: { ...DEFAULT_DIAGRAM_SETTINGS, ...prev.settings, expertMode: newExpertMode },
      };
    });
  }, []);

  // ─── Undo / Redo history ──────────────────────────────────────────────
  const MAX_HISTORY = 50;
  const undoStackRef = useRef<Diagram[]>([]);
  const redoStackRef = useRef<Diagram[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Debounce timer for continuous actions (drag, slider, etc.)
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHistoryRef = useRef(false); // flag to skip history push during undo/redo

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  /** Push current diagram to undo stack (debounced for continuous ops). */
  const pushHistory = useCallback((diagram: Diagram) => {
    if (skipHistoryRef.current) return;
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      undoStackRef.current = [...undoStackRef.current.slice(-(MAX_HISTORY - 1)), diagram];
      redoStackRef.current = []; // clear redo on new action
      syncHistoryFlags();
    }, 300);
  }, [syncHistoryFlags]);

  /** Wrapper around setCurrentDiagramRaw that records history. */
  const setCurrentDiagram = useCallback((diagram: Diagram | null) => {
    setCurrentDiagramRaw(prev => {
      if (prev && diagram && prev.id === diagram.id) {
        pushHistory(prev);
      }
      return diagram;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    setCurrentDiagramRaw(prev => {
      if (prev) {
        redoStackRef.current = [...redoStackRef.current, prev];
      }
      const restored = undoStackRef.current[undoStackRef.current.length - 1];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      skipHistoryRef.current = true;
      syncHistoryFlags();
      setTimeout(() => { skipHistoryRef.current = false; }, 50);
      return restored;
    });
  }, [syncHistoryFlags]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    setCurrentDiagramRaw(prev => {
      if (prev) {
        undoStackRef.current = [...undoStackRef.current, prev];
      }
      const restored = redoStackRef.current[redoStackRef.current.length - 1];
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      skipHistoryRef.current = true;
      syncHistoryFlags();
      setTimeout(() => { skipHistoryRef.current = false; }, 50);
      return restored;
    });
  }, [syncHistoryFlags]);

  // Reset history when diagram changes
  const currentDiagramIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentDiagram?.id !== currentDiagramIdRef.current) {
      currentDiagramIdRef.current = currentDiagram?.id ?? null;
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryFlags();
    }
  }, [currentDiagram?.id, syncHistoryFlags]);
  // Use DB equipment
  const equipmentLibrary: Equipment[] = dbEquipment.map(e => ({
    id: e.id,
    label: e.label,
    name: e.name,
    type: e.type,
    category: e.category,
    protocol: e.protocol,
    icon: e.icon,
    description: e.description,
    reference: e.reference,
    borderColor: e.borderColor,
    headerBackgroundColor: e.headerBackgroundColor,
  }));
  const [selectedEquipment, setSelectedEquipment] = useState<CanvasEquipment | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedImage, setSelectedImage] = useState<CanvasImage | null>(null);
  const [selectedText, setSelectedText] = useState<CanvasText | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDiagramRef = useRef<string | null>(null);
  
  // Sync currentDiagram with database version when diagrams update
  // Only sync if the DB version is newer AND we're not in the middle of local updates
  // Use a ref to track if we're doing a local update to prevent oscillation
  const isLocalUpdate = React.useRef(false);
  
  useEffect(() => {
    if (currentDiagram && !isLocalUpdate.current && saveStatus !== 'unsaved') {
      const updated = dbDiagrams.find(d => d.id === currentDiagram.id);
      if (updated && updated.updatedAt > currentDiagram.updatedAt) {
        setCurrentDiagram(updated);
      }
    }
  }, [dbDiagrams, currentDiagram, saveStatus]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!currentDiagram) {
      setSaveStatus('saved');
      return;
    }

    // Create a hash of the current diagram state
    const diagramHash = JSON.stringify({
      equipment: currentDiagram.equipment,
      connections: currentDiagram.connections,
      zones: currentDiagram.zones,
      images: currentDiagram.images,
      texts: currentDiagram.texts,
      settings: currentDiagram.settings,
      name: currentDiagram.name,
      description: currentDiagram.description,
    });

    // Skip if nothing changed
    if (diagramHash === lastSavedDiagramRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await dbUpdateDiagram({
          id: currentDiagram.id,
          name: currentDiagram.name,
          description: currentDiagram.description,
          equipment: currentDiagram.equipment,
          connections: currentDiagram.connections,
          zones: currentDiagram.zones,
          images: currentDiagram.images,
          texts: currentDiagram.texts,
          settings: currentDiagram.settings,
        });
        lastSavedDiagramRef.current = diagramHash;
        setSaveStatus('saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      }
    }, 2000); // 2 second debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentDiagram, dbUpdateDiagram]);

  const createDiagram = useCallback(async (name: string, description?: string, userId?: string, template?: DiagramTemplate): Promise<Diagram> => {
    const newDiagram = await dbCreateDiagram({ 
      name, 
      description, 
      userId,
      equipment: template?.equipment,
      connections: template?.connections,
      zones: template?.zones,
      settings: template?.settings,
    });
    setCurrentDiagram(newDiagram);
    toast.success('Schéma créé');
    return newDiagram;
  }, [dbCreateDiagram]);

  const openDiagram = useCallback((id: string) => {
    const diagram = dbDiagrams.find(d => d.id === id);
    if (diagram) {
      setCurrentDiagram(diagram);
      setSelectedEquipment(null);
      setSelectedConnection(null);
      // Restore persisted expert mode
      setExpertMode(diagram.settings?.expertMode ?? false);
    }
  }, [dbDiagrams]);

  const saveDiagram = useCallback(async () => {
    if (currentDiagram) {
      await dbUpdateDiagram({
        id: currentDiagram.id,
        name: currentDiagram.name,
        description: currentDiagram.description,
        equipment: currentDiagram.equipment,
        connections: currentDiagram.connections,
        zones: currentDiagram.zones,
        images: currentDiagram.images,
        texts: currentDiagram.texts,
        settings: currentDiagram.settings,
      });
      const diagramHash = JSON.stringify({
        equipment: currentDiagram.equipment,
        connections: currentDiagram.connections,
        zones: currentDiagram.zones,
        images: currentDiagram.images,
        texts: currentDiagram.texts,
        settings: currentDiagram.settings,
        name: currentDiagram.name,
        description: currentDiagram.description,
      });
      lastSavedDiagramRef.current = diagramHash;
      setSaveStatus('saved');
      toast.success('Schéma enregistré');
    }
  }, [currentDiagram, dbUpdateDiagram]);

  const deleteDiagram = useCallback((id: string) => {
    dbDeleteDiagram(id);
    if (currentDiagram?.id === id) {
      setCurrentDiagram(null);
    }
    toast.success('Schéma supprimé');
  }, [currentDiagram, dbDeleteDiagram]);

  const duplicateDiagram = useCallback(async (id: string): Promise<Diagram> => {
    const duplicate = await dbDuplicateDiagram(id);
    toast.success('Schéma dupliqué');
    return duplicate;
  }, [dbDuplicateDiagram]);

  const updateDiagramName = useCallback((name: string) => {
    if (currentDiagram) {
      const updated = { ...currentDiagram, name, updatedAt: new Date() };
      setCurrentDiagram(updated);
      // Auto-save name change
      dbUpdateDiagram({ id: updated.id, name });
    }
  }, [currentDiagram, dbUpdateDiagram]);

  const updateDiagramSettings = useCallback((settings: Partial<DiagramSettings>) => {
    if (currentDiagram) {
      isLocalUpdate.current = true;
      const currentSettings = currentDiagram.settings || DEFAULT_DIAGRAM_SETTINGS;

      const normalize = (v: unknown, fallback: number) => {
        const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
        return Number.isFinite(n) ? n : fallback;
      };

      const normalizeModeSettings = (mode: Partial<ModeSettings> | undefined, defaults: ModeSettings): ModeSettings => ({
        equipmentCardWidth: normalize(mode?.equipmentCardWidth, defaults.equipmentCardWidth),
        equipmentCardHeight: normalize(mode?.equipmentCardHeight, defaults.equipmentCardHeight),
      });

      const nextSettings: DiagramSettings = {
        connectionStrokeWidth: normalize(
          settings.connectionStrokeWidth ?? currentSettings.connectionStrokeWidth,
          DEFAULT_DIAGRAM_SETTINGS.connectionStrokeWidth
        ),
        equipmentCardWidth: normalize(
          settings.equipmentCardWidth ?? currentSettings.equipmentCardWidth,
          DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth
        ),
        equipmentCardHeight: normalize(
          settings.equipmentCardHeight ?? currentSettings.equipmentCardHeight,
          DEFAULT_DIAGRAM_SETTINGS.equipmentCardHeight
        ),
        nonExpertSettings: normalizeModeSettings(
          settings.nonExpertSettings ?? currentSettings.nonExpertSettings,
          DEFAULT_NON_EXPERT_SETTINGS
        ),
        expertSettings: normalizeModeSettings(
          settings.expertSettings ?? currentSettings.expertSettings,
          DEFAULT_EXPERT_SETTINGS
        ),
      };

      const updated = { ...currentDiagram, settings: nextSettings, updatedAt: new Date() };
      setCurrentDiagram(updated);

      // IMPORTANT: persist settings WITHOUT losing diagram content.
      // The diagram content might only exist locally if the user hasn't clicked "Enregistrer" yet.
      dbUpdateDiagram({
        id: updated.id,
        settings: nextSettings,
        equipment: updated.equipment,
        connections: updated.connections,
        zones: updated.zones,
        images: updated.images,
        name: updated.name,
        description: updated.description,
      }).finally(() => {
        isLocalUpdate.current = false;
      });
    }
  }, [currentDiagram, dbUpdateDiagram]);

  const closeDiagram = useCallback(async () => {
    if (currentDiagram) {
      await saveDiagram();
    }
    setCurrentDiagram(null);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedZone(null);
  }, [saveDiagram, currentDiagram]);

  const addEquipmentToCanvas = useCallback((equipment: Equipment, x: number, y: number) => {
    if (!currentDiagram) return;
    
    const canvasEquipment: CanvasEquipment = {
      ...equipment,
      canvasId: uuidv4(),
      x,
      y,
    };
    
    const updated = {
      ...currentDiagram,
      equipment: [...currentDiagram.equipment, canvasEquipment],
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
  }, [currentDiagram]);

  const updateEquipmentPosition = useCallback((canvasId: string, x: number, y: number) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      equipment: currentDiagram.equipment.map(e => 
        e.canvasId === canvasId ? { ...e, x, y } : e
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
  }, [currentDiagram]);

  const updateEquipmentDetails = useCallback((canvasId: string, updates: Partial<CanvasEquipment>) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      equipment: currentDiagram.equipment.map(e => 
        e.canvasId === canvasId ? { ...e, ...updates } : e
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedEquipment?.canvasId === canvasId) {
      setSelectedEquipment({ ...selectedEquipment, ...updates });
    }
  }, [currentDiagram, selectedEquipment]);

  const removeEquipmentFromCanvas = useCallback((canvasId: string) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      equipment: currentDiagram.equipment.filter(e => e.canvasId !== canvasId),
      connections: currentDiagram.connections.filter(
        c => c.sourceId !== canvasId && c.targetId !== canvasId
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedEquipment?.canvasId === canvasId) {
      setSelectedEquipment(null);
    }
  }, [currentDiagram, selectedEquipment]);

  // ─── Multi-selection (group after paste) ────────────────────────────
  const [selectedCanvasIds, setSelectedCanvasIds] = useState<Set<string>>(new Set());
  const selectedCanvasIdsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    selectedCanvasIdsRef.current = selectedCanvasIds;
  }, [selectedCanvasIds]);

  const moveSelectedGroup = useCallback((deltaX: number, deltaY: number) => {
    const ids = selectedCanvasIdsRef.current;
    if (ids.size === 0) return;
    setCurrentDiagramRaw(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        equipment: prev.equipment.map(e =>
          ids.has(e.canvasId) ? { ...e, x: e.x + deltaX, y: e.y + deltaY } : e
        ),
        zones: prev.zones.map(z =>
          ids.has(z.id) ? { ...z, x: z.x + deltaX, y: z.y + deltaY } : z
        ),
        images: (prev.images || []).map(img =>
          ids.has(img.id) ? { ...img, x: img.x + deltaX, y: img.y + deltaY } : img
        ),
        texts: (prev.texts || []).map(t =>
          ids.has(t.id) ? { ...t, x: t.x + deltaX, y: t.y + deltaY } : t
        ),
        updatedAt: new Date(),
      };
    });
  }, []);

  const selectEquipment = useCallback((equipment: CanvasEquipment | null) => {
    setSelectedEquipment(equipment);
    setSelectedConnection(null);
    setSelectedZone(null);
    setSelectedImage(null);
    setSelectedText(null);
    setSelectedCanvasIds(new Set());
  }, []);

  const connectionSourceRef = React.useRef<string | null>(null);

  const startConnection = useCallback((sourceId: string) => {
    setIsConnecting(true);
    setConnectionSource(sourceId);
    connectionSourceRef.current = sourceId;
  }, []);

  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionSource(null);
    connectionSourceRef.current = null;
  }, []);

  const completeConnection = useCallback((targetId: string, sourceHandle?: HandleSide, targetHandle?: HandleSide, sourceFromCommCard?: boolean, targetFromCommCard?: boolean) => {
    const sourceId = connectionSourceRef.current;

    if (!currentDiagram || !sourceId || sourceId === targetId) {
      cancelConnection();
      return;
    }

    // Allow duplicate equipment pairs if comm card flags differ
    const existingConnection = currentDiagram.connections.find(
      c => ((c.sourceId === sourceId && c.targetId === targetId) ||
           (c.sourceId === targetId && c.targetId === sourceId)) &&
           (!!c.sourceFromCommCard === !!sourceFromCommCard) &&
           (!!c.targetFromCommCard === !!targetFromCommCard)
    );

    if (existingConnection) {
      cancelConnection();
      return;
    }

    const sourceEquipment = currentDiagram.equipment.find(e => e.canvasId === sourceId);

    const protocol = sourceEquipment?.protocol || 'ethernet';
    const newConnection: Connection = {
      id: uuidv4(),
      sourceId,
      targetId,
      protocol,
      style: protocol === 'lorawan' ? 'dashed' : 'solid',
      pathType: 'orthogonal',
      sourceHandle,
      targetHandle,
      sourceFromCommCard,
      targetFromCommCard,
    };

    const updated = {
      ...currentDiagram,
      connections: [...currentDiagram.connections, newConnection],
      updatedAt: new Date(),
    };

    setCurrentDiagram(updated);
    cancelConnection();
  }, [currentDiagram, cancelConnection]);

  const updateConnection = useCallback((connectionId: string, updates: Partial<Connection>) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      connections: currentDiagram.connections.map(c => 
        c.id === connectionId ? { ...c, ...updates } : c
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    // Update selectedConnection if it's the one being updated
    if (selectedConnection?.id === connectionId) {
      setSelectedConnection({ ...selectedConnection, ...updates });
    }
  }, [currentDiagram, selectedConnection]);

  const removeConnection = useCallback((connectionId: string) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      connections: currentDiagram.connections.filter(c => c.id !== connectionId),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedConnection?.id === connectionId) {
      setSelectedConnection(null);
    }
  }, [currentDiagram, selectedConnection]);

  const selectConnection = useCallback((connection: Connection | null) => {
    setSelectedConnection(connection);
    setSelectedEquipment(null);
    setSelectedZone(null);
    setSelectedImage(null);
    setSelectedText(null);
    setSelectedCanvasIds(new Set());
  }, []);

  // Zone operations
  const ZONE_COLORS = [
    '#3b82f6', // blue
    '#22c55e', // green  
    '#f97316', // orange
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
  ];

  const addZone = useCallback((x: number, y: number) => {
    if (!currentDiagram) return;
    
    const colorIndex = currentDiagram.zones.length % ZONE_COLORS.length;
    const newZone: Zone = {
      id: uuidv4(),
      name: `Site ${currentDiagram.zones.length + 1}`,
      x,
      y,
      width: 300,
      height: 200,
      color: ZONE_COLORS[colorIndex],
    };
    
    const updated = {
      ...currentDiagram,
      zones: [...currentDiagram.zones, newZone],
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    setSelectedZone(newZone);
    setSelectedEquipment(null);
    setSelectedConnection(null);
  }, [currentDiagram]);

  const updateZone = useCallback((zoneId: string, updates: Partial<Zone>) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      zones: currentDiagram.zones.map(z => 
        z.id === zoneId ? { ...z, ...updates } : z
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedZone?.id === zoneId) {
      setSelectedZone({ ...selectedZone, ...updates });
    }
  }, [currentDiagram, selectedZone]);

  const removeZone = useCallback((zoneId: string) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      zones: currentDiagram.zones.filter(z => z.id !== zoneId),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedZone?.id === zoneId) {
      setSelectedZone(null);
    }
  }, [currentDiagram, selectedZone]);

  const selectZone = useCallback((zone: Zone | null) => {
    setSelectedZone(zone);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedImage(null);
    setSelectedText(null);
    setSelectedCanvasIds(new Set());
  }, []);

  // Image operations
  const addImage = useCallback((url: string, name: string, x: number, y: number, width: number, height: number) => {
    if (!currentDiagram) return;
    
    const newImage: CanvasImage = {
      id: uuidv4(),
      url,
      name,
      x,
      y,
      width,
      height,
    };
    
    const updated = {
      ...currentDiagram,
      images: [...(currentDiagram.images || []), newImage],
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    setSelectedImage(newImage);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedZone(null);
  }, [currentDiagram]);

  const updateImage = useCallback((imageId: string, updates: Partial<CanvasImage>) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      images: (currentDiagram.images || []).map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedImage?.id === imageId) {
      setSelectedImage({ ...selectedImage, ...updates });
    }
  }, [currentDiagram, selectedImage]);

  const removeImage = useCallback((imageId: string) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      images: (currentDiagram.images || []).filter(img => img.id !== imageId),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  }, [currentDiagram, selectedImage]);

  const selectImage = useCallback((image: CanvasImage | null) => {
    setSelectedImage(image);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedZone(null);
    setSelectedText(null);
    setSelectedCanvasIds(new Set());
  }, []);

  // Text operations
  const addText = useCallback((x: number, y: number) => {
    if (!currentDiagram) return;
    
    const newText: CanvasText = {
      id: uuidv4(),
      x,
      y,
      content: 'Text',
      fontFamily: 'Roboto',
      fontSize: 14,
      color: '#000000',
    };
    
    const updated = {
      ...currentDiagram,
      texts: [...(currentDiagram.texts || []), newText],
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    setSelectedText(newText);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedZone(null);
    setSelectedImage(null);
  }, [currentDiagram]);

  const updateText = useCallback((textId: string, updates: Partial<CanvasText>) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      texts: (currentDiagram.texts || []).map(t => 
        t.id === textId ? { ...t, ...updates } : t
      ),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedText?.id === textId) {
      setSelectedText({ ...selectedText, ...updates });
    }
  }, [currentDiagram, selectedText]);

  const removeText = useCallback((textId: string) => {
    if (!currentDiagram) return;
    
    const updated = {
      ...currentDiagram,
      texts: (currentDiagram.texts || []).filter(t => t.id !== textId),
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);
    
    if (selectedText?.id === textId) {
      setSelectedText(null);
    }
  }, [currentDiagram, selectedText]);

  const selectText = useCallback((text: CanvasText | null) => {
    setSelectedText(text);
    setSelectedEquipment(null);
    setSelectedConnection(null);
    setSelectedZone(null);
    setSelectedImage(null);
    setSelectedCanvasIds(new Set());
  }, []);

  // Clipboard
  type ClipboardData = {
    equipment: CanvasEquipment[];
    connections: Connection[];
    zones: Zone[];
  };
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const copySelection = useCallback(() => {
    if (!currentDiagram) return;

    const copiedEquipment: CanvasEquipment[] = [];
    const copiedZones: Zone[] = [];
    const copiedConnections: Connection[] = [];

    if (selectedEquipment) {
      copiedEquipment.push(selectedEquipment);
    }
    if (selectedZone) {
      copiedZones.push(selectedZone);
      // Also copy equipment inside the zone
      const zoneEquipment = currentDiagram.equipment.filter(e => 
        e.x >= selectedZone.x && e.x <= selectedZone.x + selectedZone.width &&
        e.y >= selectedZone.y && e.y <= selectedZone.y + selectedZone.height
      );
      copiedEquipment.push(...zoneEquipment);
    }

    // Copy connections between copied equipment
    if (copiedEquipment.length > 0) {
      const ids = new Set(copiedEquipment.map(e => e.canvasId));
      const relatedConnections = currentDiagram.connections.filter(
        c => ids.has(c.sourceId) && ids.has(c.targetId)
      );
      copiedConnections.push(...relatedConnections);
    }

    if (copiedEquipment.length === 0 && copiedZones.length === 0) {
      toast.info('Rien à copier');
      return;
    }

    setClipboard({ equipment: copiedEquipment, connections: copiedConnections, zones: copiedZones });
    toast.success('Copié dans le presse-papier');
  }, [currentDiagram, selectedEquipment, selectedZone]);

  const pasteClipboard = useCallback((offsetX = 30, offsetY = 30) => {
    if (!currentDiagram || !clipboard) return;

    // Map old canvasIds to new ones
    const idMap = new Map<string, string>();
    clipboard.equipment.forEach(e => idMap.set(e.canvasId, uuidv4()));

    const newEquipment: CanvasEquipment[] = clipboard.equipment.map(e => ({
      ...e,
      canvasId: idMap.get(e.canvasId)!,
      x: e.x + offsetX,
      y: e.y + offsetY,
    }));

    const newConnections: Connection[] = clipboard.connections.map(c => ({
      ...c,
      id: uuidv4(),
      sourceId: idMap.get(c.sourceId) || c.sourceId,
      targetId: idMap.get(c.targetId) || c.targetId,
    }));

    const newZones: Zone[] = clipboard.zones.map(z => ({
      ...z,
      id: uuidv4(),
      x: z.x + offsetX,
      y: z.y + offsetY,
    }));

    const updated = {
      ...currentDiagram,
      equipment: [...currentDiagram.equipment, ...newEquipment],
      connections: [...currentDiagram.connections, ...newConnections],
      zones: [...currentDiagram.zones, ...newZones],
      updatedAt: new Date(),
    };
    setCurrentDiagram(updated);

    // Select ALL pasted elements as a group
    const allPastedIds = new Set<string>([
      ...newEquipment.map(e => e.canvasId),
      ...newZones.map(z => z.id),
    ]);
    setSelectedCanvasIds(allPastedIds);

    // Also select first pasted equipment for the properties panel
    if (newEquipment.length > 0) {
      setSelectedEquipment(newEquipment[0]);
      setSelectedConnection(null);
      setSelectedZone(null);
    } else if (newZones.length > 0) {
      setSelectedZone(newZones[0]);
      setSelectedEquipment(null);
      setSelectedConnection(null);
    }

    toast.success('Collé — groupe sélectionné');
  }, [currentDiagram, clipboard]);

  return (
    <DiagramContext.Provider value={{
      diagrams: dbDiagrams,
      currentDiagram,
      equipmentLibrary,
      selectedEquipment,
      selectedConnection,
      selectedZone,
      selectedImage,
      selectedText,
      isConnecting,
      connectionSource,
      isLoading,
      saveStatus,
      createDiagram,
      openDiagram,
      saveDiagram,
      deleteDiagram,
      duplicateDiagram,
      updateDiagramName,
      updateDiagramSettings,
      closeDiagram,
      addEquipmentToCanvas,
      updateEquipmentPosition,
      updateEquipmentDetails,
      removeEquipmentFromCanvas,
      selectEquipment,
      startConnection,
      completeConnection,
      cancelConnection,
      updateConnection,
      removeConnection,
      selectConnection,
      addZone,
      updateZone,
      removeZone,
      selectZone,
      addImage,
      updateImage,
      removeImage,
      selectImage,
      addText,
      updateText,
      removeText,
      selectText,
      copySelection,
      pasteClipboard,
      hasClipboard: !!clipboard,
      undo,
      redo,
      canUndo,
      canRedo,
      selectedCanvasIds,
      setSelectedCanvasIds,
      moveSelectedGroup,
      expertMode,
      setExpertMode,
    }}>
      {children}
    </DiagramContext.Provider>
  );
};

export const useDiagram = () => {
  const context = useContext(DiagramContext);
  if (context === undefined) {
    throw new Error('useDiagram must be used within a DiagramProvider');
  }
  return context;
};
