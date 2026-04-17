export type EquipmentType = "terminal" | "automate" | "interface" | "cloud" | "sensor";

export type Protocol =
  | "none"
  | "modbus-tcp"
  | "modbus-rtu"
  | "bacnet-ip"
  | "bacnet-mstp"
  | "lon"
  | "cloud-api"
  | "ethernet"
  | "lorawan"
  | "Constructeur"
  | "multi-protocole";

export type EquipmentCategory = "hvac" | "lighting" | "metering" | "interface" | "scorp-io" | "saved-model";

export interface Equipment {
  id: string;
  label: string;
  name: string;
  type: EquipmentType;
  category: EquipmentCategory;
  protocol: Protocol;
  ipAddress?: string;
  slaveNumber?: number;
  icon: string;
  description?: string;
  reference?: string;
  borderColor?: string;
  headerBackgroundColor?: string;
}

export type FontSizePreset = 'small' | 'medium' | 'large';

export const LOCATION_PRESETS = [
  'RDC',
  'R+1',
  'R+2',
  'R+3',
  'R+4',
  'R+5',
  'Sous-sol',
  'Sous-sol -1',
  'Sous-sol -2',
  'Toiture',
  'Terrasse',
  'Local technique',
  'Chaufferie',
  'Tout étage',
  'Extérieur',
] as const;

export interface CanvasEquipment extends Equipment {
  canvasId: string;
  x: number;
  y: number;
  manufacturerId?: string;
  borderColor?: string;
  headerBackgroundColor?: string;
  quantity?: number;
  // Individual card dimensions (override global settings) — normal mode
  customWidth?: number;
  customHeight?: number;
  // Individual card dimensions — expert mode
  customExpertWidth?: number;
  customExpertHeight?: number;
  // Font size preset
  fontSize?: FontSizePreset;
  // Communication card / gateway
  hasCommCard?: boolean;
  commCardProtocol?: Protocol;
  commCardLabel?: string;
  commCardPosition?: CommCardPosition;
  // Physical location indicator
  location?: string;
  showLocation?: boolean;
}

export type CommCardPosition = 'right' | 'left' | 'top' | 'bottom';

export const COMM_CARD_POSITION_LABELS: Record<CommCardPosition, string> = {
  right: 'Droite',
  left: 'Gauche',
  top: 'Haut',
  bottom: 'Bas',
};

export const FONT_SIZE_VALUES: Record<FontSizePreset, { label: number; detail: number }> = {
  small: { label: 10, detail: 9 },
  medium: { label: 12, detail: 11 },
  large: { label: 14, detail: 12 },
};

export const FONT_SIZE_LABELS: Record<FontSizePreset, string> = {
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
};

export type ConnectionPathType = "curved" | "straight" | "orthogonal" | "custom";

export interface ControlPoint {
  id: string;
  x: number;
  y: number;
}

export type HandleSide = "top" | "right" | "bottom" | "left";

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
  protocol: Protocol;
  style: "solid" | "dashed";
  pathType?: ConnectionPathType;
  controlPoints?: ControlPoint[];
  arrowStart?: boolean;
  arrowEnd?: boolean;
  isSecure?: boolean;
  secureIconOffset?: { x: number; y: number };
  sourceHandle?: HandleSide;
  targetHandle?: HandleSide;
  sourceFromCommCard?: boolean;
  targetFromCommCard?: boolean;
  color?: string;
  strokeWidth?: number;
  labelPosition?: number;
  labelPerpendicularOffset?: number;
}

export interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  backgroundColor?: string;
}

export interface CanvasImage {
  id: string;
  url: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasText {
  id: string;
  x: number;
  y: number;
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
}
export interface ModeSettings {
  equipmentCardWidth: number;
  equipmentCardHeight: number;
}

export interface DiagramSettings {
  connectionStrokeWidth: number;
  equipmentCardWidth: number;
  equipmentCardHeight: number;
  // Mode-specific settings
  nonExpertSettings?: ModeSettings;
  expertSettings?: ModeSettings;
  // Custom protocol colors (overrides PROTOCOL_COLORS defaults)
  protocolColors?: Partial<Record<Protocol, string>>;
  // Persisted expert mode toggle
  expertMode?: boolean;
}

export const DEFAULT_NON_EXPERT_SETTINGS: ModeSettings = {
  equipmentCardWidth: 160,
  equipmentCardHeight: 90,
};

export const DEFAULT_EXPERT_SETTINGS: ModeSettings = {
  equipmentCardWidth: 160,
  equipmentCardHeight: 140,
};

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  connectionStrokeWidth: 1.5,
  equipmentCardWidth: 160,
  equipmentCardHeight: 90,
  nonExpertSettings: DEFAULT_NON_EXPERT_SETTINGS,
  expertSettings: DEFAULT_EXPERT_SETTINGS,
};

export interface Diagram {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  equipment: CanvasEquipment[];
  connections: Connection[];
  zones: Zone[];
  images?: CanvasImage[];
  texts?: CanvasText[];
  settings?: DiagramSettings;
  thumbnail?: string;
  createdBy?: string;
  creatorName?: string;
  organizationId?: string;
}

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  none: "Aucun",
  "modbus-tcp": "Modbus TCP",
  "modbus-rtu": "Modbus RTU",
  "bacnet-ip": "BACnet IP",
  "bacnet-mstp": "BACnet MSTP",
  lon: "LON",
  "cloud-api": "Cloud API",
  ethernet: "Ethernet",
  lorawan: "LoRaWAN",
  Constructeur: "Constructeur",
  "multi-protocole": "Multi-protocole",
};

export const PROTOCOL_COLORS: Record<Protocol, string> = {
  none: "#9ca3af",
  "modbus-tcp": "#2563eb",
  "modbus-rtu": "#3b82f6",
  "bacnet-ip": "#f97316",
  "bacnet-mstp": "#fb923c",
  lon: "#eab308",
  "cloud-api": "#14b8a6",
  ethernet: "#6b7280",
  lorawan: "#38bdf8",
  Constructeur: "#ec4899",
  "multi-protocole": "#8b5cf6",
};

/** Get the effective protocol color, respecting diagram-level overrides */
export const getProtocolColor = (protocol: Protocol, settings?: DiagramSettings): string => {
  return settings?.protocolColors?.[protocol] || PROTOCOL_COLORS[protocol];
};

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  terminal: "Terminal",
  automate: "Automate",
  interface: "Interface",
  cloud: "Cloud",
  sensor: "Capteur",
};

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  hvac: "HVAC / GTB",
  lighting: "Éclairage",
  metering: "Comptage",
  interface: "Interfaces",
  "scorp-io": "SCorp-io",
  "saved-model": "Modèles enregistrés",
};
