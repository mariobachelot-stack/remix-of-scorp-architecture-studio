import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  CanvasEquipment,
  Connection,
  Zone,
  DiagramSettings,
  DEFAULT_NON_EXPERT_SETTINGS,
  DEFAULT_EXPERT_SETTINGS,
} from '@/types/equipment';

export interface GTBTemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: 'vacances-bleues' | 'hotel' | 'residentiel' | 'tertiaire' | 'generique';
  categoryLabel: string;
  tags: string[];
  equipment: CanvasEquipment[];
  connections: Connection[];
  zones: Zone[];
  settings: DiagramSettings;
}

const ZONE_TERRAIN   = { color: '#1D9E75', backgroundColor: '#E1F5EE' };
const ZONE_RESEAU    = { color: '#534AB7', backgroundColor: '#EEEDFE' };
const ZONE_CLOUD     = { color: '#D85A30', backgroundColor: '#FAECE7' };

const SETTINGS_EXPERT: DiagramSettings = {
  connectionStrokeWidth: 2,
  equipmentCardWidth: 160,
  equipmentCardHeight: 90,
  nonExpertSettings: DEFAULT_NON_EXPERT_SETTINGS,
  expertSettings: { ...DEFAULT_EXPERT_SETTINGS, equipmentCardWidth: 170, equipmentCardHeight: 140 },
  expertMode: true,
};

function buildArvorTemplate(): GTBTemplateDefinition {
  const ids = {
    rad_bat1: uuidv4(), rad_bat2: uuidv4(), rad_bat3: uuidv4(),
    ecs_bat1: uuidv4(), ecs_bat2: uuidv4(),
    capteur_bat1: uuidv4(), capteur_bat2: uuidv4(),
    gw_lora1: uuidv4(), gw_lora2: uuidv4(), gw_lora3: uuidv4(),
    sous_compt: uuidv4(), api_enedis: uuidv4(),
    connecter: uuidv4(),
    cloud: uuidv4(), pms: uuidv4(), symphony: uuidv4(),
    z_terrain: uuidv4(), z_reseau: uuidv4(), z_cloud: uuidv4(),
  };

  const equipment: CanvasEquipment[] = [
    {
      canvasId: ids.rad_bat1, id: 'lib-rad-fp', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote (Atrel / Watteco)',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: '60 radiateurs · bâtiment 1–2',
      x: 60, y: 120,
    },
    {
      canvasId: ids.rad_bat2, id: 'lib-rad-fp2', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote (Atrel / Watteco)',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: '60 radiateurs · bâtiment 3–4',
      x: 280, y: 120,
    },
    {
      canvasId: ids.rad_bat3, id: 'lib-rad-fp3', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote (Atrel / Watteco)',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: '60 radiateurs · bâtiment 5–6',
      x: 500, y: 120,
    },
    {
      canvasId: ids.ecs_bat1, id: 'lib-ecs-1', label: 'Ballons ECS individuels',
      name: 'Ballons 150L / 200L — coupure LoRaWAN',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Droplets', description: '57 ballons · bâtiments 1–3 · ⚠ accès difficile derrière WC',
      x: 780, y: 120,
    },
    {
      canvasId: ids.ecs_bat2, id: 'lib-ecs-2', label: 'Ballons ECS piscine',
      name: 'Ballons 1000L × 2 — piscine',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Droplets', description: '57 ballons · bâtiments 4–6 + 2×1000L piscine',
      x: 980, y: 120,
    },
    {
      canvasId: ids.capteur_bat1, id: 'lib-capteur-1', label: 'Capteurs ambiance',
      name: 'Capteur T° / CO₂ / présence LoRaWAN',
      type: 'sensor', category: 'hvac', protocol: 'lorawan',
      icon: 'Radio', description: 'Par appartement · bâtiments 1–3',
      x: 1180, y: 120,
    },
    {
      canvasId: ids.capteur_bat2, id: 'lib-capteur-2', label: 'Capteurs ambiance',
      name: 'Capteur T° / CO₂ / présence LoRaWAN',
      type: 'sensor', category: 'hvac', protocol: 'lorawan',
      icon: 'Radio', description: 'Par appartement · bâtiments 4–6',
      x: 1380, y: 120,
    },
    {
      canvasId: ids.gw_lora1, id: 'lib-gw-lora1', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz — IP/LAN',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 1–2 (1 GW / bât.)',
      x: 170, y: 370,
    },
    {
      canvasId: ids.gw_lora2, id: 'lib-gw-lora2', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz — IP/LAN',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 3–4',
      x: 580, y: 370,
    },
    {
      canvasId: ids.gw_lora3, id: 'lib-gw-lora3', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz — IP/LAN',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 5–6',
      x: 990, y: 370,
    },
    {
      canvasId: ids.sous_compt, id: 'lib-compt', label: 'Sous-comptage élec.',
      name: 'Centrale de mesure ECO-ADAPT Power Elec 6',
      type: 'interface', category: 'metering', protocol: 'modbus-tcp',
      icon: 'Zap', description: 'LoRaWAN ou Modbus TCP · 6 départs',
      x: 1280, y: 370,
    },
    {
      canvasId: ids.api_enedis, id: 'lib-enedis', label: 'API Enedis / Météo',
      name: 'API Enedis + station météo locale',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Globe', description: 'Données de consommation + météo prévisionnel',
      x: 1480, y: 370,
    },
    {
      canvasId: ids.connecter, id: 'lib-connecter', label: 'Module Connecter',
      name: 'SCorp-io Module Connecter — PC industriel fanless J6412',
      type: 'interface', category: 'scorp-io', protocol: 'multi-protocole',
      icon: 'Server', description: 'Store & Forward · LoRaWAN + Modbus TCP + REST API · 4G/5G backup',
      x: 700, y: 600,
    },
    {
      canvasId: ids.cloud, id: 'lib-cloud', label: 'Cloud SCorp-io',
      name: 'SCorp-io — Cloud Data Manager (hébergé France · RGPD)',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Designer · Exploiter · Rapports BACS · Décret tertiaire',
      x: 500, y: 830,
    },
    {
      canvasId: ids.pms, id: 'lib-pms', label: 'PMS Résidence',
      name: 'PMS — Planning occupation (check-in/out)',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'CalendarDays', description: 'Intégration native · Oracle / FOLS / HMS / LEAN',
      x: 900, y: 830,
    },
    {
      canvasId: ids.symphony, id: 'lib-symphony', label: 'SymphonIA',
      name: "SymphonIA — IA optimisation énergétique contextuelle",
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'BrainCircuit', description: "Météo + occupation + calendrier · jusqu'à 40% d'éco.",
      x: 1100, y: 830,
    },
  ];

  const connections: Connection[] = [
    { id: uuidv4(), sourceId: ids.rad_bat1, targetId: ids.gw_lora1, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.rad_bat2, targetId: ids.gw_lora1, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.rad_bat2, targetId: ids.gw_lora2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.rad_bat3, targetId: ids.gw_lora2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.rad_bat3, targetId: ids.gw_lora3, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.ecs_bat1, targetId: ids.gw_lora2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.ecs_bat2, targetId: ids.gw_lora3, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.capteur_bat1, targetId: ids.gw_lora3, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.capteur_bat2, targetId: ids.sous_compt, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.gw_lora1, targetId: ids.connecter, protocol: 'ethernet', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.gw_lora2, targetId: ids.connecter, protocol: 'ethernet', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.gw_lora3, targetId: ids.connecter, protocol: 'ethernet', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.sous_compt, targetId: ids.connecter, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.api_enedis, targetId: ids.connecter, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.connecter, targetId: ids.cloud, protocol: 'cloud-api', style: 'solid', pathType: 'orthogonal', name: 'MQTT Sparkplug B' },
    { id: uuidv4(), sourceId: ids.cloud, targetId: ids.pms, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.cloud, targetId: ids.symphony, protocol: 'cloud-api', style: 'solid', pathType: 'orthogonal' },
  ];

  const zones: Zone[] = [
    {
      id: ids.z_terrain, name: "Terrain — 6 bâtiments (359 radiateurs · 114 ballons ECS)",
      x: 30, y: 60, width: 1620, height: 280, ...ZONE_TERRAIN,
    },
    {
      id: ids.z_reseau, name: 'Réseau local + Edge (Module Connecter)',
      x: 30, y: 330, width: 1620, height: 340, ...ZONE_RESEAU,
    },
    {
      id: ids.z_cloud, name: 'Cloud SCorp-io — hébergé en France (RGPD)',
      x: 30, y: 770, width: 1300, height: 150, ...ZONE_CLOUD,
    },
  ];

  return {
    id: 'gtb-vacances-bleues-arvor',
    name: "🏠 Les Jardins d'Arvor — Bénodet (111 appts)",
    description: "Architecture GTB SCorp-io — Résidence tourisme ★★★★ · 111 appartements · 6 bâtiments · 359 radiateurs fil pilote LoRaWAN · 114 ballons ECS · Classe A NF EN ISO 52120-1 · Intégration PMS + SymphonIA",
    category: 'vacances-bleues',
    categoryLabel: 'Vacances Bleues',
    tags: ['LoRaWAN', 'Fil pilote', 'Résidentiel', 'Classe A', 'PMS'],
    equipment, connections, zones,
    settings: SETTINGS_EXPERT,
  };
}

function buildPleinSudTemplate(): GTBTemplateDefinition {
  const ids = {
    vfc_chamb: uuidv4(), cassettes: uuidv4(),
    trane_sc: uuidv4(),
    pac_trane: uuidv4(), ecs_coll: uuidv4(), cta_atl: uuidv4(),
    sauter: uuidv4(),
    pinede: uuidv4(),
    sous_compt: uuidv4(), api_enedis: uuidv4(),
    connecter: uuidv4(),
    cloud: uuidv4(), pms: uuidv4(), symphony: uuidv4(),
    z_chambres: uuidv4(), z_prod: uuidv4(), z_edge: uuidv4(), z_cloud: uuidv4(),
  };

  const equipment: CanvasEquipment[] = [
    {
      canvasId: ids.vfc_chamb, id: 'lib-vfc-trane', label: 'VFC gainables TRANE',
      name: 'Ventilo-convecteurs gainables TRANE FED 200/400',
      type: 'terminal', category: 'hvac', protocol: 'Constructeur',
      icon: 'Wind', description: '~194 unités R+1/R+2/RdC — BACnet MS/TP via Tracer SC+',
      x: 60, y: 120,
    },
    {
      canvasId: ids.cassettes, id: 'lib-cass-trane', label: 'Cassettes / Splits TRANE',
      name: 'TRANE CWS 02-2P · FKAS 63 · Bi-splits',
      type: 'terminal', category: 'hvac', protocol: 'Constructeur',
      icon: 'AirVent', description: 'Salle Bioulés · Salle de sport · Bureaux',
      x: 300, y: 120,
    },
    {
      canvasId: ids.trane_sc, id: 'lib-trane-sc', label: 'Trane Tracer SC+',
      name: 'GTC existante — Trane Tracer SC+ System Controller',
      type: 'automate', category: 'hvac', protocol: 'bacnet-ip',
      icon: 'Cpu', description: '⚠ Confirmer version + licence BACnet/IP active · BTL certifié · Serveur BACnet/IP',
      borderColor: '#f97316', headerBackgroundColor: '#fff7ed',
      x: 180, y: 370,
    },
    {
      canvasId: ids.pac_trane, id: 'lib-pac-trane', label: 'PAC réversible TRANE',
      name: 'PAC réversible Hôtel — TRANE (toiture)',
      type: 'automate', category: 'hvac', protocol: 'bacnet-ip',
      icon: 'Gauge', description: '⚠ BACnet/IP probable — à confirmer modèle exact',
      x: 620, y: 120,
    },
    {
      canvasId: ids.ecs_coll, id: 'lib-ecs-coll', label: 'ECS collectif',
      name: 'Ballons ECS 3×4000L + échangeur Alfa Laval',
      type: 'terminal', category: 'hvac', protocol: 'modbus-tcp',
      icon: 'Droplets', description: 'SALMON JRE 204 · ALFA LAVAL 700kW · LOWARA XYLEM',
      x: 860, y: 120,
    },
    {
      canvasId: ids.cta_atl, id: 'lib-cta-atl', label: 'CTA double flux',
      name: 'CTA ATLANTIC DUOFLEX-V 3000 (resto + salle spectacle)',
      type: 'automate', category: 'hvac', protocol: 'modbus-rtu',
      icon: 'Shuffle', description: '⚠ Modbus RTU probable — convertisseur RS485/TCP à prévoir',
      x: 1100, y: 120,
    },
    {
      canvasId: ids.sauter, id: 'lib-sauter', label: 'GTC SAUTER',
      name: 'Régulation SAUTER — ECS + chauffage piscine',
      type: 'automate', category: 'hvac', protocol: 'modbus-tcp',
      icon: 'Cpu', description: '⚠ Modbus TCP ou BACnet/IP — à confirmer modèle exact',
      borderColor: '#2563eb', headerBackgroundColor: '#eff6ff',
      x: 840, y: 370,
    },
    {
      canvasId: ids.pinede, id: 'lib-pinede', label: 'Bât. Pinède + Nurserie',
      name: 'PAC Roof top + VFC gainable + VMC + ECS 300L + 150L',
      type: 'automate', category: 'hvac', protocol: 'modbus-tcp',
      icon: 'Building2', description: '⚠ Protocole à confirmer sur site',
      x: 1300, y: 370,
    },
    {
      canvasId: ids.sous_compt, id: 'lib-compt2', label: 'Sous-comptage élec.',
      name: 'Centrale de mesure communicante — départs électriques',
      type: 'interface', category: 'metering', protocol: 'modbus-tcp',
      icon: 'Zap', description: 'Modbus TCP · Tableau principal hôtel',
      x: 1500, y: 370,
    },
    {
      canvasId: ids.api_enedis, id: 'lib-enedis2', label: 'API Enedis / Météo',
      name: 'API Enedis + station météo locale (Hyères)',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Globe', description: 'Données PDL + météo prévisionnel',
      x: 1700, y: 370,
    },
    {
      canvasId: ids.connecter, id: 'lib-connecter2', label: 'Module Connecter',
      name: 'SCorp-io Module Connecter — PC industriel fanless J6412',
      type: 'interface', category: 'scorp-io', protocol: 'multi-protocole',
      icon: 'Server', description: 'Store & Forward · BACnet/IP (Trane SC+) · Modbus TCP (SAUTER) · REST API · 4G/5G backup',
      x: 900, y: 620,
    },
    {
      canvasId: ids.cloud, id: 'lib-cloud2', label: 'Cloud SCorp-io',
      name: 'SCorp-io — Cloud Data Manager (hébergé France · RGPD)',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Designer · Exploiter · Rapports BACS · Décret tertiaire · Flex Orus Energy',
      x: 600, y: 860,
    },
    {
      canvasId: ids.pms, id: 'lib-pms2', label: 'PMS Hôtel',
      name: 'PMS — Planning occupation chambres (check-in/out)',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'CalendarDays', description: "Intégration native · Oracle / FOLS / HMS / LEAN · Préchauffage Δ3°C avant arrivée",
      x: 1000, y: 860,
    },
    {
      canvasId: ids.symphony, id: 'lib-symphony2', label: 'SymphonIA',
      name: "SymphonIA — IA optimisation énergétique contextuelle",
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'BrainCircuit', description: "Météo Hyères + occupation + calendrier · jusqu'à 40% d'économies",
      x: 1200, y: 860,
    },
  ];

  const connections: Connection[] = [
    { id: uuidv4(), sourceId: ids.vfc_chamb, targetId: ids.trane_sc, protocol: 'bacnet-mstp', style: 'solid', pathType: 'orthogonal', name: 'BACnet MS/TP' },
    { id: uuidv4(), sourceId: ids.cassettes, targetId: ids.trane_sc, protocol: 'bacnet-mstp', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.trane_sc, targetId: ids.connecter, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal', name: 'BACnet/IP' },
    { id: uuidv4(), sourceId: ids.pac_trane, targetId: ids.connecter, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal', name: 'BACnet/IP (à confirmer)' },
    { id: uuidv4(), sourceId: ids.ecs_coll, targetId: ids.sauter, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.cta_atl, targetId: ids.connecter, protocol: 'modbus-rtu', style: 'dashed', pathType: 'orthogonal', name: 'Modbus RTU→TCP' },
    { id: uuidv4(), sourceId: ids.sauter, targetId: ids.connecter, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal', name: 'Modbus TCP' },
    { id: uuidv4(), sourceId: ids.pinede, targetId: ids.connecter, protocol: 'modbus-tcp', style: 'dashed', pathType: 'orthogonal', name: 'à confirmer' },
    { id: uuidv4(), sourceId: ids.sous_compt, targetId: ids.connecter, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.api_enedis, targetId: ids.connecter, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.connecter, targetId: ids.cloud, protocol: 'cloud-api', style: 'solid', pathType: 'orthogonal', name: 'MQTT Sparkplug B' },
    { id: uuidv4(), sourceId: ids.cloud, targetId: ids.pms, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: ids.cloud, targetId: ids.symphony, protocol: 'cloud-api', style: 'solid', pathType: 'orthogonal' },
  ];

  const zones: Zone[] = [
    {
      id: ids.z_chambres, name: 'Chambres (188) — HVAC via Trane Tracer SC+ existant',
      x: 30, y: 60, width: 520, height: 280, ...ZONE_TERRAIN,
    },
    {
      id: ids.z_prod, name: 'Production centrale — Chaufferie / Toiture',
      x: 580, y: 60, width: 820, height: 280,
      color: '#BA7517', backgroundColor: '#FAEEDA',
    },
    {
      id: ids.z_edge, name: 'Réseau local + Edge (Module Connecter)',
      x: 30, y: 330, width: 1820, height: 370, ...ZONE_RESEAU,
    },
    {
      id: ids.z_cloud, name: 'Cloud SCorp-io — hébergé en France (RGPD)',
      x: 30, y: 800, width: 1400, height: 150, ...ZONE_CLOUD,
    },
  ];

  return {
    id: 'gtb-vacances-bleues-plein-sud',
    name: '🏨 Plein Sud — Hyères les Palmiers (188 chambres)',
    description: "Architecture GTB SCorp-io — Club ★★★ · 188 chambres · GTC Trane Tracer SC+ (BACnet/IP) + SAUTER + CTA Atlantic · Classe A NF EN ISO 52120-1 · Intégration PMS + SymphonIA · Flex Orus Energy",
    category: 'vacances-bleues',
    categoryLabel: 'Vacances Bleues',
    tags: ['BACnet/IP', 'Trane', 'SAUTER', 'GTC existante', 'Classe A', 'PMS', 'Hôtellerie'],
    equipment, connections, zones,
    settings: SETTINGS_EXPERT,
  };
}

export function useGTBTemplates() {
  const templates = useMemo<GTBTemplateDefinition[]>(() => [
    buildArvorTemplate(),
    buildPleinSudTemplate(),
  ], []);

  const byCategory = useMemo(() => {
    return templates.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {} as Record<string, GTBTemplateDefinition[]>);
  }, [templates]);

  return { templates, byCategory };
}
