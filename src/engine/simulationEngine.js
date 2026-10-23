/**
 * Cyber City Sandbox — Core Deterministic Cybersecurity Simulation Engine
 * Pure JavaScript module (zero Three.js / DOM dependencies) so all rules,
 * graph traversals, attack preconditions, defensive controls, and scoring
 * can be unit- and integration-tested independently.
 */

import {
  DEFENSIVE_CONTROLS,
  VULNERABILITY_CATALOG,
  ANALYST_RANKS,
  ACHIEVEMENT_BADGES,
} from './catalog.js';
import { generateCity, computeBuildingSecurityScore } from './cityGenerator.js';
import { SCENARIOS } from './scenarios.js';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function formatSimTimestamp(tick) {
  const totalSeconds = tick * 15;
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `T+${mins}:${secs}`;
}

export function createSimulationState(options = {}) {
  const mode = options.mode || 'campaign'; // 'campaign' | 'sandbox'
  const scenarioId = options.scenarioId || 'SCENARIO_A_SMART_HOME';
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.SCENARIO_A_SMART_HOME;

  const seed = options.seed || scenario.recommendedSeed || 'CYBER-2088';
  const size = options.size || 'small';
  const density = options.density || 'dense';
  const difficulty = options.difficulty || 'normal';
  const securityMaturity = options.securityMaturity || 'mixed';

  const city = generateCity({
    seed,
    size,
    density,
    difficulty,
    securityMaturity,
  });

  const budget =
    typeof options.budget === 'number'
      ? options.budget
      : mode === 'sandbox'
      ? 1200
      : scenario.startingBudget;

  const state = {
    schemaVersion: 1,
    mode,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    seed: city.seed,
    size: city.size,
    density: city.density,
    difficulty: city.difficulty,
    securityMaturity: city.securityMaturity,
    tick: 0,
    running: false,
    speed: 1, // 1 | 2 | 4
    budget,
    initialBudget: budget,
    spentBudget: 0,
    buildings: city.buildings,
    connections: city.connections,
    zonePolicies: city.zonePolicies,
    totalLogicalSystems: city.totalLogicalSystems,
    events: [],
    blockedAttempts: 0,
    compromiseEventsCount: 0,
    inspectionsCount: 0,
    restorationsCount: 0,
    criticalEverCompromised: false,
    activePropagationHighlight: null,
    missionStatus: 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
    objectives: [],
    scoreBreakdown: null,
    progression: options.progression || {
      xp: 0,
      rank: 1,
      rankTitle: ANALYST_RANKS[0].title,
      completedMissions: [],
      unlockedBadges: [],
    },
  };

  // Apply initial scenario compromise state
  applyScenarioInitialState(state, scenario);
  refreshAllDerivedState(state);

  return state;
}

function applyScenarioInitialState(state, scenario) {
  if (!scenario) return;

  const initialList = Array.isArray(scenario.initialCompromise)
    ? scenario.initialCompromise
    : scenario.initialCompromise
    ? [scenario.initialCompromise]
    : [];

  for (const init of initialList) {
    const b = state.buildings.find((item) => item.id === init.buildingId);
    if (!b) continue;

    // Ensure the required vulnerability exists and is unmitigated on the starting node
    let vuln = b.vulnerabilities.find((v) => v.catalogId === init.vulnId);
    if (!vuln && VULNERABILITY_CATALOG[init.vulnId]) {
      const spec = VULNERABILITY_CATALOG[init.vulnId];
      vuln = {
        id: `${b.id}:${spec.id}`,
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
        discovered: false,
        mitigated: false,
        status: 'UNKNOWN',
      };
      b.vulnerabilities.push(vuln);
    } else if (vuln) {
      vuln.mitigated = false;
      vuln.status = vuln.discovered ? 'DISCOVERED' : 'UNKNOWN';
    }

    b.compromiseState = init.state || 'FOOTHOLD';
    b.healthStatus = init.state === 'AFFECTED' ? 'AFFECTED' : 'COMPROMISED';
    b.detectionState = 'ALERTED';

    for (const svc of b.services) {
      svc.status = init.state === 'AFFECTED' ? 'DEGRADED' : 'AT_RISK';
    }

    appendEvent(state, {
      type: 'SUSPICIOUS_ACTIVITY',
      severity: init.state === 'AFFECTED' ? 'CRITICAL' : 'HIGH',
      sourceId: b.id,
      targetId: null,
      description: `Initial telemetry alert on ${b.name} (${b.id}): anomalous ${init.state} activity detected.`,
    });
  }

  // Ensure propagation targets have their required vulnerabilities present
  for (const step of scenario.propagationSteps || []) {
    const targetB = state.buildings.find((item) => item.id === step.targetId);
    if (!targetB || !step.requiredVuln) continue;
    const hasVuln = targetB.vulnerabilities.some((v) => v.catalogId === step.requiredVuln);
    if (!hasVuln && VULNERABILITY_CATALOG[step.requiredVuln]) {
      const spec = VULNERABILITY_CATALOG[step.requiredVuln];
      targetB.vulnerabilities.push({
        id: `${targetB.id}:${spec.id}`,
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
        discovered: false,
        mitigated: false,
        status: 'UNKNOWN',
      });
    }
  }
}

export function appendEvent(state, payload) {
  const evt = {
    id: `EVT-${String(state.events.length + 1).padStart(4, '0')}`,
    tick: state.tick,
    timestamp: formatSimTimestamp(state.tick),
    type: payload.type || 'INFO',
    severity: payload.severity || 'INFO',
    sourceId: payload.sourceId || null,
    targetId: payload.targetId || null,
    scenarioId: state.scenarioId,
    relatedNodeIds: [payload.sourceId, payload.targetId].filter(Boolean),
    description: payload.description || '',
    details: payload.details || null,
  };
  state.events.unshift(evt);
  if (state.events.length > 250) {
    state.events.length = 250;
  }
  return evt;
}

export function inspectBuilding(currentState, buildingId) {
  const state = deepClone(currentState);
  const b = state.buildings.find((item) => item.id === buildingId);
  if (!b) return { state, success: false, reason: 'Building not found.' };

  const scanCost = state.budget >= 20 ? 20 : 0;
  state.budget -= scanCost;
  state.spentBudget += scanCost;
  state.inspectionsCount += 1;

  let newlyDiscovered = 0;
  for (const v of b.vulnerabilities) {
    if (!v.discovered) {
      v.discovered = true;
      if (!v.mitigated) {
        v.status = 'DISCOVERED';
      }
      newlyDiscovered += 1;
    }
  }

  if (b.detectionState === 'UNMONITORED') {
    b.detectionState = 'INVESTIGATED';
  }

  appendEvent(state, {
    type: 'ASSET_DISCOVERED',
    severity: 'INFO',
    sourceId: b.id,
    targetId: null,
    description: `Completed security inspection of ${b.name} (${b.id}). Mapped ${b.services.length} logical services.`,
  });

  if (newlyDiscovered > 0) {
    for (const v of b.vulnerabilities) {
      if (v.status === 'DISCOVERED') {
        appendEvent(state, {
          type: 'VULNERABILITY_FOUND',
          severity: v.severity,
          sourceId: b.id,
          targetId: null,
          description: `Discovered ${v.catalogId} (${v.name}) on ${b.name} [${v.severity}].`,
        });
      }
    }
    awardProgress(state, 20, 'FIRST_INSPECTION');
  }

  refreshAllDerivedState(state);
  return { state, success: true, newlyDiscovered };
}

export function installControl(currentState, buildingId, controlId) {
  const state = deepClone(currentState);
  const b = state.buildings.find((item) => item.id === buildingId);
  const ctrl = DEFENSIVE_CONTROLS[controlId];

  if (!b || !ctrl) {
    return { state, success: false, reason: 'Invalid building or defensive control.' };
  }
  if (b.installedControls.includes(controlId)) {
    return { state, success: false, reason: `${ctrl.name} is already installed on ${b.name}.` };
  }
  if (
    ctrl.eligibleArchetypes !== 'ALL' &&
    !ctrl.eligibleArchetypes.includes(b.archetype)
  ) {
    return {
      state,
      success: false,
      reason: `${ctrl.name} is not compatible with ${b.archetypeName} systems.`,
    };
  }
  for (const depId of ctrl.dependencies || []) {
    if (!b.installedControls.includes(depId)) {
      const depSpec = DEFENSIVE_CONTROLS[depId];
      return {
        state,
        success: false,
        reason: `${ctrl.name} requires ${depSpec ? depSpec.name : depId} to be installed first.`,
      };
    }
  }
  if (state.budget < ctrl.cost) {
    return {
      state,
      success: false,
      reason: `Insufficient budget (${state.budget} available, ${ctrl.cost} required).`,
    };
  }

  state.budget -= ctrl.cost;
  state.spentBudget += ctrl.cost;
  b.installedControls.push(controlId);

  if (['logging', 'edr', 'net_monitoring', 'ids', 'anomaly_detection'].includes(controlId)) {
    if (b.detectionState === 'UNMONITORED') {
      b.detectionState = 'MONITORED';
    }
  }

  if (controlId === 'backup_recovery') {
    b.snapshotClean = true;
  }

  // Mitigate covered vulnerabilities
  const mitigatedNow = [];
  for (const v of b.vulnerabilities) {
    if (ctrl.mitigatesVulns.includes(v.catalogId) && !v.mitigated) {
      v.discovered = true;
      v.mitigated = true;
      v.status = 'MITIGATED';
      mitigatedNow.push(v.catalogId);
    }
  }

  appendEvent(state, {
    type: 'CONTROL_INSTALLED',
    severity: 'INFO',
    sourceId: b.id,
    targetId: null,
    description: `Deployed ${ctrl.name} on ${b.name} (${b.id})${
      mitigatedNow.length ? ` — mitigated ${mitigatedNow.join(', ')}` : ''
    }.`,
  });

  awardProgress(state, 15);
  refreshAllDerivedState(state);
  return { state, success: true, mitigatedNow };
}

export function removeControl(currentState, buildingId, controlId) {
  const state = deepClone(currentState);
  const b = state.buildings.find((item) => item.id === buildingId);
  const ctrl = DEFENSIVE_CONTROLS[controlId];
  if (!b || !ctrl || !b.installedControls.includes(controlId)) {
    return { state, success: false, reason: 'Control not installed on this building.' };
  }

  // Prevent removing if another installed control depends on it
  const dependent = b.installedControls.find((otherId) =>
    (DEFENSIVE_CONTROLS[otherId]?.dependencies || []).includes(controlId)
  );
  if (dependent) {
    return {
      state,
      success: false,
      reason: `Cannot remove ${ctrl.name} while ${DEFENSIVE_CONTROLS[dependent].name} depends on it.`,
    };
  }

  b.installedControls = b.installedControls.filter((id) => id !== controlId);
  const refund = Math.floor(ctrl.cost * 0.5);
  state.budget += refund;
  state.spentBudget = Math.max(0, state.spentBudget - refund);

  // Re-evaluate vulnerabilities on this building
  for (const v of b.vulnerabilities) {
    const stillMitigated = b.installedControls.some((cId) =>
      DEFENSIVE_CONTROLS[cId]?.mitigatesVulns.includes(v.catalogId)
    );
    if (!stillMitigated) {
      v.mitigated = false;
      v.status = v.discovered ? 'DISCOVERED' : 'UNKNOWN';
    }
  }

  appendEvent(state, {
    type: 'CONTROL_REMOVED',
    severity: 'LOW',
    sourceId: b.id,
    targetId: null,
    description: `Removed ${ctrl.name} from ${b.name} (refunded ${refund} credits).`,
  });

  refreshAllDerivedState(state);
  return { state, success: true };
}

export function toggleBuildingIsolation(currentState, buildingId) {
  const state = deepClone(currentState);
  const b = state.buildings.find((item) => item.id === buildingId);
  if (!b) return { state, success: false, reason: 'Building not found.' };

  b.isolated = !b.isolated;
  for (const svc of b.services) {
    svc.status = b.isolated
      ? 'ISOLATED'
      : b.compromiseState === 'NONE'
      ? 'ONLINE'
      : 'AT_RISK';
  }

  appendEvent(state, {
    type: b.isolated ? 'SYSTEM_ISOLATED' : 'SYSTEM_RECONNECTED',
    severity: b.isolated ? 'MEDIUM' : 'INFO',
    sourceId: b.id,
    targetId: null,
    description: b.isolated
      ? `Emergency network quarantine enabled on ${b.name} (${b.id}). All connections suspended.`
      : `Lifted network quarantine on ${b.name} (${b.id}).`,
  });

  refreshAllDerivedState(state);
  return { state, success: true, isolated: b.isolated };
}

export function updateZonePolicy(currentState, policyId, allowed) {
  const state = deepClone(currentState);
  const policy = state.zonePolicies[policyId];
  if (!policy) {
    return { state, success: false, reason: 'Zone policy not found.' };
  }

  policy.allowed = Boolean(allowed);

  appendEvent(state, {
    type: 'POLICY_UPDATED',
    severity: policy.allowed ? 'INFO' : 'MEDIUM',
    sourceId: null,
    targetId: null,
    description: `Zone Segmentation Policy [${policy.id}] set to ${
      policy.allowed ? 'PERMIT' : 'DENY'
    }.`,
  });

  refreshAllDerivedState(state);
  return { state, success: true };
}

export function restoreBuilding(currentState, buildingId) {
  const state = deepClone(currentState);
  const b = state.buildings.find((item) => item.id === buildingId);
  if (!b) return { state, success: false, reason: 'Building not found.' };

  if (b.compromiseState === 'NONE') {
    return { state, success: false, reason: `${b.name} is already healthy.` };
  }

  // Check if snapshots were tampered with (Scenario C ransomware mechanic)
  const dcVault = state.buildings.find((item) => item.id === 'BLD-DC-01');
  const hasImmutableBackup =
    b.installedControls.includes('backup_recovery') ||
    (dcVault && dcVault.installedControls.includes('backup_recovery'));

  if (!b.snapshotClean && !hasImmutableBackup) {
    appendEvent(state, {
      type: 'RESTORE_FAILED',
      severity: 'HIGH',
      sourceId: b.id,
      targetId: null,
      description: `Cannot restore ${b.name}: recovery snapshots were corrupted! Install Immutable Backups (backup_recovery) first.`,
    });
    return {
      state,
      success: false,
      reason:
        'Clean recovery snapshots are unavailable. Install Immutable Backup & Snapshot Vault (backup_recovery) on this building or the Data Center first.',
    };
  }

  // Require at least one defensive control, mitigated vulnerability, or isolation so restoration is meaningful
  const hasAnyDefense =
    b.installedControls.length > 0 ||
    b.isolated ||
    b.vulnerabilities.some((v) => v.mitigated);

  if (!hasAnyDefense) {
    return {
      state,
      success: false,
      reason:
        'Deploy at least one remediating security control (or isolate the host) before restoring so the system is not immediately re-compromised.',
    };
  }

  b.compromiseState = 'NONE';
  b.snapshotClean = true;
  b.isolated = false;
  b.healthStatus = 'HEALTHY';
  b.detectionState = 'MONITORED';
  for (const svc of b.services) {
    svc.status = 'ONLINE';
  }
  state.restorationsCount += 1;

  appendEvent(state, {
    type: 'SERVICE_RESTORED',
    severity: 'INFO',
    sourceId: b.id,
    targetId: null,
    description: `Restored ${b.name} (${b.id}) from verified clean snapshot. All ${b.services.length} logical services online.`,
  });

  awardProgress(state, 30, 'SNAPSHOT_SAVIOR');
  refreshAllDerivedState(state);
  return { state, success: true };
}

/**
 * Evaluates whether a simulated attack transition from sourceId -> targetId
 * using `step` is permitted or intercepted by current topology & controls.
 */
export function evaluatePropagationPreconditions(state, step) {
  const source = state.buildings.find((b) => b.id === step.sourceId);
  const target = state.buildings.find((b) => b.id === step.targetId);

  if (!source || !target) {
    return { allowed: false, reason: 'Invalid source or destination node.', blockedBy: 'TOPOLOGY' };
  }

  // 1. Source must actually be compromised
  if (source.compromiseState === 'NONE') {
    return {
      allowed: false,
      silentSkip: true,
      reason: `Source system ${source.name} is clean; attack stage cannot launch.`,
      blockedBy: 'SOURCE_CLEAN',
    };
  }

  // 2. Quarantine / isolation check
  if (source.isolated) {
    return {
      allowed: false,
      reason: `Outbound propagation halted: ${source.name} is quarantined/isolated.`,
      blockedBy: 'ISOLATION',
    };
  }
  if (target.isolated) {
    return {
      allowed: false,
      reason: `Inbound propagation halted: ${target.name} is quarantined/isolated.`,
      blockedBy: 'ISOLATION',
    };
  }

  // 3. If cross-building, verify graph edge & zone policy
  let edge = null;
  if (source.id !== target.id) {
    edge = state.connections.find(
      (c) =>
        (c.source === source.id && c.target === target.id) ||
        (c.source === target.id && c.target === source.id)
    );
    if (!edge) {
      return {
        allowed: false,
        reason: `No valid network route exists between ${source.name} and ${target.name}.`,
        blockedBy: 'NO_ROUTE',
      };
    }

    const fwdKey = `${source.networkSegmentId}->${target.networkSegmentId}`;
    const revKey = `${target.networkSegmentId}->${source.networkSegmentId}`;
    const policy = state.zonePolicies[fwdKey] || state.zonePolicies[revKey];
    if (policy && !policy.allowed) {
      return {
        allowed: false,
        reason: `Zone segmentation policy [${policy.id}] denied traffic from ${source.name} to ${target.name}.`,
        blockedBy: `ZONE_POLICY:${policy.id}`,
        edgeId: edge.id,
      };
    }
  }

  // 4. Check outbound containment controls on source (Segmentation / Firewall / Least Privilege)
  if (
    source.id !== target.id &&
    (source.installedControls.includes('segmentation') ||
      (source.installedControls.includes('firewall') &&
        source.networkSegmentId !== target.networkSegmentId)) &&
    [
      'LATERAL_IOT_BRIDGE',
      'IOT_GATEWAY_AUTH',
      'UNPATCHED_FILE_SERVICE',
      'PERMISSIVE_OT_BOUNDARY',
      'UNSIGNED_TELEMETRY_RELAY',
    ].includes(step.vector)
  ) {
    const ctrlUsed = source.installedControls.includes('segmentation')
      ? 'segmentation'
      : 'firewall';
    return {
      allowed: false,
      reason: `${DEFENSIVE_CONTROLS[ctrlUsed].name} on ${source.name} blocked outbound ${step.vector} propagation to ${target.name}.`,
      blockedBy: ctrlUsed,
      edgeId: edge?.id,
    };
  }

  // 5. Check defensive controls on target that block the vector
  for (const ctrlId of target.installedControls) {
    const spec = DEFENSIVE_CONTROLS[ctrlId];
    if (spec && spec.blocksVectors.includes(step.vector)) {
      return {
        allowed: false,
        reason: `${spec.name} on ${target.name} intercepted and blocked ${step.vector} from ${source.name}.`,
        blockedBy: ctrlId,
        edgeId: edge?.id,
      };
    }
  }

  // 6. Check if required vulnerability on target is already mitigated
  if (step.requiredVuln) {
    const targetVuln = target.vulnerabilities.find((v) => v.catalogId === step.requiredVuln);
    if (!targetVuln || targetVuln.mitigated || targetVuln.status === 'MITIGATED') {
      return {
        allowed: false,
        reason: `Target vulnerability ${step.requiredVuln} on ${target.name} is mitigated; exploit payload failed.`,
        blockedBy: `MITIGATED:${step.requiredVuln}`,
        edgeId: edge?.id,
      };
    }
  }

  return {
    allowed: true,
    reason: `Preconditions satisfied (${step.vector} via ${step.requiredVuln || 'trust link'}).`,
    edgeId: edge?.id || null,
  };
}

export function stepSimulation(currentState, ticks = 1) {
  let state = deepClone(currentState);
  const scenario = SCENARIOS[state.scenarioId] || SCENARIOS.SCENARIO_A_SMART_HOME;

  for (let i = 0; i < ticks; i++) {
    state.tick += 1;
    const currentTick = state.tick;

    // Reset transient connection traffic states to NORMAL unless isolated/policy-blocked
    for (const conn of state.connections) {
      conn.trafficState = conn.permitted ? 'NORMAL' : 'BLOCKED';
    }

    // 1. Process benign background traffic events so player must distinguish normal spikes from attacks
    const benignNow = (scenario.benignEvents || []).filter((e) => e.tick === currentTick);
    for (const ben of benignNow) {
      const edge = state.connections.find(
        (c) =>
          (c.source === ben.buildingId && c.target === ben.targetId) ||
          (c.source === ben.targetId && c.target === ben.buildingId)
      );
      if (edge && edge.permitted) {
        edge.trafficState = 'HIGH';
      }
      appendEvent(state, {
        type: 'CONNECTION_ATTEMPTED',
        severity: 'INFO',
        sourceId: ben.buildingId,
        targetId: ben.targetId,
        description: ben.description,
      });
    }

    // 2. Process deterministic scenario propagation steps scheduled for this tick
    const stepsNow = (scenario.propagationSteps || []).filter((s) => s.tick === currentTick);

    // In sandbox mode or after tick 6, if an uncontained foothold exists, evaluate dynamic neighbor propagation
    if (stepsNow.length === 0 && currentTick > 6 && currentTick % 3 === 0) {
      const dynamicStep = findDynamicPropagationCandidate(state);
      if (dynamicStep) stepsNow.push(dynamicStep);
    }

    for (const step of stepsNow) {
      const evalResult = evaluatePropagationPreconditions(state, step);
      if (evalResult.silentSkip) continue;

      const sourceB = state.buildings.find((b) => b.id === step.sourceId);
      const targetB = state.buildings.find((b) => b.id === step.targetId);
      const edge = state.connections.find((c) => c.id === evalResult.edgeId);

      if (!evalResult.allowed) {
        state.blockedAttempts += 1;
        if (edge) {
          edge.trafficState = 'BLOCKED';
          edge.blockedReason = evalResult.reason;
        }
        state.activePropagationHighlight = {
          tick: currentTick,
          sourceId: step.sourceId,
          targetId: step.targetId,
          edgeId: evalResult.edgeId || null,
          vector: step.vector,
          requiredVuln: step.requiredVuln,
          outcome: 'BLOCKED',
          blockedBy: evalResult.blockedBy,
          explanation: evalResult.reason,
        };

        appendEvent(state, {
          type: 'PROPAGATION_BLOCKED',
          severity: 'INFO',
          sourceId: step.sourceId,
          targetId: step.targetId,
          description: evalResult.reason,
          details: state.activePropagationHighlight,
        });

        awardProgress(state, 25, 'ZERO_SPREAD');
      } else {
        // Attack transition succeeds!
        state.compromiseEventsCount += 1;
        if (targetB) {
          targetB.compromiseState = step.targetState || 'LATERAL';
          targetB.healthStatus =
            step.targetState === 'AFFECTED' ? 'AFFECTED' : 'COMPROMISED';
          targetB.detectionState = 'ALERTED';

          if (targetB.criticality === 'CRITICAL') {
            state.criticalEverCompromised = true;
          }

          if (step.tamperSnapshots) {
            const hasBackupCtrl =
              targetB.installedControls.includes('backup_recovery') ||
              targetB.installedControls.includes('least_privilege');
            if (!hasBackupCtrl) {
              targetB.snapshotClean = false;
            }
          }

          // Mark exploited vulnerability as discovered now that it triggered
          const exploitedVuln = targetB.vulnerabilities.find(
            (v) => v.catalogId === step.requiredVuln
          );
          if (exploitedVuln) {
            exploitedVuln.discovered = true;
            if (!exploitedVuln.mitigated) {
              exploitedVuln.status = 'DISCOVERED';
            }
          }

          for (const svc of targetB.services) {
            svc.status = step.targetState === 'AFFECTED' ? 'OFFLINE' : 'AT_RISK';
          }
        }

        if (edge) {
          edge.trafficState = 'SUSPICIOUS';
        }

        state.activePropagationHighlight = {
          tick: currentTick,
          sourceId: step.sourceId,
          targetId: step.targetId,
          edgeId: evalResult.edgeId || null,
          vector: step.vector,
          requiredVuln: step.requiredVuln,
          outcome: 'ALLOWED',
          blockedBy: null,
          explanation: `${step.description} (${evalResult.reason})`,
        };

        appendEvent(state, {
          type: 'COMPROMISE_SIMULATED',
          severity: step.targetState === 'AFFECTED' ? 'CRITICAL' : 'HIGH',
          sourceId: step.sourceId,
          targetId: step.targetId,
          description: step.description,
          details: state.activePropagationHighlight,
        });

        // If monitoring or logging is active on source or target, emit detailed detection alert
        const hasTelemetry =
          sourceB?.installedControls.some((c) =>
            ['logging', 'edr', 'net_monitoring', 'ids', 'anomaly_detection'].includes(c)
          ) ||
          targetB?.installedControls.some((c) =>
            ['logging', 'edr', 'net_monitoring', 'ids', 'anomaly_detection'].includes(c)
          );

        if (hasTelemetry) {
          appendEvent(state, {
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            sourceId: step.sourceId,
            targetId: step.targetId,
            description: `SIEM/Telemetry Correlation: Vector ${step.vector} exploited ${step.requiredVuln} on ${targetB?.name}.`,
          });
        }
      }
    }
  }

  refreshAllDerivedState(state);
  return state;
}

function findDynamicPropagationCandidate(state) {
  const compromisedSources = state.buildings.filter(
    (b) => b.compromiseState !== 'NONE' && !b.isolated
  );
  for (const src of compromisedSources) {
    for (const neighborId of src.connectedBuildingIds) {
      const dst = state.buildings.find((b) => b.id === neighborId);
      if (!dst || dst.compromiseState !== 'NONE' || dst.isolated) continue;
      const openVuln = dst.vulnerabilities.find((v) => !v.mitigated);
      if (openVuln) {
        return {
          tick: state.tick,
          sourceId: src.id,
          targetId: dst.id,
          vector: openVuln.vector,
          requiredVuln: openVuln.catalogId,
          targetState: 'LATERAL',
          description: `Lateral movement from ${src.name} to ${dst.name} exploiting ${openVuln.catalogId}.`,
        };
      }
    }
  }
  return null;
}

export function calculateMetrics(state) {
  const totalBuildings = state.buildings.length;
  const totalLogicalSystems = state.buildings.reduce(
    (acc, b) => acc + b.services.length,
    0
  );

  let totalVulns = 0;
  let discoveredVulns = 0;
  let mitigatedVulns = 0;
  let affectedBuildings = 0;
  let isolatedBuildings = 0;
  let criticalBuildingsTotal = 0;
  let criticalBuildingsProtected = 0;
  let buildingsWithControls = 0;

  for (const b of state.buildings) {
    if (b.installedControls.length > 0) buildingsWithControls += 1;
    if (b.isolated) isolatedBuildings += 1;
    if (b.compromiseState !== 'NONE') affectedBuildings += 1;

    if (b.criticality === 'CRITICAL') {
      criticalBuildingsTotal += 1;
      if (b.compromiseState === 'NONE' && !b.isolated) {
        criticalBuildingsProtected += 1;
      }
    }

    for (const v of b.vulnerabilities) {
      totalVulns += 1;
      if (v.discovered || v.mitigated) discoveredVulns += 1;
      if (v.mitigated || v.status === 'MITIGATED') mitigatedVulns += 1;
    }
  }

  // Calculate service availability %
  let availabilityPenalty = 0;
  for (const b of state.buildings) {
    if (b.isolated) {
      availabilityPenalty +=
        b.criticality === 'CRITICAL'
          ? 14
          : b.criticality === 'HIGH'
          ? 9
          : b.criticality === 'MEDIUM'
          ? 6
          : 4;
    } else if (b.compromiseState === 'AFFECTED') {
      availabilityPenalty += 12;
    } else if (b.compromiseState !== 'NONE') {
      availabilityPenalty += 5;
    }
  }

  for (const policy of Object.values(state.zonePolicies)) {
    if (!policy.allowed && policy.legitimateDependency) {
      availabilityPenalty += 8;
    }
  }

  const serviceAvailability = Math.max(0, Math.min(100, 100 - availabilityPenalty));
  const avgSecurityScore = Math.round(
    state.buildings.reduce((sum, b) => sum + b.securityScore, 0) /
      Math.max(1, totalBuildings)
  );
  const controlCoverage = Math.round(
    (buildingsWithControls / Math.max(1, totalBuildings)) * 100
  );

  return {
    totalAssets: totalBuildings,
    totalLogicalSystems,
    totalVulnerabilities: totalVulns,
    discoveredVulnerabilities: discoveredVulns,
    mitigatedVulnerabilities: mitigatedVulns,
    affectedSystems: affectedBuildings,
    isolatedSystems: isolatedBuildings,
    protectedCriticalSystems: criticalBuildingsProtected,
    totalCriticalSystems: criticalBuildingsTotal,
    activeIncidents: affectedBuildings,
    blockedPropagationAttempts: state.blockedAttempts,
    controlCoverage,
    serviceAvailability,
    citySecurityScore: avgSecurityScore,
  };
}

export function evaluateObjectives(state) {
  const scenario = SCENARIOS[state.scenarioId] || SCENARIOS.SCENARIO_A_SMART_HOME;
  const metrics = calculateMetrics(state);

  const evaluated = (scenario.objectives || []).map((obj) => {
    let completed = false;

    switch (obj.type) {
      case 'DISCOVER_BUILDING_VULNS': {
        const b = state.buildings.find((item) => item.id === obj.targetBuildingId);
        completed = Boolean(
          b && b.vulnerabilities.length > 0 && b.vulnerabilities.every((v) => v.discovered)
        );
        break;
      }
      case 'INSTALL_CONTROL_ANY': {
        completed = state.buildings
          .filter((b) => obj.targetBuildingIds.includes(b.id))
          .some((b) => b.installedControls.some((c) => obj.controlIds.includes(c)));
        break;
      }
      case 'ALL_SYSTEMS_HEALTHY': {
        completed = state.buildings.every(
          (b) => b.compromiseState === 'NONE' && !b.isolated
        );
        break;
      }
      case 'MIN_AVAILABILITY': {
        completed = metrics.serviceAvailability >= (obj.threshold || 85);
        break;
      }
      case 'KEEP_BUILDING_HEALTHY': {
        const b = state.buildings.find((item) => item.id === obj.targetBuildingId);
        completed = Boolean(b && b.compromiseState === 'NONE');
        break;
      }
      case 'OT_BOUNDARY_SECURED': {
        const policyBlocked =
          state.zonePolicies['CORPORATE_USERS->INDUSTRIAL_CRITICAL']?.allowed === false;
        const ctrlInstalled = state.buildings
          .filter((b) => ['BLD-FAC-01', 'BLD-POW-01'].includes(b.id))
          .some((b) =>
            b.installedControls.some((c) => ['segmentation', 'firewall'].includes(c))
          );
        completed = policyBlocked || ctrlInstalled;
        break;
      }
      case 'PROTECT_CRITICAL_COUNT': {
        const count = state.buildings.filter(
          (b) =>
            ['BLD-POW-01', 'BLD-HOS-01', 'BLD-DC-01'].includes(b.id) &&
            b.installedControls.length > 0
        ).length;
        completed = count >= (obj.count || 2);
        break;
      }
      case 'MIN_BLOCKED_ATTACKS': {
        completed = state.blockedAttempts >= (obj.count || 1);
        break;
      }
      default:
        completed = false;
    }

    return {
      ...obj,
      completed,
    };
  });

  return evaluated;
}

export function calculateScoreBreakdown(state) {
  const metrics = calculateMetrics(state);
  const discoveryRatio =
    metrics.totalVulnerabilities > 0
      ? metrics.discoveredVulnerabilities / metrics.totalVulnerabilities
      : 1;
  const mitigationRatio =
    metrics.totalVulnerabilities > 0
      ? metrics.mitigatedVulnerabilities / metrics.totalVulnerabilities
      : 1;

  const investigationQuality = Math.min(
    100,
    Math.round(45 + discoveryRatio * 35 + Math.min(35, state.inspectionsCount * 20))
  );

  const threatContainment = Math.max(
    0,
    Math.min(
      100,
      100 -
        metrics.affectedSystems * 22 +
        Math.min(30, state.blockedAttempts * 15)
    )
  );

  const criticalProtection =
    metrics.totalCriticalSystems > 0
      ? Math.round(
          (metrics.protectedCriticalSystems / metrics.totalCriticalSystems) * 100
        )
      : 100;

  const appropriateControls = Math.min(
    100,
    Math.round(50 + mitigationRatio * 35 + metrics.controlCoverage * 0.35)
  );

  const serviceAvailability = metrics.serviceAvailability;

  const resourceEfficiency =
    state.initialBudget > 0
      ? Math.max(
          25,
          Math.min(
            100,
            Math.round(100 - (state.spentBudget / (state.initialBudget * 1.4)) * 45)
          )
        )
      : 85;

  const loggingInstalledCount = state.buildings.filter((b) =>
    b.installedControls.includes('logging')
  ).length;
  const evidencePreservation = Math.min(100, 40 + loggingInstalledCount * 20);

  const totalScore = Math.round(
    investigationQuality * 0.15 +
      threatContainment * 0.2 +
      criticalProtection * 0.2 +
      appropriateControls * 0.15 +
      serviceAvailability * 0.15 +
      resourceEfficiency * 0.05 +
      evidencePreservation * 0.1
  );

  return {
    totalScore,
    grade:
      totalScore >= 90
        ? 'S'
        : totalScore >= 80
        ? 'A'
        : totalScore >= 70
        ? 'B'
        : totalScore >= 60
        ? 'C'
        : 'D',
    components: [
      {
        key: 'investigationQuality',
        label: 'Investigation Quality',
        score: investigationQuality,
        explanation: `${metrics.discoveredVulnerabilities}/${metrics.totalVulnerabilities} weaknesses discovered across ${state.inspectionsCount} inspections.`,
      },
      {
        key: 'threatContainment',
        label: 'Threat Containment',
        score: threatContainment,
        explanation: `${state.blockedAttempts} propagation attempts intercepted; ${metrics.affectedSystems} systems currently compromised.`,
      },
      {
        key: 'criticalProtection',
        label: 'Critical Infrastructure Protection',
        score: criticalProtection,
        explanation: `${metrics.protectedCriticalSystems}/${metrics.totalCriticalSystems} CRITICAL infrastructure nodes fortified and healthy.`,
      },
      {
        key: 'appropriateControls',
        label: 'Appropriate Security Controls',
        score: appropriateControls,
        explanation: `${metrics.mitigatedVulnerabilities}/${metrics.totalVulnerabilities} vulnerabilities mitigated (${metrics.controlCoverage}% building coverage).`,
      },
      {
        key: 'serviceAvailability',
        label: 'Service Availability',
        score: serviceAvailability,
        explanation: `${serviceAvailability}% uptime maintained (${metrics.isolatedSystems} quarantined nodes).`,
      },
      {
        key: 'resourceEfficiency',
        label: 'Resource Efficiency',
        score: resourceEfficiency,
        explanation: `${state.spentBudget} credits invested (${state.budget} remaining).`,
      },
      {
        key: 'evidencePreservation',
        label: 'Evidence Preservation',
        score: evidencePreservation,
        explanation: `${loggingInstalledCount} nodes streaming centralized SIEM audit logs.`,
      },
    ],
  };
}

function awardProgress(state, xpAmount, badgeId = null) {
  if (!state.progression) return;
  state.progression.xp += xpAmount;

  let currentRank = ANALYST_RANKS[0];
  for (const r of ANALYST_RANKS) {
    if (state.progression.xp >= r.minXp) {
      currentRank = r;
    }
  }
  state.progression.rank = currentRank.rank;
  state.progression.rankTitle = currentRank.title;

  if (badgeId && !state.progression.unlockedBadges.includes(badgeId)) {
    const exists = ACHIEVEMENT_BADGES.some((b) => b.id === badgeId);
    if (exists) {
      state.progression.unlockedBadges.push(badgeId);
    }
  }
}

export function refreshAllDerivedState(state) {
  // 1. Update each building's healthStatus and securityScore
  for (const b of state.buildings) {
    if (b.isolated) {
      b.healthStatus = 'ISOLATED';
    } else if (b.compromiseState === 'AFFECTED') {
      b.healthStatus = 'AFFECTED';
    } else if (b.compromiseState !== 'NONE') {
      b.healthStatus = 'COMPROMISED';
    } else {
      const hasUnmitigatedDiscovered = b.vulnerabilities.some(
        (v) => v.discovered && !v.mitigated
      );
      b.healthStatus = hasUnmitigatedDiscovered ? 'VULNERABLE' : 'HEALTHY';
    }
    b.securityScore = computeBuildingSecurityScore(b);
  }

  // 2. Update each connection's permitted state based on isolation & zonePolicies
  for (const conn of state.connections) {
    const src = state.buildings.find((b) => b.id === conn.source);
    const dst = state.buildings.find((b) => b.id === conn.target);
    if (!src || !dst) continue;

    if (src.isolated || dst.isolated) {
      conn.permitted = false;
      conn.trafficState = 'ISOLATED';
      continue;
    }

    const fwdKey = `${src.networkSegmentId}->${dst.networkSegmentId}`;
    const revKey = `${dst.networkSegmentId}->${src.networkSegmentId}`;
    const policy = state.zonePolicies[fwdKey] || state.zonePolicies[revKey];
    conn.permitted = policy ? Boolean(policy.allowed) : true;

    if (!conn.permitted) {
      conn.trafficState = 'BLOCKED';
    } else if (src.compromiseState !== 'NONE' || dst.compromiseState !== 'NONE') {
      conn.trafficState = 'SUSPICIOUS';
    } else if (conn.trafficState !== 'HIGH') {
      conn.trafficState = 'NORMAL';
    }
  }

  // 3. Evaluate mission objectives, metrics, and score
  state.metrics = calculateMetrics(state);
  state.objectives = evaluateObjectives(state);
  state.scoreBreakdown = calculateScoreBreakdown(state);

  const allCompleted =
    state.objectives.length > 0 && state.objectives.every((o) => o.completed);

  if (allCompleted && state.missionStatus !== 'COMPLETED') {
    state.missionStatus = 'COMPLETED';
    // Grant one-time mission completion XP if not already completed
    if (!state.progression.completedMissions.includes(state.scenarioId)) {
      state.progression.completedMissions.push(state.scenarioId);
      awardProgress(state, 150);
      if (state.metrics.serviceAvailability >= 95) {
        awardProgress(state, 0, 'SURGICAL_DEFENDER');
      }
      if (!state.criticalEverCompromised) {
        awardProgress(state, 0, 'CRITICAL_SHIELD');
      }
      if (state.progression.completedMissions.length >= Object.keys(SCENARIOS).length) {
        awardProgress(state, 100, 'CAMPAIGN_MASTER');
      }
    }
    appendEvent(state, {
      type: 'MISSION_COMPLETED',
      severity: 'INFO',
      sourceId: null,
      targetId: null,
      description: `All objectives satisfied for ${state.scenarioTitle}! Final Grade: ${state.scoreBreakdown.grade} (${state.scoreBreakdown.totalScore}/100).`,
    });
  } else if (!allCompleted && state.missionStatus === 'COMPLETED') {
    state.missionStatus = 'IN_PROGRESS';
  }
}
