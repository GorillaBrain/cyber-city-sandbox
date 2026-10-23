/**
 * Cyber City Sandbox — Zustand Global State Store
 * Separates simulation engine state from 3D camera/overlay/UI state.
 */

import { create } from 'zustand';
import {
  createSimulationState,
  inspectBuilding,
  installControl,
  removeControl,
  toggleBuildingIsolation,
  updateZonePolicy,
  restoreBuilding,
  stepSimulation,
} from '../engine/simulationEngine.js';
import {
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  clearLocalStorageSave,
  serializeSavePayload,
  validateAndParseImport,
} from '../engine/persistence.js';
import { soundFX } from '../utils/soundEffects.js';

const TUTORIAL_SEEN_KEY = 'cyber_city_tutorial_seen_v1';

function getInitialSimState() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'defense') {
        let s = createSimulationState({
          mode: 'campaign',
          scenarioId: 'SCENARIO_A_SMART_HOME',
        });
        s = inspectBuilding(s, 'BLD-RES-01').state;
        s = installControl(s, 'BLD-RES-01', 'segmentation').state;
        s = installControl(s, 'BLD-RES-01', 'mfa').state;
        s = stepSimulation(s, 2);
        return s;
      }
    }
  } catch {
    // ignore
  }
  const saved = loadStateFromLocalStorage();
  if (saved) return saved;
  return createSimulationState({
    mode: 'campaign',
    scenarioId: 'SCENARIO_A_SMART_HOME',
  });
}

function getInitialTutorialOpen() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('notutorial') === '1' || params.get('demo')) {
        return false;
      }
    }
    return !localStorage.getItem(TUTORIAL_SEEN_KEY);
  } catch {
    return false;
  }
}

export const useGameStore = create((set, get) => {
  const initialSim = getInitialSimState();

  return {
    simState: initialSim,
    selectedBuildingId: initialSim.buildings[0]?.id || 'BLD-RES-01',
    hoveredBuildingId: null,
    selectedEventId: null,
    cameraFocusTarget: null,
    cameraResetCounter: 0,
    lastActionFeedback: null,

    // Visual Overlays
    overlays: {
      network: true,
      threats: true,
      vulnerabilities: true,
      controls: true,
      labels: true,
    },

    // Performance & Rendering settings
    graphics: {
      bloom: true,
      flyingTraffic: true,
      shadows: true,
      particles: true,
    },

    audioEnabled: false,

    // Panel visibility & active tabs
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: true,
    activeLeftTab: 'mission', // 'mission' | 'assets' | 'sandbox' | 'zones'
    activeRightTab:
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location?.search).get('demo') === 'defense'
        ? 'vulns'
        : 'overview', // 'overview' | 'vulns' | 'controls' | 'network'
    activeBottomTab:
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location?.search).get('demo') === 'defense'
        ? 'propagation'
        : 'events', // 'events' | 'timeline' | 'propagation' | 'score'
    showTutorial: getInitialTutorialOpen(),
    activeModal: null, // null | 'briefing' | 'save_export' | 'settings' | 'legend'

    setFeedback: (type, message) => {
      set({
        lastActionFeedback: {
          id: Date.now(),
          type,
          message,
        },
      });
    },

    selectBuilding: (buildingId, focusCamera = false) => {
      soundFX.selectBuilding();
      const b = get().simState.buildings.find((item) => item.id === buildingId);
      set((state) => ({
        selectedBuildingId: buildingId,
        rightPanelOpen: true,
        cameraFocusTarget:
          focusCamera && b
            ? {
                position: [...b.position],
                height: b.dimensions?.height || 8,
                ts: Date.now(),
              }
            : state.cameraFocusTarget,
      }));
    },

    setHoveredBuilding: (buildingId) => {
      set({ hoveredBuildingId: buildingId });
    },

    selectEvent: (eventObj) => {
      if (!eventObj) {
        set({ selectedEventId: null });
        return;
      }
      const targetNode = eventObj.targetId || eventObj.sourceId;
      const b = get().simState.buildings.find((item) => item.id === targetNode);
      set({
        selectedEventId: eventObj.id,
        selectedBuildingId: b ? b.id : get().selectedBuildingId,
        cameraFocusTarget: b
          ? {
              position: [...b.position],
              height: b.dimensions?.height || 8,
              ts: Date.now(),
            }
          : get().cameraFocusTarget,
      });
    },

    resetCamera: () => {
      set((state) => ({
        cameraFocusTarget: null,
        cameraResetCounter: state.cameraResetCounter + 1,
      }));
    },

    toggleOverlay: (key) => {
      set((state) => ({
        overlays: {
          ...state.overlays,
          [key]: !state.overlays[key],
        },
      }));
    },

    toggleGraphicSetting: (key) => {
      set((state) => ({
        graphics: {
          ...state.graphics,
          [key]: !state.graphics[key],
        },
      }));
    },

    toggleAudio: () => {
      const next = !get().audioEnabled;
      soundFX.setEnabled(next);
      if (next) soundFX.selectBuilding();
      set({ audioEnabled: next });
    },

    setPanelState: (updates) => {
      set(updates);
    },

    closeTutorial: () => {
      try {
        localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
      } catch {
        // ignore
      }
      set({ showTutorial: false });
    },

    // Simulation Playback Controls
    togglePlayPause: () => {
      set((state) => ({
        simState: {
          ...state.simState,
          running: !state.simState.running,
        },
      }));
    },

    setSimRunning: (running) => {
      set((state) => ({
        simState: {
          ...state.simState,
          running: Boolean(running),
        },
      }));
    },

    setSimSpeed: (speed) => {
      if (![1, 2, 4].includes(speed)) return;
      set((state) => ({
        simState: {
          ...state.simState,
          speed,
        },
      }));
    },

    stepForward: (ticks = 1) => {
      const prev = get().simState;
      const prevCompleted = prev.missionStatus === 'COMPLETED';
      const prevBlocked = prev.blockedAttempts;
      const prevCompromises = prev.compromiseEventsCount;

      const nextSim = stepSimulation(prev, ticks);
      nextSim.running = prev.running;
      nextSim.speed = prev.speed;

      if (!prevCompleted && nextSim.missionStatus === 'COMPLETED') {
        soundFX.missionComplete();
      } else if (nextSim.blockedAttempts > prevBlocked) {
        soundFX.containmentBlocked();
      } else if (nextSim.compromiseEventsCount > prevCompromises) {
        soundFX.alertWarning();
      }

      saveStateToLocalStorage(nextSim);
      set({ simState: nextSim });
    },

    // Gameplay Actions
    runBuildingInspection: (buildingId) => {
      const targetId = buildingId || get().selectedBuildingId;
      const res = inspectBuilding(get().simState, targetId);
      if (res.success) {
        soundFX.scanComplete();
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'success',
            message:
              res.newlyDiscovered > 0
                ? `Inspection complete: discovered ${res.newlyDiscovered} weakness(es).`
                : 'Inspection complete: all weaknesses on this asset are already cataloged.',
          },
        });
      } else {
        set({
          lastActionFeedback: {
            id: Date.now(),
            type: 'error',
            message: res.reason,
          },
        });
      }
      return res;
    },

    deployDefensiveControl: (buildingId, controlId) => {
      const targetId = buildingId || get().selectedBuildingId;
      const prevCompleted = get().simState.missionStatus === 'COMPLETED';
      const res = installControl(get().simState, targetId, controlId);
      if (res.success) {
        if (!prevCompleted && res.state.missionStatus === 'COMPLETED') {
          soundFX.missionComplete();
        } else {
          soundFX.installControl();
        }
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'success',
            message: `Control installed${
              res.mitigatedNow?.length
                ? ` (Mitigated ${res.mitigatedNow.join(', ')})`
                : '.'
            }`,
          },
        });
      } else {
        set({
          lastActionFeedback: {
            id: Date.now(),
            type: 'error',
            message: res.reason,
          },
        });
      }
      return res;
    },

    uninstallDefensiveControl: (buildingId, controlId) => {
      const targetId = buildingId || get().selectedBuildingId;
      const res = removeControl(get().simState, targetId, controlId);
      if (res.success) {
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'info',
            message: 'Defensive control removed (50% credit refund applied).',
          },
        });
      } else {
        set({
          lastActionFeedback: {
            id: Date.now(),
            type: 'error',
            message: res.reason,
          },
        });
      }
      return res;
    },

    toggleIsolation: (buildingId) => {
      const targetId = buildingId || get().selectedBuildingId;
      const res = toggleBuildingIsolation(get().simState, targetId);
      if (res.success) {
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: res.isolated ? 'warning' : 'info',
            message: res.isolated
              ? 'Host isolated from network. Check availability impact!'
              : 'Host reconnected to network.',
          },
        });
      }
      return res;
    },

    setZonePolicyAllowed: (policyId, allowed) => {
      const prevCompleted = get().simState.missionStatus === 'COMPLETED';
      const res = updateZonePolicy(get().simState, policyId, allowed);
      if (res.success) {
        if (!prevCompleted && res.state.missionStatus === 'COMPLETED') {
          soundFX.missionComplete();
        } else {
          soundFX.installControl();
        }
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'info',
            message: `Zone policy ${policyId} set to ${allowed ? 'PERMIT' : 'DENY'}.`,
          },
        });
      }
      return res;
    },

    restoreSystem: (buildingId) => {
      const targetId = buildingId || get().selectedBuildingId;
      const prevCompleted = get().simState.missionStatus === 'COMPLETED';
      const res = restoreBuilding(get().simState, targetId);
      if (res.success) {
        if (!prevCompleted && res.state.missionStatus === 'COMPLETED') {
          soundFX.missionComplete();
        } else {
          soundFX.installControl();
        }
        res.state.running = get().simState.running;
        res.state.speed = get().simState.speed;
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'success',
            message: 'System restored from verified clean snapshot!',
          },
        });
      } else {
        soundFX.alertWarning();
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          lastActionFeedback: {
            id: Date.now(),
            type: 'error',
            message: res.reason,
          },
        });
      }
      return res;
    },

    // Scenario & Sandbox switching
    loadScenario: (scenarioId) => {
      const currentProgression = get().simState.progression;
      const nextSim = createSimulationState({
        mode: 'campaign',
        scenarioId,
        progression: currentProgression,
      });
      saveStateToLocalStorage(nextSim);
      set({
        simState: nextSim,
        selectedBuildingId: nextSim.buildings[0]?.id || 'BLD-RES-01',
        selectedEventId: null,
        lastActionFeedback: {
          id: Date.now(),
          type: 'info',
          message: `Loaded ${nextSim.scenarioTitle}.`,
        },
      });
    },

    generateSandboxCity: (sandboxConfig) => {
      const currentProgression = get().simState.progression;
      const nextSim = createSimulationState({
        mode: 'sandbox',
        scenarioId: sandboxConfig.scenarioId || 'SCENARIO_A_SMART_HOME',
        seed: sandboxConfig.seed || 'NEON-SANDBOX-88',
        size: sandboxConfig.size || 'small',
        density: sandboxConfig.density || 'dense',
        difficulty: sandboxConfig.difficulty || 'normal',
        securityMaturity: sandboxConfig.securityMaturity || 'mixed',
        budget: 1400,
        progression: currentProgression,
      });
      saveStateToLocalStorage(nextSim);
      set({
        simState: nextSim,
        selectedBuildingId: nextSim.buildings[0]?.id || 'BLD-RES-01',
        selectedEventId: null,
        lastActionFeedback: {
          id: Date.now(),
          type: 'success',
          message: `Generated deterministic ${nextSim.size.toUpperCase()} city (${nextSim.totalLogicalSystems} logical systems) from seed "${nextSim.seed}".`,
        },
      });
    },

    resetCurrentScenario: () => {
      const cur = get().simState;
      const nextSim = createSimulationState({
        mode: cur.mode,
        scenarioId: cur.scenarioId,
        seed: cur.seed,
        size: cur.size,
        density: cur.density,
        difficulty: cur.difficulty,
        securityMaturity: cur.securityMaturity,
        progression: cur.progression,
      });
      saveStateToLocalStorage(nextSim);
      set({
        simState: nextSim,
        selectedEventId: null,
        lastActionFeedback: {
          id: Date.now(),
          type: 'info',
          message: 'Scenario reset to Tick T+00:00.',
        },
      });
    },

    resetAllProgress: () => {
      clearLocalStorageSave();
      const fresh = createSimulationState({
        mode: 'campaign',
        scenarioId: 'SCENARIO_A_SMART_HOME',
      });
      saveStateToLocalStorage(fresh);
      set({
        simState: fresh,
        selectedBuildingId: fresh.buildings[0]?.id || 'BLD-RES-01',
        selectedEventId: null,
        lastActionFeedback: {
          id: Date.now(),
          type: 'warning',
          message: 'All progression and saved city states have been reset.',
        },
      });
    },

    exportCitySaveString: () => {
      return JSON.stringify(serializeSavePayload(get().simState), null, 2);
    },

    importCitySaveString: (rawString) => {
      const res = validateAndParseImport(rawString);
      if (res.valid) {
        saveStateToLocalStorage(res.state);
        set({
          simState: res.state,
          selectedBuildingId: res.state.buildings[0]?.id || 'BLD-RES-01',
          selectedEventId: null,
          lastActionFeedback: {
            id: Date.now(),
            type: 'success',
            message: `Imported validated save "${res.state.seed}" (${res.state.buildings.length} buildings).`,
          },
        });
      } else {
        set({
          lastActionFeedback: {
            id: Date.now(),
            type: 'error',
            message: `Import rejected: ${res.error}`,
          },
        });
      }
      return res;
    },
  };
});
