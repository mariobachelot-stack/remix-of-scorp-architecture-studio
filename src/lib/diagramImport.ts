import {
  CanvasEquipment,
  Connection,
  Zone,
  CanvasImage,
  CanvasText,
  DiagramSettings,
} from '@/types/equipment';

export interface ImportedDiagram {
  name: string;
  description?: string;
  equipment: CanvasEquipment[];
  connections: Connection[];
  zones: Zone[];
  images?: CanvasImage[];
  texts?: CanvasText[];
  settings?: DiagramSettings;
}

export type ParseResult =
  | { ok: true; data: ImportedDiagram }
  | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseImportedDiagram(raw: unknown): ParseResult {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return { ok: false, errors: ['Le fichier doit contenir un objet JSON valide.'] };
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description : undefined;

  const equipmentRaw = Array.isArray(raw.equipment) ? raw.equipment : null;
  const connectionsRaw = Array.isArray(raw.connections) ? raw.connections : null;
  const zonesRaw = Array.isArray(raw.zones) ? raw.zones : [];

  if (!equipmentRaw) errors.push('Le champ "equipment" doit être un tableau.');
  if (!connectionsRaw) errors.push('Le champ "connections" doit être un tableau.');

  if (equipmentRaw) {
    equipmentRaw.forEach((eq, i) => {
      if (!isObject(eq)) {
        errors.push(`equipment[${i}] : doit être un objet.`);
        return;
      }
      const missing: string[] = [];
      if (typeof eq.canvasId !== 'string') missing.push('canvasId');
      if (typeof eq.label !== 'string') missing.push('label');
      if (typeof eq.type !== 'string') missing.push('type');
      if (typeof eq.x !== 'number') missing.push('x');
      if (typeof eq.y !== 'number') missing.push('y');
      if (missing.length) {
        errors.push(`equipment[${i}] : champ(s) manquant(s) ou invalide(s) : ${missing.join(', ')}.`);
      }
    });
  }

  if (errors.length) return { ok: false, errors };

  // Dedupe canvasIds and remap connections
  const equipment = equipmentRaw as unknown as CanvasEquipment[];
  const connections = connectionsRaw as unknown as Connection[];
  const seen = new Set<string>();
  const idRemap = new Map<string, string>();

  const dedupedEquipment = equipment.map((eq) => {
    if (seen.has(eq.canvasId)) {
      const newId = crypto.randomUUID();
      idRemap.set(eq.canvasId, newId);
      return { ...eq, canvasId: newId };
    }
    seen.add(eq.canvasId);
    return eq;
  });

  const remappedConnections = connections.map((c) => {
    const sourceId = idRemap.get(c.sourceId) ?? c.sourceId;
    const targetId = idRemap.get(c.targetId) ?? c.targetId;
    return { ...c, sourceId, targetId };
  });

  return {
    ok: true,
    data: {
      name: name || 'Schéma importé',
      description,
      equipment: dedupedEquipment,
      connections: remappedConnections,
      zones: zonesRaw as Zone[],
      images: Array.isArray(raw.images) ? (raw.images as CanvasImage[]) : undefined,
      texts: Array.isArray(raw.texts) ? (raw.texts as CanvasText[]) : undefined,
      settings: isObject(raw.settings) ? (raw.settings as DiagramSettings) : undefined,
    },
  };
}
