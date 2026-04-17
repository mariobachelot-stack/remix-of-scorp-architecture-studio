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

// ─── Settings identiques aux schémas de référence ───────────────────
const SETTINGS: DiagramSettings = {
  connectionStrokeWidth: 1.5,
  equipmentCardWidth: 190,
  equipmentCardHeight: 90,
  nonExpertSettings: DEFAULT_NON_EXPERT_SETTINGS,
  expertSettings: { ...DEFAULT_EXPERT_SETTINGS, equipmentCardWidth: 170, equipmentCardHeight: 140 },
  expertMode: true,
};

// ─── Couleurs zones — calquées sur les schémas de référence ─────────
// Edge=bleu, Cloud=vert, Toiture/Production=orange, Chaufferie=rose
// Chambres/Terrain=violet, ECS/Comptage=teal, Spécifique=ambre
const Z = {
  edge:      { color: '#3b82f6', backgroundColor: '#d9e7fd20' },
  cloud:     { color: '#22c55e', backgroundColor: '' },
  toiture:   { color: '#f97316', backgroundColor: '' },
  chaufferie:{ color: '#ec4899', backgroundColor: '' },
  chambres:  { color: '#8b5cf6', backgroundColor: '' },
  terrain:   { color: '#8b5cf6', backgroundColor: '' },
  ecs:       { color: '#14b8a6', backgroundColor: '' },
  comptage:  { color: '#14b8a6', backgroundColor: '' },
  coffret:   { color: '#8b5cf6', backgroundColor: '' },
  communs:   { color: '#8b5cf6', backgroundColor: '' },
};

// ────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — Les Jardins d'Arvor (Bénodet)
// Résidence ★★★★ · 111 appts · 6 bâtiments
// 359 radiateurs fil pilote · 114 ballons ECS individuels
// Architecture : LoRaWAN → passerelles → Module Connecter → Cloud
// Classe A NF EN ISO 52120-1
// ────────────────────────────────────────────────────────────────────
function buildArvorTemplate(): GTBTemplateDefinition {
  const id = {
    // Terrain
    rad1: uuidv4(), rad2: uuidv4(), rad3: uuidv4(),
    ecs1: uuidv4(), ecs2: uuidv4(),
    capt1: uuidv4(), capt2: uuidv4(),
    // Edge
    gw1: uuidv4(), gw2: uuidv4(), gw3: uuidv4(),
    compt: uuidv4(),
    connecter: uuidv4(),
    // Cloud
    cloud: uuidv4(), exploiter: uuidv4(), pms: uuidv4(),
    enedis: uuidv4(), meteo: uuidv4(), symphony: uuidv4(),
    // Zones
    z_bat1: uuidv4(), z_bat2: uuidv4(), z_bat3: uuidv4(),
    z_ecs: uuidv4(), z_edge: uuidv4(), z_cloud: uuidv4(),
  };

  // Layout vertical : Terrain haut → Edge milieu → Cloud droite
  // Colonne gauche x=40, milieu x=380, droite (cloud) x=900
  // Rangées : y=60 (bât 1-2), y=220 (bât 3-4), y=380 (bât 5-6),
  //           y=560 (ECS + capteurs), y=750 (passerelles + comptage),
  //           y=950 (connecter), cloud y=60

  const equipment: CanvasEquipment[] = [
    // ── BÂTIMENTS 1-2 ── y=80
    {
      canvasId: id.rad1, id: 'tpl-rad-fp', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote Atrel / Watteco',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: 'Radiateurs électriques avec fil pilote',
      quantity: 120, x: 40, y: 80,
    },
    {
      canvasId: id.capt1, id: 'tpl-capt-1', label: 'Capteur ambiance',
      name: 'Capteur T° / CO₂ / présence',
      type: 'sensor', category: 'hvac', protocol: 'lorawan',
      icon: 'Gauge', description: 'Par appartement · bâtiments 1–2',
      quantity: 30, x: 320, y: 80,
    },
    // ── BÂTIMENTS 3-4 ── y=240
    {
      canvasId: id.rad2, id: 'tpl-rad-fp2', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote Atrel / Watteco',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: 'Radiateurs électriques avec fil pilote',
      quantity: 120, x: 40, y: 240,
    },
    {
      canvasId: id.capt2, id: 'tpl-capt-2', label: 'Capteur ambiance',
      name: 'Capteur T° / CO₂ / présence',
      type: 'sensor', category: 'hvac', protocol: 'lorawan',
      icon: 'Gauge', description: 'Par appartement · bâtiments 3–4',
      quantity: 30, x: 320, y: 240,
    },
    // ── BÂTIMENTS 5-6 ── y=400
    {
      canvasId: id.rad3, id: 'tpl-rad-fp3', label: 'Radiateurs fil pilote',
      name: 'Modules LoRaWAN fil pilote Atrel / Watteco',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Thermometer', description: 'Radiateurs électriques avec fil pilote',
      quantity: 119, x: 40, y: 400,
    },
    // ── ECS ── y=560
    {
      canvasId: id.ecs1, id: 'tpl-ecs-ind', label: 'Ballons ECS individuels',
      name: 'Ballons 150L / 200L — coupure LoRaWAN',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Droplets', description: '⚠ Accès difficile (derrière WC) — surcoût pose à chiffrer',
      quantity: 112, x: 40, y: 560,
    },
    {
      canvasId: id.ecs2, id: 'tpl-ecs-pisc', label: 'Ballons ECS piscine',
      name: 'Ballons 1000L — douches piscine',
      type: 'terminal', category: 'hvac', protocol: 'lorawan',
      icon: 'Droplets', description: 'Piscine · 2 ballons 1000L',
      quantity: 2, x: 320, y: 560,
    },
    // ── EDGE — Passerelles LoRaWAN ── y=760
    {
      canvasId: id.gw1, id: 'tpl-gw-lora1', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 1–2',
      ipAddress: '192.168.1.101', x: 40, y: 760,
    },
    {
      canvasId: id.gw2, id: 'tpl-gw-lora2', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 3–4',
      ipAddress: '192.168.1.102', x: 260, y: 760,
    },
    {
      canvasId: id.gw3, id: 'tpl-gw-lora3', label: 'Passerelle LoRaWAN',
      name: 'Gateway LoRaWAN 868 MHz',
      type: 'interface', category: 'interface', protocol: 'lorawan',
      icon: 'Antenna', description: 'Bâtiments 5–6',
      ipAddress: '192.168.1.103', x: 480, y: 760,
    },
    {
      canvasId: id.compt, id: 'tpl-compt', label: 'Sous-comptage élec.',
      name: 'ECO-ADAPT Power Elec 6',
      type: 'interface', category: 'metering', protocol: 'lorawan',
      icon: 'Activity', description: '6 départs triphasés ou 18 circuits monophasés',
      quantity: 1, x: 700, y: 760,
    },
    // ── MODULE CONNECTER ── y=970
    {
      canvasId: id.connecter, id: 'tpl-connecter', label: 'Connecter',
      name: 'SCorp-io Module Connecter',
      type: 'interface', category: 'scorp-io', protocol: 'multi-protocole',
      icon: 'Box', description: 'PC industriel fanless J6412 · Store & Forward · 4G/5G backup',
      ipAddress: '192.168.1.199', x: 340, y: 970,
    },
    // ── CLOUD ── colonne droite x=920
    {
      canvasId: id.cloud, id: 'tpl-cloud', label: 'Cloud',
      name: 'Plateforme SCorp-io',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Designer · Exploiter · Cloud Data Manager · RGPD France',
      x: 920, y: 80,
    },
    {
      canvasId: id.exploiter, id: 'tpl-exploiter', label: 'Exploiter',
      name: 'Module Exploiter',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Monitor', description: 'Supervision · alarmes · courbes · rapports BACS',
      x: 920, y: 280,
    },
    {
      canvasId: id.pms, id: 'tpl-pms', label: 'PMS',
      name: 'Plateforme SaaS',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'CalendarDays', description: 'Intégration native Oracle/FOLS/HMS/LEAN · Préchauffage check-in',
      x: 1150, y: 80,
    },
    {
      canvasId: id.enedis, id: 'tpl-enedis', label: 'Enedis',
      name: 'API Enedis',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Zap', description: 'Données consommation PDL',
      x: 1150, y: 240,
    },
    {
      canvasId: id.meteo, id: 'tpl-meteo', label: 'Météo',
      name: 'Station météo',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Prévisions météo locales · Bénodet',
      x: 1150, y: 390,
    },
    {
      canvasId: id.symphony, id: 'tpl-symphony', label: 'SymphonIA',
      name: 'IA optimisation énergétique',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'BrainCircuit', description: "Météo + occupation + calendrier · jusqu'à 40% d'économies",
      x: 920, y: 480,
    },
  ];

  const connections: Connection[] = [
    // Terrain → Passerelles (LoRaWAN RF)
    { id: uuidv4(), sourceId: id.rad1, targetId: id.gw1, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.capt1, targetId: id.gw1, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.rad2, targetId: id.gw2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.capt2, targetId: id.gw2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.rad3, targetId: id.gw3, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.ecs1, targetId: id.gw2, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.ecs2, targetId: id.gw3, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.compt, targetId: id.connecter, protocol: 'lorawan', style: 'dashed', pathType: 'orthogonal' },
    // Passerelles → Connecter (Ethernet/IP)
    { id: uuidv4(), sourceId: id.gw1, targetId: id.connecter, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.gw2, targetId: id.connecter, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.gw3, targetId: id.connecter, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    // Connecter → Cloud (4G LTE + MQTT)
    { id: uuidv4(), sourceId: id.connecter, targetId: id.cloud, name: '4G LTE', protocol: 'none', style: 'dashed', pathType: 'orthogonal', arrowEnd: true, arrowStart: true },
    // Cloud ↔ services
    { id: uuidv4(), sourceId: id.cloud, targetId: id.exploiter, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.pms, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.enedis, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.meteo, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.symphony, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
  ];

  const zones: Zone[] = [
    // Bâtiments 1-2
    { id: id.z_bat1, name: 'Bâtiments 1–2', x: 20, y: 40, width: 520, height: 170, ...Z.terrain },
    // Bâtiments 3-4
    { id: id.z_bat2, name: 'Bâtiments 3–4', x: 20, y: 200, width: 520, height: 170, ...Z.terrain },
    // Bâtiments 5-6
    { id: id.z_bat3, name: 'Bâtiments 5–6', x: 20, y: 360, width: 520, height: 170, ...Z.terrain },
    // ECS
    { id: id.z_ecs, name: 'ECS individuelle — 114 ballons', x: 20, y: 520, width: 520, height: 180, ...Z.ecs },
    // Edge complet
    { id: id.z_edge, name: 'Edge — Réseau local + Module Connecter', x: 20, y: 720, width: 900, height: 310, ...Z.edge },
    // Cloud
    { id: id.z_cloud, name: 'Cloud', x: 880, y: 40, width: 510, height: 560, ...Z.cloud },
  ];

  return {
    id: 'gtb-arvor-v2',
    name: "🏠 Les Jardins d'Arvor — Bénodet (111 appts)",
    description: "Résidence tourisme ★★★★ · 111 appartements · 6 bâtiments · 359 radiateurs fil pilote LoRaWAN · 114 ballons ECS · Classe A NF EN ISO 52120-1 · PMS + SymphonIA",
    category: 'vacances-bleues',
    categoryLabel: 'Vacances Bleues',
    tags: ['LoRaWAN', 'Fil pilote', 'Résidentiel', 'Classe A', 'PMS', 'ECS'],
    equipment, connections, zones,
    settings: SETTINGS,
  };
}

// ────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — Plein Sud (Hyères les Palmiers)
// Club ★★★ · 188 chambres
// GTC Trane Tracer SC+ (BACnet/IP) existante + SAUTER + CTA Atlantic
// Architecture : Trane SC+ BACnet/IP → Module Connecter → Cloud
// Classe A NF EN ISO 52120-1
// ────────────────────────────────────────────────────────────────────
function buildPleinSudTemplate(): GTBTemplateDefinition {
  const id = {
    // Toiture
    pac: uuidv4(),
    // Chambres
    vfc: uuidv4(), trane_sc: uuidv4(),
    // Chaufferie
    ecs_coll: uuidv4(), sauter: uuidv4(), cta: uuidv4(),
    // Bât. annexes
    pinede: uuidv4(),
    // Comptage
    compt: uuidv4(),
    // Edge
    connecter1: uuidv4(), connecter2: uuidv4(), gw_bacnet: uuidv4(),
    // Cloud
    cloud: uuidv4(), exploiter: uuidv4(), pms: uuidv4(),
    enedis: uuidv4(), meteo: uuidv4(), symphony: uuidv4(),
    // Zones
    z_toiture: uuidv4(), z_chambres: uuidv4(), z_chaufferie: uuidv4(),
    z_pinede: uuidv4(), z_comptage: uuidv4(),
    z_edge: uuidv4(), z_cloud: uuidv4(),
    z_coffret1: uuidv4(), z_coffret2: uuidv4(),
  };

  const equipment: CanvasEquipment[] = [
    // ── TOITURE ── y=60
    {
      canvasId: id.pac, id: 'tpl-pac-trane', label: 'PAC réversible TRANE',
      name: 'PAC réversible Hôtel TRANE',
      type: 'terminal', category: 'hvac', protocol: 'Constructeur',
      icon: 'Flame', description: '⚠ BACnet/IP probable — confirmer modèle exact + protocole',
      hasCommCard: true, commCardProtocol: 'bacnet-ip', commCardLabel: 'Carte BACnet IP',
      x: 40, y: 80,
    },
    // ── CHAMBRES ── y=250
    {
      canvasId: id.vfc, id: 'tpl-vfc-trane', label: 'VFC gainables TRANE',
      name: 'Ventilo-convecteur gainable TRANE FED 200/400',
      type: 'terminal', category: 'hvac', protocol: 'Constructeur',
      icon: 'Fan', description: 'R+1 (70) + R+2 (70) + RdC (54)',
      quantity: 194, x: 40, y: 270,
    },
    {
      canvasId: id.trane_sc, id: 'tpl-trane-sc', label: 'Trane Tracer SC+',
      name: 'GTC Trane Tracer SC+ System Controller',
      type: 'automate', category: 'hvac', protocol: 'bacnet-ip',
      icon: 'Cpu', description: '⚠ Confirmer version logicielle + licence BACnet/IP active · BTL certifié',
      borderColor: '#f97316', headerBackgroundColor: '#fff7ed',
      x: 380, y: 270,
    },
    // ── CHAUFFERIE ── y=450
    {
      canvasId: id.ecs_coll, id: 'tpl-ecs-coll', label: 'ECS collectif',
      name: 'Ballons ECS 3×4000L + échangeur Alfa Laval 700kW',
      type: 'terminal', category: 'hvac', protocol: 'Constructeur',
      icon: 'Droplets', description: 'SALMON JRE 204-13/3 · ALFA LAVAL · LOWARA XYLEM ECOCIRC M25',
      x: 40, y: 470,
    },
    {
      canvasId: id.sauter, id: 'tpl-sauter', label: 'GTC SAUTER',
      name: 'Régulation SAUTER — ECS + piscine',
      type: 'automate', category: 'hvac', protocol: 'modbus-tcp',
      icon: 'Cpu', description: '⚠ Modbus TCP ou BACnet/IP — confirmer modèle exact',
      borderColor: '#2563eb', headerBackgroundColor: '#eff6ff',
      x: 380, y: 470,
    },
    {
      canvasId: id.cta, id: 'tpl-cta-atl', label: 'CTA double flux',
      name: 'CTA ATLANTIC DUOFLEX-V 3000',
      type: 'terminal', category: 'hvac', protocol: 'modbus-rtu',
      icon: 'Fan', description: '⚠ Modbus RTU probable — convertisseur RS485/TCP à prévoir · Restaurant + salle spectacle',
      x: 40, y: 620,
    },
    // ── BÂTIMENT PINÈDE ── y=780
    {
      canvasId: id.pinede, id: 'tpl-pinede', label: 'Bât. Pinède + Nurserie',
      name: 'PAC Roof top + VFC gainable + VMC + ECS 300L + 150L',
      type: 'automate', category: 'hvac', protocol: 'modbus-tcp',
      icon: 'Building2', description: '⚠ Protocole à confirmer sur site',
      x: 40, y: 800,
    },
    // ── SOUS-COMPTAGE ── y=960
    {
      canvasId: id.compt, id: 'tpl-compt2', label: 'Centrale de mesure',
      name: 'Centrale de mesure communicante',
      type: 'interface', category: 'metering', protocol: 'modbus-tcp',
      icon: 'Activity', description: 'Départs électriques hôtel',
      x: 40, y: 980,
    },
    // ── EDGE — Coffret GTB 1 (Chambres) ── y=270
    {
      canvasId: id.connecter1, id: 'tpl-conn1', label: 'Connecter',
      name: 'SCorp-io Module Connecter',
      type: 'interface', category: 'scorp-io', protocol: 'multi-protocole',
      icon: 'Box', description: 'Store & Forward · BACnet/IP (Trane SC+) · 4G/5G backup',
      ipAddress: '192.168.1.199', x: 660, y: 270,
    },
    {
      canvasId: id.gw_bacnet, id: 'tpl-gw-bacnet', label: 'GW BACnet/IP',
      name: 'Passerelle HV · CoolAutomation',
      type: 'interface', category: 'interface', protocol: 'bacnet-ip',
      icon: 'ArrowLeftRight', description: 'Passerelle BACnet/IP → équipements terrain',
      ipAddress: '192.168.1.150', x: 660, y: 460,
    },
    // ── EDGE — Coffret GTB 2 (Chaufferie) ── y=470
    {
      canvasId: id.connecter2, id: 'tpl-conn2', label: 'Connecter',
      name: 'SCorp-io Module Connecter',
      type: 'interface', category: 'scorp-io', protocol: 'multi-protocole',
      icon: 'Box', description: 'Store & Forward · Modbus TCP (SAUTER, CTA, Pinède) · 4G/5G backup',
      ipAddress: '192.168.1.200', x: 660, y: 620,
    },
    // ── CLOUD ── x=920
    {
      canvasId: id.cloud, id: 'tpl-cloud2', label: 'Cloud',
      name: 'Plateforme SCorp-io',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Designer · Exploiter · Cloud Data Manager · RGPD France',
      x: 920, y: 80,
    },
    {
      canvasId: id.exploiter, id: 'tpl-exploiter2', label: 'Exploiter',
      name: 'Module Exploiter',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'Monitor', description: 'Supervision · alarmes · Flex Orus Energy',
      x: 920, y: 300,
    },
    {
      canvasId: id.pms, id: 'tpl-pms2', label: 'PMS',
      name: 'Plateforme SaaS',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'CalendarDays', description: 'Oracle/FOLS/HMS/LEAN · Préchauffage Δ3°C avant arrivée',
      x: 1150, y: 80,
    },
    {
      canvasId: id.enedis, id: 'tpl-enedis2', label: 'Enedis',
      name: 'API Enedis',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Zap', description: 'Données consommation PDL · Hyères',
      x: 1150, y: 240,
    },
    {
      canvasId: id.meteo, id: 'tpl-meteo2', label: 'Météo',
      name: 'Station météo',
      type: 'cloud', category: 'interface', protocol: 'cloud-api',
      icon: 'Cloud', description: 'Prévisions météo locales · Hyères',
      x: 1150, y: 390,
    },
    {
      canvasId: id.symphony, id: 'tpl-symphony2', label: 'SymphonIA',
      name: 'IA optimisation énergétique',
      type: 'cloud', category: 'scorp-io', protocol: 'cloud-api',
      icon: 'BrainCircuit', description: "Météo Hyères + occupation + calendrier · jusqu'à 40% d'économies",
      x: 920, y: 500,
    },
  ];

  const connections: Connection[] = [
    // PAC Trane → Connecter 1 (BACnet/IP)
    { id: uuidv4(), sourceId: id.pac, targetId: id.connecter1, name: 'BACnet / IP', protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    // VFC → Trane SC+ (constructeur / BACnet MS/TP)
    { id: uuidv4(), sourceId: id.vfc, targetId: id.trane_sc, protocol: 'bacnet-mstp', style: 'solid', pathType: 'orthogonal' },
    // Trane SC+ → Connecter 1 (BACnet/IP)
    { id: uuidv4(), sourceId: id.trane_sc, targetId: id.connecter1, name: 'BACnet / IP', protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    // Connecter 1 → GW BACnet
    { id: uuidv4(), sourceId: id.connecter1, targetId: id.gw_bacnet, protocol: 'bacnet-ip', style: 'solid', pathType: 'orthogonal' },
    // ECS → SAUTER
    { id: uuidv4(), sourceId: id.ecs_coll, targetId: id.sauter, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    // SAUTER → Connecter 2 (Modbus TCP)
    { id: uuidv4(), sourceId: id.sauter, targetId: id.connecter2, name: 'Modbus TCP', protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    // CTA → Connecter 2 (Modbus RTU)
    { id: uuidv4(), sourceId: id.cta, targetId: id.connecter2, name: 'Modbus RTU', protocol: 'modbus-rtu', style: 'solid', pathType: 'orthogonal' },
    // Pinède → Connecter 2
    { id: uuidv4(), sourceId: id.pinede, targetId: id.connecter2, protocol: 'modbus-tcp', style: 'dashed', pathType: 'orthogonal' },
    // Comptage → Connecter 2
    { id: uuidv4(), sourceId: id.compt, targetId: id.connecter2, protocol: 'modbus-tcp', style: 'solid', pathType: 'orthogonal' },
    // Connecters → Cloud (4G LTE)
    { id: uuidv4(), sourceId: id.connecter1, targetId: id.cloud, name: '4G LTE', protocol: 'none', style: 'dashed', pathType: 'orthogonal', arrowEnd: true, arrowStart: true },
    { id: uuidv4(), sourceId: id.connecter2, targetId: id.cloud, name: '4G LTE', protocol: 'none', style: 'dashed', pathType: 'orthogonal', arrowEnd: true, arrowStart: true },
    // Cloud ↔ services
    { id: uuidv4(), sourceId: id.cloud, targetId: id.exploiter, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.pms, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.enedis, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.meteo, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
    { id: uuidv4(), sourceId: id.cloud, targetId: id.symphony, protocol: 'cloud-api', style: 'dashed', pathType: 'orthogonal' },
  ];

  const zones: Zone[] = [
    { id: id.z_toiture,    name: 'Toiture',                    x: 20,  y: 40,   width: 600, height: 170, ...Z.toiture },
    { id: id.z_chambres,   name: 'Chambres',                   x: 20,  y: 230,  width: 600, height: 170, ...Z.chambres },
    { id: id.z_chaufferie, name: 'Chaufferie',                 x: 20,  y: 430,  width: 600, height: 350, ...Z.chaufferie },
    { id: id.z_pinede,     name: 'Bât. Pinède + Nurserie',     x: 20,  y: 760,  width: 600, height: 160, ...Z.terrain },
    { id: id.z_comptage,   name: 'Sous-Comptage',              x: 20,  y: 940,  width: 600, height: 160, ...Z.comptage },
    { id: id.z_coffret1,   name: 'Coffret GTB — Chambres',     x: 640, y: 230,  width: 220, height: 290, ...Z.coffret },
    { id: id.z_coffret2,   name: 'Coffret GTB — Chaufferie',   x: 640, y: 580,  width: 220, height: 200, ...Z.coffret },
    { id: id.z_edge,       name: 'Edge',                       x: 20,  y: 20,   width: 840, height: 1100, ...Z.edge },
    { id: id.z_cloud,      name: 'Cloud',                      x: 880, y: 40,   width: 510, height: 580, ...Z.cloud },
  ];

  return {
    id: 'gtb-plein-sud-v2',
    name: '🏨 Plein Sud — Hyères les Palmiers (188 chambres)',
    description: "Club ★★★ · 188 chambres · GTC Trane Tracer SC+ (BACnet/IP) existante + SAUTER + CTA Atlantic · Classe A NF EN ISO 52120-1 · PMS + SymphonIA + Flex Orus Energy",
    category: 'vacances-bleues',
    categoryLabel: 'Vacances Bleues',
    tags: ['BACnet/IP', 'Trane SC+', 'SAUTER', 'GTC existante', 'Classe A', 'PMS', 'Hôtellerie'],
    equipment, connections, zones,
    settings: SETTINGS,
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
