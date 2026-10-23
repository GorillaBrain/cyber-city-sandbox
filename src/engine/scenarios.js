/**
 * Cyber City Sandbox — Campaign Missions & Deterministic Attack Scenarios
 * Defines Scenarios A through F with explicit preconditions, stage transitions,
 * benign distraction events, objectives, constraints, and debrief learning points.
 */

export const SCENARIOS = {
  SCENARIO_A_SMART_HOME: {
    id: 'SCENARIO_A_SMART_HOME',
    code: 'MISSION-01',
    title: 'Scenario A — Compromised Smart Home Gateway',
    shortTitle: 'Smart Home Gateway',
    difficulty: 'Beginner',
    startingBudget: 520,
    recommendedSeed: 'KOWLOON-IOT-01',
    briefing:
      'Anomalous outbound MQTT beacons have been observed in the residential sector. A smart home gateway in Kowloon Hab-Block 01 retains default firmware credentials (SIM-VULN-001) and sits on an unsegmented broadcast bridge (SIM-VULN-002) connected to the public transit hub and a corporate remote-access bridge.',
    threatDescription:
      'Automated IoT botnet worm attempting initial foothold on BLD-RES-01 and lateral broadcast into BLD-PUB-01 and BLD-CORP-01.',
    hiddenFacts: [
      'BLD-RES-01 hosts SIM-VULN-001 (Default Firmware Credentials) and SIM-VULN-002 (Unsegmented Lateral IoT Broadcast Bridge).',
      'BLD-FIN-01 experiences a benign high-volume market settlement spike at Tick 2 — isolating it needlessly lowers availability.',
    ],
    initialCompromise: {
      buildingId: 'BLD-RES-01',
      state: 'FOOTHOLD',
      vulnId: 'SIM-VULN-001',
    },
    benignEvents: [
      {
        tick: 2,
        buildingId: 'BLD-FIN-01',
        targetId: 'BLD-DC-01',
        description: 'Routine high-frequency market settlement batch (Benign high-volume traffic spike).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-RES-01',
        targetId: 'BLD-PUB-01',
        vector: 'LATERAL_IOT_BRIDGE',
        requiredVuln: 'SIM-VULN-002',
        targetState: 'LATERAL',
        description: 'IoT broadcast worm pivots from Kowloon Hab-Block 01 across unsegmented fiber link to SkyLine Mag-Transit Hub.',
      },
      {
        tick: 4,
        sourceId: 'BLD-RES-01',
        targetId: 'BLD-CORP-01',
        vector: 'IOT_GATEWAY_AUTH',
        requiredVuln: 'SIM-VULN-003',
        targetState: 'LATERAL',
        description: 'Compromised residential gateway probes split-tunnel VPN bridge toward Vectra Corp Tower.',
      },
      {
        tick: 6,
        sourceId: 'BLD-PUB-01',
        targetId: 'BLD-GOV-01',
        vector: 'UNSIGNED_TELEMETRY_RELAY',
        requiredVuln: 'SIM-VULN-010',
        targetState: 'AFFECTED',
        description: 'Transit hub propagates malformed municipal telemetry packets to Civic Net Command Plaza.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-A1',
        label: 'Inspect Kowloon Hab-Block 01 (BLD-RES-01) and discover its gateway vulnerabilities',
        type: 'DISCOVER_BUILDING_VULNS',
        targetBuildingId: 'BLD-RES-01',
      },
      {
        id: 'OBJ-A2',
        label: 'Segment or firewall the residential boundary (install Segmentation or Firewall on BLD-RES-01 or BLD-PUB-01, or block unsafe zone policy)',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-RES-01', 'BLD-PUB-01'],
        controlIds: ['segmentation', 'firewall', 'patch_mgmt', 'mfa'],
      },
      {
        id: 'OBJ-A3',
        label: 'Neutralize and restore all compromised or affected buildings to HEALTHY status',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
      {
        id: 'OBJ-A4',
        label: 'Maintain at least 85% city-wide service availability (avoid isolating unaffected towers)',
        type: 'MIN_AVAILABILITY',
        threshold: 85,
      },
    ],
    debrief:
      'Consumer and building IoT gateways frequently ship with weak default authentication and flat layer-2 bridging. Enforcing network segmentation, patching firmware, and disabling unnecessary residential-to-corporate bridges stops botnet lateral movement before it reaches municipal infrastructure.',
  },

  SCENARIO_B_CORP_CREDENTIAL: {
    id: 'SCENARIO_B_CORP_CREDENTIAL',
    code: 'MISSION-02',
    title: 'Scenario B — Corporate Credential Compromise',
    shortTitle: 'Credential Compromise',
    difficulty: 'Intermediate',
    startingBudget: 560,
    recommendedSeed: 'VECTRA-AUTH-02',
    briefing:
      'Threat intelligence indicates an executive session token from Vectra Corp Tower (BLD-CORP-01) was harvested in a spear-phishing campaign. The attacker simulation is preparing to replay tokens across partner settlement links and escalate privileges on internal shares.',
    threatDescription:
      'Stolen identity session replay (SIM-VULN-003) and administrative share escalation (SIM-VULN-004) targeting Financial and Telecom backbone nodes.',
    hiddenFacts: [
      'BLD-CORP-01 lacks MFA (SIM-VULN-003) and has excessive share privileges (SIM-VULN-004).',
      'Installing Centralized Logging on BLD-CORP-01 or BLD-TEL-01 preserves forensic evidence for maximum score.',
    ],
    initialCompromise: {
      buildingId: 'BLD-CORP-01',
      state: 'FOOTHOLD',
      vulnId: 'SIM-VULN-003',
    },
    benignEvents: [
      {
        tick: 2,
        buildingId: 'BLD-DC-01',
        targetId: 'BLD-HOS-01',
        description: 'Scheduled clinical imaging archive synchronization (Benign medical data transfer).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-CORP-01',
        vector: 'PRIVILEGE_ESCALATION_SHARE',
        requiredVuln: 'SIM-VULN-004',
        targetState: 'ESCALATED',
        description: 'Compromised corporate session escalates privileges via unrestricted administrative shares on BLD-CORP-01.',
      },
      {
        tick: 4,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-FIN-01',
        vector: 'CREDENTIAL_REPLAY',
        requiredVuln: 'SIM-VULN-003',
        targetState: 'LATERAL',
        description: 'Attacker replays federated session token across settlement link to Quant-Fin Exchange Spire.',
      },
      {
        tick: 6,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-TEL-01',
        vector: 'CREDENTIAL_REPLAY',
        requiredVuln: 'SIM-VULN-003',
        targetState: 'LATERAL',
        description: 'Hijacked domain session queries Pulse-6G Spine Tower identity directory.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-B1',
        label: 'Inspect Vectra Corp Tower (BLD-CORP-01) to uncover the credential and privilege weaknesses',
        type: 'DISCOVER_BUILDING_VULNS',
        targetBuildingId: 'BLD-CORP-01',
      },
      {
        id: 'OBJ-B2',
        label: 'Preserve forensic evidence by ensuring Centralized Logging is active on BLD-CORP-01',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-CORP-01'],
        controlIds: ['logging'],
      },
      {
        id: 'OBJ-B3',
        label: 'Harden identity & privilege controls (deploy MFA, Account Shield, Least Privilege, or EDR on BLD-CORP-01 / BLD-FIN-01)',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-CORP-01', 'BLD-FIN-01'],
        controlIds: ['mfa', 'security_awareness', 'least_privilege', 'edr'],
      },
      {
        id: 'OBJ-B4',
        label: 'Revoke compromised sessions and restore all corporate and financial systems to HEALTHY',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
    ],
    debrief:
      'Stolen credentials bypass traditional perimeter firewalls because the traffic uses legitimate ports and protocols. Hardware MFA, Least-Privilege access control (PAM), EDR, and centralized audit logging allow defenders to detect token replay, contain privilege escalation, and revoke sessions cleanly.',
  },

  SCENARIO_C_RANSOMWARE: {
    id: 'SCENARIO_C_RANSOMWARE',
    code: 'MISSION-03',
    title: 'Scenario C — Ransomware Propagation Simulation',
    shortTitle: 'Ransomware Containment',
    difficulty: 'Intermediate',
    startingBudget: 620,
    recommendedSeed: 'LOCK-SIM-03',
    briefing:
      'A simulated locker event has been triggered on an internal workstation cluster in Vectra Corp Tower (BLD-CORP-01). It is scanning for unpatched file-sync daemons (SIM-VULN-005) and attempting to corrupt recovery snapshots in the Hyper-DC Core Vault (SIM-VULN-006).',
    threatDescription:
      'Simulated ransomware state transition propagating over SMB/storage links and targeting backup snapshot integrity.',
    hiddenFacts: [
      'NOTE: This scenario uses 100% synthetic state transitions (`AFFECTED` state) and never touches real files.',
      'Protecting BLD-DC-01 with Immutable Backup & Recovery (`backup_recovery`) or Least Privilege prevents snapshot corruption (`SIM-VULN-006`).',
    ],
    initialCompromise: {
      buildingId: 'BLD-CORP-01',
      state: 'AFFECTED',
      vulnId: 'SIM-VULN-005',
    },
    benignEvents: [
      {
        tick: 1,
        buildingId: 'BLD-PUB-01',
        targetId: 'BLD-GOV-01',
        description: 'Commuter rush-hour transit telemetry surge (Benign traffic).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-FIN-01',
        vector: 'UNPATCHED_FILE_SERVICE',
        requiredVuln: 'SIM-VULN-005',
        targetState: 'AFFECTED',
        description: 'Simulated locker propagates via unpatched SMB file-sync service to Quant-Fin Exchange Spire.',
      },
      {
        tick: 4,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-DC-01',
        vector: 'BACKUP_TAMPERING',
        requiredVuln: 'SIM-VULN-006',
        targetState: 'AFFECTED',
        tamperSnapshots: true,
        description: 'Propagation reaches Hyper-DC Core Vault and attempts to mark recovery snapshots unavailable.',
      },
      {
        tick: 6,
        sourceId: 'BLD-DC-01',
        targetId: 'BLD-HOS-01',
        vector: 'UNPATCHED_FILE_SERVICE',
        requiredVuln: 'SIM-VULN-005',
        targetState: 'AFFECTED',
        description: 'Infected storage tier propagates simulated disruption to Vita-Care Bio-Medical Center.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-C1',
        label: 'Protect Hyper-DC Core Vault snapshots (install Immutable Backups, Patch System, or Segmentation on BLD-DC-01)',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-DC-01'],
        controlIds: ['backup_recovery', 'patch_mgmt', 'segmentation', 'least_privilege'],
      },
      {
        id: 'OBJ-C2',
        label: 'Keep Vita-Care Bio-Medical Center (BLD-HOS-01) protected from ransomware disruption',
        type: 'KEEP_BUILDING_HEALTHY',
        targetBuildingId: 'BLD-HOS-01',
      },
      {
        id: 'OBJ-C3',
        label: 'Patch or segment vulnerable file services and restore all affected systems to HEALTHY',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
    ],
    debrief:
      'Effective ransomware defense depends on two pillars: stopping lateral SMB/file-sync propagation through patching and micro-segmentation, and guaranteeing immutable,离线/locked backup snapshots so affected nodes can be restored rapidly without paying ransom.',
  },

  SCENARIO_D_DATACENTER_EXPOSURE: {
    id: 'SCENARIO_D_DATACENTER_EXPOSURE',
    code: 'MISSION-04',
    title: 'Scenario D — Data Center Exposure',
    shortTitle: 'Data Center Exposure',
    difficulty: 'Advanced',
    startingBudget: 580,
    recommendedSeed: 'VAULT-EXPOSE-04',
    briefing:
      'A hasty deployment left an unauthenticated diagnostic endpoint exposed on the public ingress tier of Hyper-DC Core Vault (BLD-DC-01, SIM-VULN-007). External scanners routed through Civic Net Command Plaza are probing the exposure to reach clinical and financial backends.',
    threatDescription:
      'Exploitation of publicly exposed debug API (SIM-VULN-007) on BLD-DC-01 followed by lateral pivot into connected critical servers.',
    hiddenFacts: [
      'BLD-DC-01 has SIM-VULN-007 (Publicly Exposed Debug & Management API).',
      'Deploying Patch Management or Firewall on BLD-DC-01 closes the exposed debug route while keeping legitimate HTTPS service online.',
    ],
    initialCompromise: {
      buildingId: 'BLD-GOV-01',
      state: 'FOOTHOLD',
      vulnId: 'SIM-VULN-010',
    },
    benignEvents: [
      {
        tick: 2,
        buildingId: 'BLD-RES-01',
        targetId: 'BLD-PUB-01',
        description: 'Evening residential streaming and transit query load (Benign traffic).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-GOV-01',
        targetId: 'BLD-DC-01',
        vector: 'EXPOSED_DEBUG_API',
        requiredVuln: 'SIM-VULN-007',
        targetState: 'LATERAL',
        description: 'Probe exploits exposed diagnostic API on Hyper-DC Core Vault (SIM-VULN-007).',
      },
      {
        tick: 4,
        sourceId: 'BLD-DC-01',
        targetId: 'BLD-HOS-01',
        vector: 'UNPATCHED_FILE_SERVICE',
        requiredVuln: 'SIM-VULN-005',
        targetState: 'AFFECTED',
        description: 'Compromised data center pivots over clinical archive link to Vita-Care Bio-Medical Center.',
      },
      {
        tick: 6,
        sourceId: 'BLD-DC-01',
        targetId: 'BLD-FIN-01',
        vector: 'UNPATCHED_FILE_SERVICE',
        requiredVuln: 'SIM-VULN-005',
        targetState: 'AFFECTED',
        description: 'Data center breach spreads across settlement sync link to Quant-Fin Exchange Spire.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-D1',
        label: 'Inspect Hyper-DC Core Vault (BLD-DC-01) and discover SIM-VULN-007',
        type: 'DISCOVER_BUILDING_VULNS',
        targetBuildingId: 'BLD-DC-01',
      },
      {
        id: 'OBJ-D2',
        label: 'Remediate the exposure on BLD-DC-01 using Patch Management or Zone Perimeter Firewall',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-DC-01'],
        controlIds: ['patch_mgmt', 'firewall'],
      },
      {
        id: 'OBJ-D3',
        label: 'Enable telemetry monitoring (Centralized Logging or Net Monitor) on BLD-DC-01',
        type: 'INSTALL_CONTROL_ANY',
        targetBuildingIds: ['BLD-DC-01'],
        controlIds: ['logging', 'net_monitoring'],
      },
      {
        id: 'OBJ-D4',
        label: 'Restore all city systems to HEALTHY status',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
    ],
    debrief:
      'Exposed management and debugging APIs in cloud data centers are among the fastest paths to high-impact breaches. Combining automated patch management, perimeter firewalling, and deep telemetry closes the ingress gap without sacrificing public service uptime.',
  },

  SCENARIO_E_INDUSTRIAL_BOUNDARY: {
    id: 'SCENARIO_E_INDUSTRIAL_BOUNDARY',
    code: 'MISSION-05',
    title: 'Scenario E — Industrial Network Boundary',
    shortTitle: 'OT Boundary Defense',
    difficulty: 'Advanced',
    startingBudget: 600,
    recommendedSeed: 'OT-SHIELD-05',
    briefing:
      'An engineering workstation bridge between Vectra Corp Tower (BLD-CORP-01) and Cyber-Fab Robotics Plant (BLD-FAC-01) was left completely open (SIM-VULN-008). A compromise in the corporate zone threatens to cross into the Industrial & Critical Infrastructure Zone and disrupt Volt-01 Fusion Substation (BLD-POW-01).',
    threatDescription:
      'IT-to-OT lateral movement across permissive industrial gateway boundaries (SIM-VULN-008) targeting power and manufacturing.',
    hiddenFacts: [
      'The CORPORATE_USERS -> INDUSTRIAL_CRITICAL zone policy is an unsafe trust relationship (`legitimateDependency: false`).',
      'However, MANAGEMENT_ZONE -> INDUSTRIAL_CRITICAL is required for legitimate SCADA timing sync (`legitimateDependency: true`).',
    ],
    initialCompromise: {
      buildingId: 'BLD-CORP-01',
      state: 'FOOTHOLD',
      vulnId: 'SIM-VULN-004',
    },
    benignEvents: [
      {
        tick: 2,
        buildingId: 'BLD-TEL-01',
        targetId: 'BLD-POW-01',
        description: 'Precision IEEE-1588 synchrophasor clock update from Telecom Spine to Power Substation (Legitimate critical traffic).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-FAC-01',
        vector: 'PERMISSIVE_OT_BOUNDARY',
        requiredVuln: 'SIM-VULN-008',
        targetState: 'LATERAL',
        description: 'Attacker crosses unsegmented IT-to-OT engineering link into Cyber-Fab Robotics Plant.',
      },
      {
        tick: 4,
        sourceId: 'BLD-FAC-01',
        targetId: 'BLD-POW-01',
        vector: 'PERMISSIVE_OT_BOUNDARY',
        requiredVuln: 'SIM-VULN-008',
        targetState: 'AFFECTED',
        description: 'Compromised factory controller injects unauthorized Modbus/DNP3 commands into Volt-01 Fusion Substation.',
      },
      {
        tick: 6,
        sourceId: 'BLD-POW-01',
        targetId: 'BLD-HOS-01',
        vector: 'PERMISSIVE_OT_BOUNDARY',
        requiredVuln: 'SIM-VULN-008',
        targetState: 'AFFECTED',
        description: 'Substation instability cascades across priority microgrid feed to Vita-Care Bio-Medical Center.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-E1',
        label: 'Inspect Cyber-Fab Robotics Plant (BLD-FAC-01) or Volt-01 Substation (BLD-POW-01)',
        type: 'DISCOVER_BUILDING_VULNS',
        targetBuildingId: 'BLD-FAC-01',
      },
      {
        id: 'OBJ-E2',
        label: 'Enforce OT boundary protection (install Segmentation or Firewall on BLD-FAC-01 / BLD-POW-01, or disable CORPORATE_USERS->INDUSTRIAL_CRITICAL policy)',
        type: 'OT_BOUNDARY_SECURED',
      },
      {
        id: 'OBJ-E3',
        label: 'Keep Volt-01 Fusion Substation (BLD-POW-01) and Vita-Care Hospital (BLD-HOS-01) HEALTHY',
        type: 'KEEP_BUILDING_HEALTHY',
        targetBuildingId: 'BLD-POW-01',
      },
      {
        id: 'OBJ-E4',
        label: 'Restore all systems to HEALTHY while maintaining >= 85% legitimate service availability',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
    ],
    debrief:
      'Operational Technology (OT) and industrial control systems require strict Purdue-model zone conduits. Blocking direct corporate-to-OT bridges while preserving authenticated management telemetry protects power and manufacturing without blinding grid operators.',
  },

  SCENARIO_F_SMART_CITY_INCIDENT: {
    id: 'SCENARIO_F_SMART_CITY_INCIDENT',
    code: 'MISSION-06',
    title: 'Scenario F — Smart City Infrastructure Incident',
    shortTitle: 'City-Wide Incident',
    difficulty: 'Expert',
    startingBudget: 740,
    recommendedSeed: 'NEON-CRISIS-06',
    briefing:
      'A multi-vector incident has struck Neo-Veridia! Both the SkyLine Mag-Transit Hub (BLD-PUB-01) and Vectra Corp Tower (BLD-CORP-01) report active footholds. At the same time, routine financial batch traffic is spiking. Prioritize critical infrastructure (Power, Hospital, Data Center), distinguish real attack paths from benign traffic, apply surgical containment, and restore the city.',
    threatDescription:
      'Simultaneous public-service telemetry relay attack (SIM-VULN-010) and corporate-to-datacenter pivot (SIM-VULN-005 / SIM-VULN-008).',
    hiddenFacts: [
      'Two initial footholds exist: BLD-PUB-01 and BLD-CORP-01.',
      'Critical systems BLD-POW-01, BLD-HOS-01, and BLD-DC-01 are primary targets. Indiscriminate isolation of >2 buildings will breach the availability threshold.',
    ],
    initialCompromise: [
      {
        buildingId: 'BLD-PUB-01',
        state: 'FOOTHOLD',
        vulnId: 'SIM-VULN-010',
      },
      {
        buildingId: 'BLD-CORP-01',
        state: 'FOOTHOLD',
        vulnId: 'SIM-VULN-005',
      },
    ],
    benignEvents: [
      {
        tick: 1,
        buildingId: 'BLD-FIN-01',
        targetId: 'BLD-DC-01',
        description: 'Automated quarterly bond clearing surge between Quant-Fin and Hyper-DC (Benign traffic).',
      },
      {
        tick: 3,
        buildingId: 'BLD-RES-01',
        targetId: 'BLD-PUB-01',
        description: 'Public transit schedule query burst from Kowloon Hab-Block 01 (Benign traffic).',
      },
    ],
    propagationSteps: [
      {
        tick: 2,
        sourceId: 'BLD-PUB-01',
        targetId: 'BLD-GOV-01',
        vector: 'UNSIGNED_TELEMETRY_RELAY',
        requiredVuln: 'SIM-VULN-010',
        targetState: 'LATERAL',
        description: 'Unsigned transit telemetry relay spreads from BLD-PUB-01 to Civic Net Command Plaza.',
      },
      {
        tick: 3,
        sourceId: 'BLD-PUB-01',
        targetId: 'BLD-POW-01',
        vector: 'UNSIGNED_TELEMETRY_RELAY',
        requiredVuln: 'SIM-VULN-010',
        targetState: 'AFFECTED',
        description: 'Transit hub injects malformed load-shedding packet toward Volt-01 Fusion Substation.',
      },
      {
        tick: 4,
        sourceId: 'BLD-CORP-01',
        targetId: 'BLD-DC-01',
        vector: 'UNPATCHED_FILE_SERVICE',
        requiredVuln: 'SIM-VULN-005',
        targetState: 'LATERAL',
        description: 'Corporate foothold pivots over app backbone toward Hyper-DC Core Vault.',
      },
      {
        tick: 5,
        sourceId: 'BLD-GOV-01',
        targetId: 'BLD-HOS-01',
        vector: 'UNSIGNED_TELEMETRY_RELAY',
        requiredVuln: 'SIM-VULN-010',
        targetState: 'AFFECTED',
        description: 'Compromised municipal bus relays corrupted dispatch packets toward Vita-Care Hospital.',
      },
    ],
    objectives: [
      {
        id: 'OBJ-F1',
        label: 'Deploy defensive controls on at least 2 Critical Infrastructure buildings (BLD-POW-01, BLD-HOS-01, or BLD-DC-01)',
        type: 'PROTECT_CRITICAL_COUNT',
        count: 2,
      },
      {
        id: 'OBJ-F2',
        label: 'Block at least 1 attack propagation attempt using controls or zone policies',
        type: 'MIN_BLOCKED_ATTACKS',
        count: 1,
      },
      {
        id: 'OBJ-F3',
        label: 'Maintain >= 85% service availability (do not indiscriminately isolate healthy infrastructure)',
        type: 'MIN_AVAILABILITY',
        threshold: 85,
      },
      {
        id: 'OBJ-F4',
        label: 'Contain the multi-vector incident and restore all buildings to HEALTHY',
        type: 'ALL_SYSTEMS_HEALTHY',
      },
    ],
    debrief:
      'In a city-scale cyber incident, defenders cannot simply pull the plug on every network without causing worse societal disruption than the attack itself. Prioritizing high-criticality infrastructure, verifying telemetry before isolating, and applying surgical controls keeps essential city services online.',
  },
};

export const SCENARIO_LIST = Object.values(SCENARIOS);
