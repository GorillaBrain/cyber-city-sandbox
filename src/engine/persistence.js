/**
 * Cyber City Sandbox — Persistence, Save/Restore & Validated Import/Export Layer
 * Enforces schema versioning, size limits, structural validation, and sanitization.
 */

import { BUILDING_ARCHETYPES, DEFENSIVE_CONTROLS } from './catalog.js';
import { refreshAllDerivedState } from './simulationEngine.js';

export const SAVE_STORAGE_KEY = 'cyber_city_sandbox_save_v1';
export const PROGRESSION_STORAGE_KEY = 'cyber_city_sandbox_progression_v1';
export const MAX_IMPORT_BYTES = 512 * 1024; // 512 KB limit
export const CURRENT_SCHEMA_VERSION = 1;

function sanitizeText(input, maxLength = 200) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').slice(0, maxLength);
}

export function serializeSavePayload(state) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'cyber-city-sandbox',
    state: {
      mode: state.mode,
      scenarioId: state.scenarioId,
      scenarioTitle: sanitizeText(state.scenarioTitle, 120),
      seed: sanitizeText(state.seed, 64),
      size: state.size,
      density: state.density,
      difficulty: state.difficulty,
      securityMaturity: state.securityMaturity,
      tick: Number(state.tick) || 0,
      budget: Number(state.budget) || 0,
      initialBudget: Number(state.initialBudget) || 500,
      spentBudget: Number(state.spentBudget) || 0,
      blockedAttempts: Number(state.blockedAttempts) || 0,
      compromiseEventsCount: Number(state.compromiseEventsCount) || 0,
      inspectionsCount: Number(state.inspectionsCount) || 0,
      restorationsCount: Number(state.restorationsCount) || 0,
      criticalEverCompromised: Boolean(state.criticalEverCompromised),
      missionStatus: state.missionStatus,
      buildings: state.buildings,
      connections: state.connections,
      zonePolicies: state.zonePolicies,
      totalLogicalSystems: state.totalLogicalSystems,
      events: (state.events || []).slice(0, 120),
      progression: state.progression,
    },
  };
}

export function validateAndParseImport(rawJsonString) {
  if (typeof rawJsonString !== 'string') {
    return { valid: false, error: 'Import payload must be a JSON string.' };
  }
  if (rawJsonString.length > MAX_IMPORT_BYTES) {
    return {
      valid: false,
      error: `Import file exceeds maximum allowed size (${MAX_IMPORT_BYTES} bytes).`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax in save file.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Root save payload must be a JSON object.' };
  }

  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Unsupported schemaVersion: ${String(parsed.schemaVersion)}. Expected ${CURRENT_SCHEMA_VERSION}.`,
    };
  }

  const s = parsed.state;
  if (!s || typeof s !== 'object') {
    return { valid: false, error: 'Missing `state` object in save payload.' };
  }

  if (!Array.isArray(s.buildings) || s.buildings.length < 1 || s.buildings.length > 100) {
    return { valid: false, error: 'Invalid or out-of-bounds `buildings` array.' };
  }

  if (!Array.isArray(s.connections) || s.connections.length > 400) {
    return { valid: false, error: 'Invalid `connections` array.' };
  }

  if (!s.zonePolicies || typeof s.zonePolicies !== 'object') {
    return { valid: false, error: 'Missing `zonePolicies` configuration.' };
  }

  // Validate every building structure and sanitize fields
  for (const b of s.buildings) {
    if (!b || typeof b.id !== 'string' || !BUILDING_ARCHETYPES[b.archetype]) {
      return {
        valid: false,
        error: `Invalid building definition or unknown archetype on building ${b?.id || 'unknown'}.`,
      };
    }
    b.name = sanitizeText(b.name, 80);
    if (!Array.isArray(b.position) || b.position.length !== 3) {
      return { valid: false, error: `Invalid 3D coordinates on building ${b.id}.` };
    }
    if (!Array.isArray(b.installedControls)) {
      b.installedControls = [];
    } else {
      b.installedControls = b.installedControls.filter((c) => Boolean(DEFENSIVE_CONTROLS[c]));
    }
    if (!Array.isArray(b.vulnerabilities)) {
      b.vulnerabilities = [];
    }
    if (!Array.isArray(b.services)) {
      b.services = [];
    }
  }

  const restoredState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    mode: s.mode === 'sandbox' ? 'sandbox' : 'campaign',
    scenarioId: sanitizeText(s.scenarioId || 'SCENARIO_A_SMART_HOME', 64),
    scenarioTitle: sanitizeText(s.scenarioTitle || 'Restored Scenario', 120),
    seed: sanitizeText(s.seed || 'CYBER-2088', 64),
    size: ['small', 'medium', 'large'].includes(s.size) ? s.size : 'small',
    density: ['standard', 'dense', 'ultra'].includes(s.density) ? s.density : 'dense',
    difficulty: ['relaxed', 'normal', 'hard'].includes(s.difficulty) ? s.difficulty : 'normal',
    securityMaturity: ['low', 'mixed', 'high'].includes(s.securityMaturity)
      ? s.securityMaturity
      : 'mixed',
    tick: Math.max(0, Math.floor(Number(s.tick) || 0)),
    running: false,
    speed: 1,
    budget: Math.max(0, Math.floor(Number(s.budget) || 0)),
    initialBudget: Math.max(100, Math.floor(Number(s.initialBudget) || 500)),
    spentBudget: Math.max(0, Math.floor(Number(s.spentBudget) || 0)),
    buildings: s.buildings,
    connections: s.connections,
    zonePolicies: s.zonePolicies,
    totalLogicalSystems: s.buildings.reduce((acc, b) => acc + b.services.length, 0),
    events: Array.isArray(s.events) ? s.events.slice(0, 120) : [],
    blockedAttempts: Math.max(0, Number(s.blockedAttempts) || 0),
    compromiseEventsCount: Math.max(0, Number(s.compromiseEventsCount) || 0),
    inspectionsCount: Math.max(0, Number(s.inspectionsCount) || 0),
    restorationsCount: Math.max(0, Number(s.restorationsCount) || 0),
    criticalEverCompromised: Boolean(s.criticalEverCompromised),
    activePropagationHighlight: null,
    missionStatus: s.missionStatus || 'IN_PROGRESS',
    progression: s.progression || {
      xp: 0,
      rank: 1,
      rankTitle: 'Junior SOC Analyst',
      completedMissions: [],
      unlockedBadges: [],
    },
  };

  refreshAllDerivedState(restoredState);
  return { valid: true, state: restoredState };
}

export function saveStateToLocalStorage(state) {
  try {
    const payload = serializeSavePayload(state);
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    if (state.progression) {
      localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(state.progression));
    }
    return true;
  } catch {
    return false;
  }
}

export function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const res = validateAndParseImport(raw);
    return res.valid ? res.state : null;
  } catch {
    return null;
  }
}

export function clearLocalStorageSave() {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    localStorage.removeItem(PROGRESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
