import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Diagram, CanvasEquipment, Connection, Zone, PROTOCOL_COLORS, DiagramSettings, DEFAULT_DIAGRAM_SETTINGS, ConnectionPathType, ControlPoint, EQUIPMENT_TYPE_LABELS, CATEGORY_LABELS, getProtocolColor } from '@/types/equipment';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ProtocolBadge } from '@/components/ProtocolBadge';
import { cn } from '@/lib/utils';
import { getConnectionEndpoints, getPointOnPath, getPerpendicularOffset } from '@/lib/connectionUtils';
import { computeAutoCardHeight } from '@/lib/cardUtils';
import { Loader2, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Json } from '@/integrations/supabase/types';
import { useManufacturers } from '@/hooks/useManufacturers';
interface DbDiagram {
  id: string;
  name: string;
  description: string | null;
  equipment: Json;
  connections: Json;
  zones: Json;
  settings: Json;
  is_public: boolean;
  public_token: string | null;
}

export default function PublicView() {
  const { token } = useParams<{ token: string }>();
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create an anonymous client (no auth session) to access public diagrams via RLS anon policy
  const anonClient = useMemo(() => createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  ), []);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch all manufacturers to display names
  const { manufacturers } = useManufacturers();

  const getManufacturerName = (manufacturerId?: string) => {
    if (!manufacturerId) return null;
    return manufacturers.find((m) => m.id === manufacturerId)?.name || null;
  };

  useEffect(() => {
    if (token) {
      fetchDiagram();
    }
  }, [token]);

  const fetchDiagram = async () => {
    try {
      const { data, error: fetchError } = await anonClient
        .from('diagrams')
        .select('*')
        .eq('public_token', token)
        .eq('is_public', true)
        .single();

      if (fetchError || !data) {
        setError('Ce schéma n\'existe pas ou n\'est pas accessible.');
        return;
      }

      const dbData = data as DbDiagram;
      setDiagram({
        id: dbData.id,
        name: dbData.name,
        description: dbData.description || undefined,
        equipment: (dbData.equipment as unknown as CanvasEquipment[]) || [],
        connections: (dbData.connections as unknown as Connection[]) || [],
        zones: (dbData.zones as unknown as Zone[]) || [],
        settings: (dbData.settings as unknown as DiagramSettings) || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      setError('Erreur lors du chargement du schéma.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get settings from diagram with safe defaults
  const toFiniteNumber = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };

  const strokeWidth = Math.max(
    0.5,
    Math.min(3, toFiniteNumber(diagram?.settings?.connectionStrokeWidth, DEFAULT_DIAGRAM_SETTINGS.connectionStrokeWidth))
  );
  const cardWidth = Math.max(
    120,
    Math.min(370, toFiniteNumber(diagram?.settings?.equipmentCardWidth, DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth))
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
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
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getCardHeightForEquipment = (equipment: CanvasEquipment) => {
    if (equipment.customExpertHeight !== undefined) return equipment.customExpertHeight;
    return computeAutoCardHeight(equipment, manufacturers);
  };

  const getConnectionPath = (sourceId: string, targetId: string, pathType: ConnectionPathType = 'curved', controlPoints?: ControlPoint[]) => {
    const source = diagram?.equipment.find(e => e.canvasId === sourceId);
    const target = diagram?.equipment.find(e => e.canvasId === targetId);
    if (!source || !target) return '';

    const { sourceX, sourceY, targetX, targetY } = getConnectionEndpoints(
      source,
      target,
      cardWidth,
      getCardHeightForEquipment(source),
      undefined,
      undefined,
      cardWidth,
      getCardHeightForEquipment(target)
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
        const midX = controlPoints && controlPoints.length > 0 
          ? controlPoints[0].x 
          : (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
      }
      case 'curved':
      default: {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      }
    }
  };

  const getConnectionLabelPosition = (connection: Connection) => {
    const source = diagram?.equipment.find(e => e.canvasId === connection.sourceId);
    const target = diagram?.equipment.find(e => e.canvasId === connection.targetId);
    if (!source || !target) return { x: 0, y: 0 };

    const pathStr = getConnectionPath(connection.sourceId, connection.targetId, connection.pathType || 'curved', connection.controlPoints);
    if (!pathStr) {
      const halfWidth = cardWidth / 2;
      return {
        x: (source.x + target.x) / 2 + halfWidth,
        y: (source.y + target.y) / 2 + 40 - 15,
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            {error || 'Schéma introuvable'}
          </h1>
          <p className="text-muted-foreground">
            Vérifiez que le lien est correct et que le schéma est toujours partagé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4">
        <h1 className="font-semibold text-foreground">{diagram.name}</h1>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
          Lecture seule
        </span>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-canvas">
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetView} className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            "w-full h-full cursor-grab",
            isPanning && "cursor-grabbing"
          )}
          style={{
            backgroundImage: `
              linear-gradient(hsl(215 25% 88% / 0.5) 1px, transparent 1px),
              linear-gradient(90deg, hsl(215 25% 88% / 0.5) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: 8000,
              height: 8000,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Zones */}
            {diagram.zones.map(zone => (
              <div
                key={zone.id}
                className="absolute rounded-lg border-2 border-dashed"
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  borderColor: zone.color,
                  backgroundColor: zone.backgroundColor || `${zone.color}15`,
                }}
              >
                <div
                  className="absolute -top-6 left-2 px-2 py-0.5 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: zone.color }}
                >
                  {zone.name}
                </div>
              </div>
            ))}

            {/* Connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
              {/* Arrow markers definitions */}
              <defs>
                {diagram.connections.map(connection => {
                  const color = connection.color || getProtocolColor(connection.protocol, diagram?.settings);
                  return (
                    <g key={`markers-${connection.id}`}>
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
                    </g>
                  );
                })}
              </defs>
              
              {diagram.connections.map(connection => {
                const pathType = connection.pathType || 'curved';
                const path = getConnectionPath(connection.sourceId, connection.targetId, pathType, connection.controlPoints);
                const color = connection.color || getProtocolColor(connection.protocol, diagram?.settings);
                const labelPos = getConnectionLabelPosition(connection);
                
                // Arrow markers
                const markerStart = connection.arrowStart ? `url(#arrow-start-${connection.id})` : undefined;
                const markerEnd = connection.arrowEnd ? `url(#arrow-end-${connection.id})` : undefined;

                return (
                  <g key={connection.id}>
                    <path
                      d={path}
                      stroke={color}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeDasharray={connection.style === 'dashed' ? '8 4' : undefined}
                      markerStart={markerStart}
                      markerEnd={markerEnd}
                    />
                    
                    {/* Security padlock icon */}
                    {connection.isSecure && (() => {
                      const iconOffset = connection.secureIconOffset || { x: 45, y: -8 };
                      return (
                        <g transform={`translate(${labelPos.x + iconOffset.x}, ${labelPos.y + iconOffset.y})`}>
                          <circle
                            cx="0"
                            cy="0"
                            r="12"
                            className="fill-background/95"
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
                    
                    {/* Connection name label */}
                    {connection.name && (
                      <g>
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
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Equipment */}
            {diagram.equipment.map(equipment => {
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
                  className="absolute select-none bg-card border-2 rounded-xl shadow-equipment"
                  style={{
                    left: equipment.x,
                    top: equipment.y,
                    width: cardWidth,
                    borderColor: borderColor,
                  }}
                >
                  <div className="p-3 flex items-center gap-3 relative">
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
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: headerColor }}
                    >
                      <DynamicIcon 
                        name={equipment.icon} 
                        className="h-5 w-5 text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {equipment.label}
                      </span>
                      <ProtocolBadge protocol={equipment.protocol} />
                    </div>
                  </div>
                </div>
              );

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
          </div>
        </div>
      </div>
    </div>
  );
}
