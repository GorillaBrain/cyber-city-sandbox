/**
 * Deterministic City & Network Topology Generator
 * Produces reproducible 3D voxel building layouts, logical systems (20-30 Small,
 * 50-80 Medium, 100-150 Large), realistic segmented network topologies, and
 * initial security posture based on seed and configuration.
 */

import { createPRNG } from './prng.js';
import {
  BUILDING_ARCHETYPES,
  NETWORK_ZONES,
  VULNERABILITY_CATALOG,
  DEFENSIVE_CONTROLS,
} from './catalog.js';

export const CITY_SIZE_PRESETS = {
  small: {
    id: 'small',
    label: 'Small District (20–30 Systems)',
    buildingCount: 10,
    systemsPerBuilding: [2, 3],
    gridRadius: 11,
  },
  medium: {
    id: 'medium',
    label: 'Medium Sector (50–80 Systems)',
    buildingCount: 18,
    systemsPerBuilding: [3, 4],
    gridRadius: 15,
  },
  large: {
    id: 'large',
    label: 'Large Metropolis (100–150 Systems)',
    buildingCount: 32,
    systemsPerBuilding: [3, 5],
    gridRadius: 21,
  },
};

const CORE_TEN_BLUEPRINT = [
  {
    slotId: 'BLD-RES-01',
    name: 'Kowloon Hab-Block 01',
    archetype: 'residential',
    coords: [-3.8, 5.2],
    defaultVulns: ['SIM-VULN-001', 'SIM-VULN-002'],
  },
  {
    slotId: 'BLD-PUB-01',
    name: 'SkyLine Mag-Transit Hub',
    archetype: 'transport',
    coords: [-6.8, 4.4],
    defaultVulns: ['SIM-VULN-010', 'SIM-VULN-002'],
  },
  {
    slotId: 'BLD-GOV-01',
    name: 'Civic Net Command Plaza',
    archetype: 'government',
    coords: [3.4, -5.2],
    defaultVulns: ['SIM-VULN-010', 'SIM-VULN-009'],
  },
  {
    slotId: 'BLD-CORP-01',
    name: 'Vectra Corp Tower',
    archetype: 'corporate',
    coords: [3.5, -1.6],
    defaultVulns: ['SIM-VULN-003', 'SIM-VULN-004', 'SIM-VULN-005'],
  },
  {
    slotId: 'BLD-TEL-01',
    name: 'Pulse-6G Spine Tower',
    archetype: 'telecom',
    coords: [-6.2, -4.6],
    defaultVulns: ['SIM-VULN-009', 'SIM-VULN-003'],
  },
  {
    slotId: 'BLD-FIN-01',
    name: 'Quant-Fin Exchange Spire',
    archetype: 'financial',
    coords: [5.4, 4.4],
    defaultVulns: ['SIM-VULN-003', 'SIM-VULN-005'],
  },
  {
    slotId: 'BLD-DC-01',
    name: 'Hyper-DC Core Vault',
    archetype: 'datacenter',
    coords: [6.4, -0.4],
    defaultVulns: ['SIM-VULN-007', 'SIM-VULN-006', 'SIM-VULN-005'],
  },
  {
    slotId: 'BLD-FAC-01',
    name: 'Cyber-Fab Robotics Plant',
    archetype: 'factory',
    coords: [-5.8, -0.8],
    defaultVulns: ['SIM-VULN-008', 'SIM-VULN-009'],
  },
  {
    slotId: 'BLD-POW-01',
    name: 'Volt-01 Fusion Substation',
    archetype: 'power',
    coords: [-4.6, 2.2],
    defaultVulns: ['SIM-VULN-008', 'SIM-VULN-010'],
  },
  {
    slotId: 'BLD-HOS-01',
    name: 'Vita-Care Bio-Medical Center',
    archetype: 'hospital',
    coords: [3.3, 2.0],
    defaultVulns: ['SIM-VULN-005', 'SIM-VULN-008'],
  },
];

const EXTRA_BUILDING_NAMES = {
  residential: ['Neo-ShinjukuStacks', 'Arcology Block B', 'Prism Lofts', 'Sector-7 Hab', 'Mirage Suites'],
  corporate: ['Aether Dynamics', 'Kiroshi Systems', 'Synapse Plaza', 'Helios Tower', 'Onyx Enterprise'],
  factory: ['Nano-Forge 02', 'Synth-Polymer Mill', 'Auto-Drive Plant', 'Orbital Optics Fab'],
  datacenter: ['Cold-Storage Annex', 'Mirror-Vault East', 'Sub-Zero Compute', 'Nexus Cloud Node'],
  hospital: ['Trauma-Net Pavilion', 'Neuro-Care Annex', 'Gene-Synth Clinic'],
  financial: ['Apex Clearing House', 'Sovereign Bond Tower', 'Cipher Reserve'],
  transport: ['Drone-Port Delta', 'Hyper-Loop Terminal', 'Cargo-Grid Hub'],
  power: ['Helios Capacitor Bank', 'Tidal-Grid Relay', 'Cryo-Transformer 04'],
  telecom: ['Laser-Link Relay', 'Sat-Uplink Spire', 'Quantum Key Node'],
  government: ['Traffic Control Bureau', 'Water Purity Authority', 'Civil Defense Node'],
};

export function createDefaultZonePolicies() {
  return {
    'RESIDENTIAL_ZONE->PUBLIC_SERVICES': {
      id: 'RESIDENTIAL_ZONE->PUBLIC_SERVICES',
      sourceZone: 'RESIDENTIAL_ZONE',
      targetZone: 'PUBLIC_SERVICES',
      allowed: true,
      legitimateDependency: true,
      description: 'Citizen access to transit and municipal portals.',
    },
    'RESIDENTIAL_ZONE->CORPORATE_USERS': {
      id: 'RESIDENTIAL_ZONE->CORPORATE_USERS',
      sourceZone: 'RESIDENTIAL_ZONE',
      targetZone: 'CORPORATE_USERS',
      allowed: true,
      legitimateDependency: false,
      description: 'Unrestricted remote residential bridge to corporate endpoints (unsafe by default).',
    },
    'PUBLIC_SERVICES->CORE_SERVERS': {
      id: 'PUBLIC_SERVICES->CORE_SERVERS',
      sourceZone: 'PUBLIC_SERVICES',
      targetZone: 'CORE_SERVERS',
      allowed: true,
      legitimateDependency: true,
      description: 'Public portal API queries to core application servers.',
    },
    'PUBLIC_SERVICES->INDUSTRIAL_CRITICAL': {
      id: 'PUBLIC_SERVICES->INDUSTRIAL_CRITICAL',
      sourceZone: 'PUBLIC_SERVICES',
      targetZone: 'INDUSTRIAL_CRITICAL',
      allowed: true,
      legitimateDependency: false,
      description: 'Direct telemetry bridge from public services into critical OT/infrastructure.',
    },
    'CORPORATE_USERS->CORE_SERVERS': {
      id: 'CORPORATE_USERS->CORE_SERVERS',
      sourceZone: 'CORPORATE_USERS',
      targetZone: 'CORE_SERVERS',
      allowed: true,
      legitimateDependency: true,
      description: 'Enterprise workstation access to application and file services.',
    },
    'CORPORATE_USERS->MANAGEMENT_ZONE': {
      id: 'CORPORATE_USERS->MANAGEMENT_ZONE',
      sourceZone: 'CORPORATE_USERS',
      targetZone: 'MANAGEMENT_ZONE',
      allowed: true,
      legitimateDependency: true,
      description: 'Identity authentication and directory lookups.',
    },
    'CORPORATE_USERS->INDUSTRIAL_CRITICAL': {
      id: 'CORPORATE_USERS->INDUSTRIAL_CRITICAL',
      sourceZone: 'CORPORATE_USERS',
      targetZone: 'INDUSTRIAL_CRITICAL',
      allowed: true,
      legitimateDependency: false,
      description: 'Direct IT-to-OT engineering link into factory and power controllers.',
    },
    'MANAGEMENT_ZONE->CORE_SERVERS': {
      id: 'MANAGEMENT_ZONE->CORE_SERVERS',
      sourceZone: 'MANAGEMENT_ZONE',
      targetZone: 'CORE_SERVERS',
      allowed: true,
      legitimateDependency: true,
      description: 'Core routing, DNS, and identity management for data centers.',
    },
    'MANAGEMENT_ZONE->INDUSTRIAL_CRITICAL': {
      id: 'MANAGEMENT_ZONE->INDUSTRIAL_CRITICAL',
      sourceZone: 'MANAGEMENT_ZONE',
      targetZone: 'INDUSTRIAL_CRITICAL',
      allowed: true,
      legitimateDependency: true,
      description: 'Authorized telemetry collection and time-sync for critical infrastructure.',
    },
  };
}

function createVulnerabilityInstance(catalogId, buildingId, discovered = false, mitigated = false) {
  const spec = VULNERABILITY_CATALOG[catalogId];
  if (!spec) return null;
  return {
    id: `${buildingId}:${catalogId}`,
    catalogId: spec.id,
    name: spec.name,
    description: spec.description,
    severity: spec.severity,
    vector: spec.vector,
    preconditions: spec.preconditions,
    potentialImpact: spec.potentialImpact,
    remediation: spec.remediation,
    mitigatedByControls: [...spec.mitigatedByControls],
    patchable: spec.patchable,
    discovered: Boolean(discovered),
    mitigated: Boolean(mitigated),
    status: mitigated ? 'MITIGATED' : discovered ? 'DISCOVERED' : 'UNKNOWN',
  };
}

export function computeBuildingSecurityScore(building) {
  let score = 58;
  const activeVulns = building.vulnerabilities.filter((v) => v.status !== 'MITIGATED');
  for (const v of activeVulns) {
    if (v.severity === 'CRITICAL') score -= 18;
    else if (v.severity === 'HIGH') score -= 12;
    else if (v.severity === 'MEDIUM') score -= 7;
    else score -= 4;
  }
  for (const ctrlId of building.installedControls) {
    const spec = DEFENSIVE_CONTROLS[ctrlId];
    if (spec) score += spec.securityScoreBonus;
  }
  if (building.compromiseState === 'AFFECTED') score -= 30;
  else if (building.compromiseState !== 'NONE') score -= 20;

  return Math.max(5, Math.min(100, Math.round(score)));
}

export function generateCity(config = {}) {
  const seed = String(config.seed ?? 'CYBER-2088').trim() || 'CYBER-2088';
  const sizeKey = CITY_SIZE_PRESETS[config.size] ? config.size : 'small';
  const preset = CITY_SIZE_PRESETS[sizeKey];
  const density = config.density || 'dense'; // 'standard' | 'dense' | 'ultra'
  const difficulty = config.difficulty || 'normal'; // 'relaxed' | 'normal' | 'hard'
  const securityMaturity = config.securityMaturity || 'mixed'; // 'low' | 'mixed' | 'high'

  const rng = createPRNG(`${seed}:${sizeKey}:${density}:${difficulty}:${securityMaturity}`);
  const buildings = [];
  const archetypeKeys = Object.keys(BUILDING_ARCHETYPES);

  // 1. Place the core 10 buildings first so every archetype is always represented
  for (let i = 0; i < CORE_TEN_BLUEPRINT.length; i++) {
    const bp = CORE_TEN_BLUEPRINT[i];
    const arch = BUILDING_ARCHETYPES[bp.archetype];
    const jitterX = rng.float(-0.16, 0.16);
    const jitterZ = rng.float(-0.16, 0.16);
    const height = Number(rng.float(arch.baseHeight[0], arch.baseHeight[1]).toFixed(2));
    const width = Number((arch.footprint[0] * rng.float(0.94, 1.04)).toFixed(2));
    const depth = Number((arch.footprint[1] * rng.float(0.94, 1.04)).toFixed(2));

    buildings.push(
      buildSingleNode({
        id: bp.slotId,
        name: bp.name,
        archetypeKey: bp.archetype,
        position: [Number((bp.coords[0] + jitterX).toFixed(2)), 0, Number((bp.coords[1] + jitterZ).toFixed(2))],
        width,
        depth,
        height,
        defaultVulns: bp.defaultVulns,
        preset,
        rng,
        securityMaturity,
        difficulty,
        index: i,
      })
    );
  }

  // 2. For medium and large cities, place outer ring buildings deterministically
  const extraCount = preset.buildingCount - CORE_TEN_BLUEPRINT.length;
  const usedCoords = buildings.map((b) => [b.position[0], b.position[2]]);

  for (let e = 0; e < extraCount; e++) {
    const archKey = archetypeKeys[(e + rng.int(0, 3)) % archetypeKeys.length];
    const arch = BUILDING_ARCHETYPES[archKey];
    const ringIndex = Math.floor(e / 10) + 1;
    const angle = ((e % 11) / 11) * Math.PI * 2 + rng.float(-0.18, 0.18);
    const radius = 11.2 + ringIndex * 4.2 + rng.float(-0.6, 0.6);
    let x = Number((Math.cos(angle) * radius).toFixed(2));
    let z = Number((Math.sin(angle) * radius).toFixed(2));

    // Keep clear of central avenue corridor (x between -2.8 and +1.2) and existing buildings
    for (let attempt = 0; attempt < 16; attempt++) {
      if (x > -2.8 && x < 1.2) {
        x = x < -0.8 ? -3.4 : 2.0;
      }
      const tooClose = usedCoords.some(([ux, uz]) => Math.hypot(ux - x, uz - z) < 3.6);
      if (!tooClose) break;
      x = Number((x + rng.float(-2.8, 2.8)).toFixed(2));
      z = Number((z + rng.float(-2.8, 2.8)).toFixed(2));
    }
    usedCoords.push([x, z]);

    const namePool = EXTRA_BUILDING_NAMES[archKey] || [arch.name];
    const buildingName = `${namePool[e % namePool.length]} #${e + 2}`;
    const id = `BLD-EXT-${String(e + 1).padStart(2, '0')}`;
    const height = Number(rng.float(arch.baseHeight[0], arch.baseHeight[1]).toFixed(2));
    const width = Number((arch.footprint[0] * rng.float(0.9, 1.1)).toFixed(2));
    const depth = Number((arch.footprint[1] * rng.float(0.9, 1.1)).toFixed(2));

    const vulnIds = pickVulnerabilitiesForArchetype(archKey, rng);

    buildings.push(
      buildSingleNode({
        id,
        name: buildingName,
        archetypeKey: archKey,
        position: [x, 0, z],
        width,
        depth,
        height,
        defaultVulns: vulnIds,
        preset,
        rng,
        securityMaturity,
        difficulty,
        index: CORE_TEN_BLUEPRINT.length + e,
      })
    );
  }

  // 3. Generate meaningful, segmented network graph edges
  const zonePolicies = createDefaultZonePolicies();
  const connections = generateNetworkConnections(buildings, zonePolicies, rng, density);

  // Populate connectedBuildingIds on each building
  for (const b of buildings) {
    b.connectedBuildingIds = [];
  }
  for (const conn of connections) {
    const src = buildings.find((b) => b.id === conn.source);
    const dst = buildings.find((b) => b.id === conn.target);
    if (src && !src.connectedBuildingIds.includes(conn.target)) {
      src.connectedBuildingIds.push(conn.target);
    }
    if (dst && !dst.connectedBuildingIds.includes(conn.source)) {
      dst.connectedBuildingIds.push(conn.source);
    }
  }

  const totalLogicalSystems = buildings.reduce((acc, b) => acc + b.services.length, 0);

  return {
    seed,
    size: sizeKey,
    density,
    difficulty,
    securityMaturity,
    buildings,
    connections,
    zonePolicies,
    totalLogicalSystems,
  };
}

function pickVulnerabilitiesForArchetype(archKey, rng) {
  const mapping = {
    residential: ['SIM-VULN-001', 'SIM-VULN-002', 'SIM-VULN-009'],
    corporate: ['SIM-VULN-003', 'SIM-VULN-004', 'SIM-VULN-005'],
    factory: ['SIM-VULN-008', 'SIM-VULN-009'],
    datacenter: ['SIM-VULN-007', 'SIM-VULN-006', 'SIM-VULN-005'],
    hospital: ['SIM-VULN-005', 'SIM-VULN-008', 'SIM-VULN-009'],
    financial: ['SIM-VULN-003', 'SIM-VULN-004', 'SIM-VULN-006'],
    transport: ['SIM-VULN-010', 'SIM-VULN-002'],
    power: ['SIM-VULN-008', 'SIM-VULN-010'],
    telecom: ['SIM-VULN-009', 'SIM-VULN-003'],
    government: ['SIM-VULN-010', 'SIM-VULN-007', 'SIM-VULN-009'],
  };
  const candidates = mapping[archKey] || ['SIM-VULN-009'];
  const picked = [candidates[0]];
  if (candidates[1] && rng.chance(0.75)) picked.push(candidates[1]);
  if (candidates[2] && rng.chance(0.4)) picked.push(candidates[2]);
  return picked;
}

function buildSingleNode({
  id,
  name,
  archetypeKey,
  position,
  width,
  depth,
  height,
  defaultVulns,
  preset,
  rng,
  securityMaturity,
  difficulty,
  index,
}) {
  const arch = BUILDING_ARCHETYPES[archetypeKey];
  const [minSys, maxSys] = preset.systemsPerBuilding;
  const sysCount = rng.int(minSys, maxSys);
  const services = [];

  for (let s = 0; s < sysCount; s++) {
    const tpl = arch.logicalSystemTemplates[s % arch.logicalSystemTemplates.length];
    const suffix = s >= arch.logicalSystemTemplates.length ? ` #${s + 1}` : '';
    services.push({
      id: `${id}-SYS-0${s + 1}`,
      name: `${tpl.role}${suffix}`,
      protocol: tpl.service,
      status: 'ONLINE',
    });
  }

  // Initial controls based on securityMaturity
  const installedControls = [];
  if (securityMaturity === 'high') {
    installedControls.push('logging');
    if (arch.defaultCriticality === 'CRITICAL') {
      installedControls.push('backup_recovery');
    }
  } else if (securityMaturity === 'mixed') {
    if (archetypeKey === 'telecom' || archetypeKey === 'financial') {
      installedControls.push('logging');
    }
  }

  // Create vulnerabilities
  const vulnerabilities = [];
  const vulnList = [...new Set(defaultVulns)];
  if (difficulty === 'hard' && !vulnList.includes('SIM-VULN-009')) {
    vulnList.push('SIM-VULN-009');
  }

  for (const vId of vulnList) {
    const isMitigated = installedControls.some((cId) =>
      VULNERABILITY_CATALOG[vId]?.mitigatedByControls.includes(cId)
    );
    const isDiscovered = securityMaturity === 'high' ? rng.chance(0.5) : false;
    const inst = createVulnerabilityInstance(vId, id, isDiscovered, isMitigated);
    if (inst) vulnerabilities.push(inst);
  }

  const eligibleUpgrades = Object.values(DEFENSIVE_CONTROLS)
    .filter(
      (ctrl) =>
        ctrl.eligibleArchetypes === 'ALL' || ctrl.eligibleArchetypes.includes(archetypeKey)
    )
    .map((ctrl) => ctrl.id);

  const building = {
    id,
    name,
    archetype: archetypeKey,
    archetypeName: arch.name,
    position,
    dimensions: {
      width,
      depth,
      height,
      tiers: rng.int(2, 4),
      antennaHeight: Number(rng.float(1.2, 3.0).toFixed(2)),
      hasBillboard: rng.chance(0.75),
      signText: arch.signLabels[index % arch.signLabels.length],
      palette: arch.palette,
      seedOffset: rng.float(0, 100),
    },
    networkSegmentId: arch.zone,
    zoneName: NETWORK_ZONES[arch.zone].name,
    systemRole: arch.systemRole,
    criticality: arch.defaultCriticality,
    healthStatus: 'HEALTHY',
    securityScore: 70,
    vulnerabilities,
    installedControls,
    services,
    connectedBuildingIds: [],
    compromiseState: 'NONE',
    detectionState: installedControls.includes('logging') ? 'MONITORED' : 'UNMONITORED',
    isolated: false,
    snapshotClean: true,
    availableUpgrades: eligibleUpgrades,
  };

  building.securityScore = computeBuildingSecurityScore(building);
  return building;
}

function generateNetworkConnections(buildings, zonePolicies, rng, density) {
  const connections = [];
  const addedPairs = new Set();

  function addEdge(sourceId, targetId, type, trafficCategories, trust, legitimate = true) {
    if (sourceId === targetId) return;
    const key = [sourceId, targetId].sort().join('--');
    if (addedPairs.has(key)) return;
    const srcB = buildings.find((b) => b.id === sourceId);
    const dstB = buildings.find((b) => b.id === targetId);
    if (!srcB || !dstB) return;

    addedPairs.add(key);
    const policyKey = `${srcB.networkSegmentId}->${dstB.networkSegmentId}`;
    const reversePolicyKey = `${dstB.networkSegmentId}->${srcB.networkSegmentId}`;
    const matchedPolicy = zonePolicies[policyKey] || zonePolicies[reversePolicyKey];

    connections.push({
      id: `CONN-${String(connections.length + 1).padStart(2, '0')}`,
      source: sourceId,
      target: targetId,
      connectionType: type,
      allowedTrafficCategories: trafficCategories,
      trustRelationship: trust,
      securityBoundary:
        srcB.networkSegmentId === dstB.networkSegmentId
          ? 'INTRA_ZONE'
          : `${srcB.networkSegmentId}<->${dstB.networkSegmentId}`,
      latencyMs: rng.int(2, 18),
      bandwidthGbps: rng.pick([10, 25, 40, 100]),
      permitted: matchedPolicy ? matchedPolicy.allowed : true,
      policyRuleId: matchedPolicy ? matchedPolicy.id : 'INTRA_ZONE_DEFAULT',
      legitimateDependency: legitimate,
      trafficState: 'NORMAL',
      blockedReason: null,
    });
  }

  // Core structured pathways across the 10 primary buildings
  // Residential -> Public Transit & Corporate (remote work bridge)
  addEdge('BLD-RES-01', 'BLD-PUB-01', 'FIBER_UPLINK', ['MQTT', 'HTTP'], 'PEER_UNTRUSTED', true);
  addEdge('BLD-RES-01', 'BLD-CORP-01', 'VPN_BRIDGE', ['RDP', 'HTTPS'], 'REMOTE_ACCESS', false);

  // Public Infrastructure links
  addEdge('BLD-PUB-01', 'BLD-GOV-01', 'MUNICIPAL_RING', ['TELEMETRY', 'HTTPS'], 'MUNICIPAL_TRUST', true);
  addEdge('BLD-PUB-01', 'BLD-POW-01', 'GRID_TELEMETRY', ['DNP3', 'TELEMETRY'], 'LEGACY_RELAY', false);
  addEdge('BLD-GOV-01', 'BLD-DC-01', 'CLOUD_INGRESS', ['HTTPS', 'API'], 'PUBLIC_INGRESS', true);
  addEdge('BLD-GOV-01', 'BLD-HOS-01', 'EMERGENCY_BUS', ['HL7', 'DISPATCH'], 'CIVIC_CRITICAL', true);

  // Corporate & Financial to Telecom & Data Center
  addEdge('BLD-CORP-01', 'BLD-TEL-01', 'CORE_TRUNK', ['LDAP', 'DNS', 'HTTPS'], 'DOMAIN_TRUST', true);
  addEdge('BLD-CORP-01', 'BLD-FIN-01', 'SETTLEMENT_LINK', ['SMB', 'FIX'], 'PARTNER_TRUST', true);
  addEdge('BLD-CORP-01', 'BLD-DC-01', 'APP_BACKBONE', ['SMB', 'POSTGRES', 'HTTPS'], 'INTERNAL_TRUST', true);
  addEdge('BLD-CORP-01', 'BLD-FAC-01', 'IT_OT_BRIDGE', ['OPC-UA', 'SMB'], 'PERMISSIVE_BRIDGE', false);

  // Telecom & Data Center to Critical Infrastructure
  addEdge('BLD-TEL-01', 'BLD-DC-01', 'DARK_FIBER', ['BGP', 'VAULT', 'LDAP'], 'BACKBONE_HIGH', true);
  addEdge('BLD-TEL-01', 'BLD-POW-01', 'SCADA_TIMING', ['IEC61850', 'NETFLOW'], 'INFRA_MANAGEMENT', true);
  addEdge('BLD-FIN-01', 'BLD-DC-01', 'LEDGER_SYNC', ['HTTPS', 'VAULT'], 'HIGH_ASSURANCE', true);
  addEdge('BLD-FAC-01', 'BLD-POW-01', 'MICROGRID_BUS', ['MODBUS', 'DNP3'], 'OT_PEER', true);
  addEdge('BLD-POW-01', 'BLD-HOS-01', 'PRIORITY_FEED', ['TELEMETRY', 'IEC61850'], 'LIFE_SAFETY', true);
  addEdge('BLD-DC-01', 'BLD-HOS-01', 'CLINICAL_ARCHIVE', ['DICOM', 'HL7'], 'HEALTH_CLOUD', true);

  // Connect any additional buildings (Medium / Large modes) to nearest same-zone and 1 backbone hub
  const coreBuildings = buildings.slice(0, 10);
  const extraBuildings = buildings.slice(10);

  for (const ext of extraBuildings) {
    // Same-zone peer
    const sameZonePeers = buildings.filter(
      (b) => b.id !== ext.id && b.networkSegmentId === ext.networkSegmentId
    );
    if (sameZonePeers.length > 0) {
      sameZonePeers.sort(
        (a, b) =>
          Math.hypot(a.position[0] - ext.position[0], a.position[2] - ext.position[2]) -
          Math.hypot(b.position[0] - ext.position[0], b.position[2] - ext.position[2])
      );
      addEdge(ext.id, sameZonePeers[0].id, 'ZONE_MESH', ['HTTPS', 'TELEMETRY'], 'ZONE_PEER', true);
    }

    // Nearest core hub
    const sortedCore = [...coreBuildings].sort(
      (a, b) =>
        Math.hypot(a.position[0] - ext.position[0], a.position[2] - ext.position[2]) -
        Math.hypot(b.position[0] - ext.position[0], b.position[2] - ext.position[2])
    );
    const hub = sortedCore[0];
    const isCrossZoneUnsafe =
      ext.networkSegmentId === 'RESIDENTIAL_ZONE' &&
      hub.networkSegmentId === 'INDUSTRIAL_CRITICAL';
    addEdge(
      ext.id,
      hub.id,
      'SECTOR_UPLINK',
      ['HTTPS', 'TELEMETRY'],
      isCrossZoneUnsafe ? 'UNVERIFIED_BRIDGE' : 'SECTOR_TRUNK',
      !isCrossZoneUnsafe
    );

    if (density === 'ultra' && sortedCore[1]) {
      addEdge(ext.id, sortedCore[1].id, 'REDUNDANT_FIBER', ['HTTPS'], 'FAILOVER_LINK', true);
    }
  }

  return connections;
}
