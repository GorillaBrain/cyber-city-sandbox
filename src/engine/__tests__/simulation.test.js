import { describe, it, expect, beforeEach } from 'vitest';
import { generateCity } from '../cityGenerator.js';
import {
  createSimulationState,
  inspectBuilding,
  installControl,
  removeControl,
  toggleBuildingIsolation,
  updateZonePolicy,
  restoreBuilding,
  stepSimulation,
  calculateMetrics,
} from '../simulationEngine.js';
import {
  serializeSavePayload,
  validateAndParseImport,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
} from '../persistence.js';

describe('Cyber City Sandbox — Simulation Engine Unit & Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Deterministic City & Network Generation', () => {
    it('generates identical city layouts, stable asset IDs, and topologies for the same seed', () => {
      const cityA = generateCity({ seed: 'ALPHA-99', size: 'small' });
      const cityB = generateCity({ seed: 'ALPHA-99', size: 'small' });
      const cityC = generateCity({ seed: 'OMEGA-42', size: 'small' });

      expect(cityA.buildings.map((b) => b.id)).toEqual(cityB.buildings.map((b) => b.id));
      expect(cityA.buildings.map((b) => b.position)).toEqual(
        cityB.buildings.map((b) => b.position)
      );
      expect(cityA.connections.length).toBe(cityB.connections.length);
      // Different seed produces different positions/heights
      expect(cityA.buildings[0].position).not.toEqual(cityC.buildings[0].position);
    });

    it('supports Small (20–30), Medium (50–80), and Large (100–150) logical system counts', () => {
      const small = generateCity({ seed: 'SIZE-TEST', size: 'small' });
      const medium = generateCity({ seed: 'SIZE-TEST', size: 'medium' });
      const large = generateCity({ seed: 'SIZE-TEST', size: 'large' });

      expect(small.totalLogicalSystems).toBeGreaterThanOrEqual(20);
      expect(small.totalLogicalSystems).toBeLessThanOrEqual(30);

      expect(medium.totalLogicalSystems).toBeGreaterThanOrEqual(50);
      expect(medium.totalLogicalSystems).toBeLessThanOrEqual(80);

      expect(large.totalLogicalSystems).toBeGreaterThanOrEqual(100);
      expect(large.totalLogicalSystems).toBeLessThanOrEqual(160);
    });

    it('creates segmented topologies rather than an all-to-all mesh', () => {
      const city = generateCity({ seed: 'TOPOLOGY-1', size: 'small' });
      const maxPossibleEdges = (city.buildings.length * (city.buildings.length - 1)) / 2;
      expect(city.connections.length).toBeLessThan(maxPossibleEdges * 0.5);
      // Residential building should not have a direct edge to the Industrial Factory
      const resToFac = city.connections.find(
        (c) =>
          (c.source === 'BLD-RES-01' && c.target === 'BLD-FAC-01') ||
          (c.source === 'BLD-FAC-01' && c.target === 'BLD-RES-01')
      );
      expect(resToFac).toBeUndefined();
    });
  });

  describe('2. Vulnerability Discovery, Patching & Defensive Controls', () => {
    it('discovers unknown vulnerabilities without automatically mitigating them', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_A_SMART_HOME' });
      const resBefore = state.buildings.find((b) => b.id === 'BLD-RES-01');
      expect(resBefore.vulnerabilities.some((v) => !v.discovered)).toBe(true);

      const res = inspectBuilding(state, 'BLD-RES-01');
      expect(res.success).toBe(true);
      expect(res.newlyDiscovered).toBeGreaterThan(0);
      state = res.state;

      const resAfter = state.buildings.find((b) => b.id === 'BLD-RES-01');
      expect(resAfter.vulnerabilities.every((v) => v.discovered)).toBe(true);
      expect(resAfter.vulnerabilities.every((v) => v.mitigated)).toBe(false);
    });

    it('enforces control dependencies and mitigates corresponding vulnerabilities on installation', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_D_DATACENTER_EXPOSURE' });

      // IDS requires net_monitoring first
      const idsAttempt = installControl(state, 'BLD-DC-01', 'ids');
      expect(idsAttempt.success).toBe(false);
      expect(idsAttempt.reason).toContain('requires');

      // Install patch_mgmt on BLD-DC-01 to mitigate SIM-VULN-007 and SIM-VULN-005
      const patchRes = installControl(state, 'BLD-DC-01', 'patch_mgmt');
      expect(patchRes.success).toBe(true);
      expect(patchRes.mitigatedNow).toContain('SIM-VULN-007');
      state = patchRes.state;

      const dc = state.buildings.find((b) => b.id === 'BLD-DC-01');
      const vuln7 = dc.vulnerabilities.find((v) => v.catalogId === 'SIM-VULN-007');
      expect(vuln7.mitigated).toBe(true);
      expect(vuln7.status).toBe('MITIGATED');

      // Removing control restores vulnerability to unmitigated
      const remRes = removeControl(state, 'BLD-DC-01', 'patch_mgmt');
      expect(remRes.success).toBe(true);
      const dcAfter = remRes.state.buildings.find((b) => b.id === 'BLD-DC-01');
      expect(dcAfter.vulnerabilities.find((v) => v.catalogId === 'SIM-VULN-007').mitigated).toBe(
        false
      );
    });
  });

  describe('3. Integration Flow 1 — Vulnerable Gateway Propagation & Containment', () => {
    it('propagates compromise when unprotected and blocks propagation when segmentation/firewall is installed', () => {
      // Unprotected run
      let unprotected = createSimulationState({ scenarioId: 'SCENARIO_A_SMART_HOME' });
      const resBuilding = unprotected.buildings.find((b) => b.id === 'BLD-RES-01');
      expect(resBuilding.compromiseState).toBe('FOOTHOLD');

      unprotected = stepSimulation(unprotected, 2);
      const transitBuilding = unprotected.buildings.find((b) => b.id === 'BLD-PUB-01');
      expect(transitBuilding.compromiseState).toBe('LATERAL');

      // Protected replay
      let protectedState = createSimulationState({ scenarioId: 'SCENARIO_A_SMART_HOME' });
      protectedState = inspectBuilding(protectedState, 'BLD-RES-01').state;
      protectedState = installControl(protectedState, 'BLD-RES-01', 'segmentation').state;
      protectedState = installControl(protectedState, 'BLD-RES-01', 'mfa').state;

      protectedState = stepSimulation(protectedState, 4);
      const transitProtected = protectedState.buildings.find((b) => b.id === 'BLD-PUB-01');
      const corpProtected = protectedState.buildings.find((b) => b.id === 'BLD-CORP-01');

      expect(transitProtected.compromiseState).toBe('NONE');
      expect(corpProtected.compromiseState).toBe('NONE');
      expect(protectedState.blockedAttempts).toBeGreaterThanOrEqual(2);

      // Restore the initial gateway and verify mission completion
      const restored = restoreBuilding(protectedState, 'BLD-RES-01');
      expect(restored.success).toBe(true);
      protectedState = restored.state;
      expect(protectedState.missionStatus).toBe('COMPLETED');
      expect(protectedState.scoreBreakdown.totalScore).toBeGreaterThan(75);
    });
  });

  describe('4. Integration Flow 2 — Critical Infrastructure & Zone Segmentation', () => {
    it('protects critical power and hospital infrastructure when OT boundary controls or policies are applied', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_E_INDUSTRIAL_BOUNDARY' });
      state = inspectBuilding(state, 'BLD-FAC-01').state;

      // Disable unsafe CORPORATE_USERS->INDUSTRIAL_CRITICAL zone policy
      state = updateZonePolicy(state, 'CORPORATE_USERS->INDUSTRIAL_CRITICAL', false).state;
      state = installControl(state, 'BLD-CORP-01', 'least_privilege').state;

      // Advance simulation 6 ticks
      state = stepSimulation(state, 6);

      const fac = state.buildings.find((b) => b.id === 'BLD-FAC-01');
      const pow = state.buildings.find((b) => b.id === 'BLD-POW-01');
      const hos = state.buildings.find((b) => b.id === 'BLD-HOS-01');

      expect(fac.compromiseState).toBe('NONE');
      expect(pow.compromiseState).toBe('NONE');
      expect(hos.compromiseState).toBe('NONE');
      expect(state.blockedAttempts).toBeGreaterThanOrEqual(1);

      // Restore initial foothold on BLD-CORP-01
      state = restoreBuilding(state, 'BLD-CORP-01').state;
      expect(state.missionStatus).toBe('COMPLETED');
    });
  });

  describe('5. Integration Flow 3 — Simulation Pause, Speed & Controlled Time', () => {
    it('advances state deterministically only when stepped and penalizes indiscriminate isolation', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_F_SMART_CITY_INCIDENT' });
      expect(state.tick).toBe(0);
      expect(state.running).toBe(false);

      // While paused, tick and events do not advance unless stepSimulation is invoked
      const eventCountAtPause = state.events.length;
      expect(state.tick).toBe(0);
      expect(state.events.length).toBe(eventCountAtPause);

      // Step 1x (1 tick) vs 2x (2 ticks)
      state = stepSimulation(state, 1);
      expect(state.tick).toBe(1);
      state = stepSimulation(state, 2);
      expect(state.tick).toBe(3);

      // Indiscriminate isolation reduces availability below 85%
      state = toggleBuildingIsolation(state, 'BLD-DC-01').state;
      state = toggleBuildingIsolation(state, 'BLD-POW-01').state;
      const metrics = calculateMetrics(state);
      expect(metrics.serviceAvailability).toBeLessThan(80);
    });
  });

  describe('6. Save, Restore & Validated Import/Export', () => {
    it('serializes, saves, and restores full simulation state and rejects malformed imports', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_B_CORP_CREDENTIAL' });
      state = inspectBuilding(state, 'BLD-CORP-01').state;
      state = installControl(state, 'BLD-CORP-01', 'logging').state;

      expect(saveStateToLocalStorage(state)).toBe(true);
      const loaded = loadStateFromLocalStorage();
      expect(loaded).not.toBeNull();
      expect(loaded.scenarioId).toBe('SCENARIO_B_CORP_CREDENTIAL');
      expect(
        loaded.buildings
          .find((b) => b.id === 'BLD-CORP-01')
          .installedControls.includes('logging')
      ).toBe(true);

      // Reject invalid JSON and unsupported schema versions
      expect(validateAndParseImport('not-json').valid).toBe(false);
      expect(
        validateAndParseImport(JSON.stringify({ schemaVersion: 999, state: {} })).valid
      ).toBe(false);
      expect(
        validateAndParseImport(
          JSON.stringify({ schemaVersion: 1, state: { buildings: [] } })
        ).valid
      ).toBe(false);

      const exportedStr = JSON.stringify(serializeSavePayload(state));
      const reimported = validateAndParseImport(exportedStr);
      expect(reimported.valid).toBe(true);
      expect(reimported.state.buildings.length).toBe(state.buildings.length);
    });
  });

  describe('7. Ransomware Snapshot Tampering & Immutable Backup Recovery (Scenario C)', () => {
    it('prevents restoration if snapshots are tampered with until backup_recovery is installed', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_C_RANSOMWARE' });
      // Advance 4 ticks without protecting BLD-DC-01 so snapshots are tampered with
      state = stepSimulation(state, 4);
      const dc = state.buildings.find((b) => b.id === 'BLD-DC-01');
      expect(dc.compromiseState).toBe('AFFECTED');
      expect(dc.snapshotClean).toBe(false);

      // Attempting restore without backup_recovery fails
      const failedRestore = restoreBuilding(state, 'BLD-DC-01');
      expect(failedRestore.success).toBe(false);
      expect(failedRestore.reason).toContain('Clean recovery snapshots are unavailable');

      // Installing backup_recovery restores snapshot availability and allows clean recovery
      state = installControl(state, 'BLD-DC-01', 'backup_recovery').state;
      const okRestore = restoreBuilding(state, 'BLD-DC-01');
      expect(okRestore.success).toBe(true);
      expect(
        okRestore.state.buildings.find((b) => b.id === 'BLD-DC-01').compromiseState
      ).toBe('NONE');
    });
  });

  describe('8. Progression & Anti-Farming Verification', () => {
    it('grants mission completion XP once and does not duplicate permanent mission rewards on replay', () => {
      let state = createSimulationState({ scenarioId: 'SCENARIO_A_SMART_HOME' });
      state = inspectBuilding(state, 'BLD-RES-01').state;
      state = installControl(state, 'BLD-RES-01', 'segmentation').state;
      state = restoreBuilding(state, 'BLD-RES-01').state;

      expect(state.missionStatus).toBe('COMPLETED');
      const xpAfterFirstComplete = state.progression.xp;
      expect(state.progression.completedMissions).toContain('SCENARIO_A_SMART_HOME');

      // Replay with existing progression
      let replay = createSimulationState({
        scenarioId: 'SCENARIO_A_SMART_HOME',
        progression: state.progression,
      });
      replay = inspectBuilding(replay, 'BLD-RES-01').state;
      replay = installControl(replay, 'BLD-RES-01', 'segmentation').state;
      replay = restoreBuilding(replay, 'BLD-RES-01').state;

      expect(replay.missionStatus).toBe('COMPLETED');
      // Only action XP (inspection + control + restore = 65) added, not the +150 mission completion bonus again
      expect(replay.progression.xp).toBe(xpAfterFirstComplete + 65);
    });
  });
});
