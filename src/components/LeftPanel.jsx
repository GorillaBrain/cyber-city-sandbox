import React, { useState } from 'react';
import {
  Target,
  Building2,
  Layers,
  Sliders,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  Search,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import { SCENARIOS, SCENARIO_LIST } from '../engine/scenarios.js';
import { CITY_SIZE_PRESETS } from '../engine/cityGenerator.js';

export default function LeftPanel() {
  const simState = useGameStore((s) => s.simState);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const leftPanelOpen = useGameStore((s) => s.leftPanelOpen);
  const activeLeftTab = useGameStore((s) => s.activeLeftTab);
  const setPanelState = useGameStore((s) => s.setPanelState);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const loadScenario = useGameStore((s) => s.loadScenario);
  const setZonePolicyAllowed = useGameStore((s) => s.setZonePolicyAllowed);
  const generateSandboxCity = useGameStore((s) => s.generateSandboxCity);

  const [assetFilter, setAssetFilter] = useState('');
  const [sandboxForm, setSandboxForm] = useState({
    seed: simState.seed || 'NEON-2088',
    size: simState.size || 'small',
    density: simState.density || 'dense',
    difficulty: simState.difficulty || 'normal',
    securityMaturity: simState.securityMaturity || 'mixed',
    scenarioId: simState.scenarioId || 'SCENARIO_A_SMART_HOME',
  });

  const currentScenario =
    SCENARIOS[simState.scenarioId] || SCENARIOS.SCENARIO_A_SMART_HOME;

  if (!leftPanelOpen) {
    return (
      <button
        type="button"
        className="panel-collapse-trigger left"
        onClick={() => setPanelState({ leftPanelOpen: true })}
        title="Expand Navigation & Mission Panel"
      >
        <ChevronRight size={18} />
      </button>
    );
  }

  const filteredBuildings = simState.buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(assetFilter.toLowerCase()) ||
      b.id.toLowerCase().includes(assetFilter.toLowerCase()) ||
      b.archetypeName.toLowerCase().includes(assetFilter.toLowerCase()) ||
      b.zoneName.toLowerCase().includes(assetFilter.toLowerCase())
  );

  return (
    <aside className="side-panel left-panel" data-testid="left-panel">
      <div className="panel-tabs">
        <button
          type="button"
          className={`panel-tab ${activeLeftTab === 'mission' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeLeftTab: 'mission' })}
          data-testid="tab-left-mission"
        >
          <Target size={14} />
          <span>Mission</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeLeftTab === 'assets' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeLeftTab: 'assets' })}
          data-testid="tab-left-assets"
        >
          <Building2 size={14} />
          <span>Assets ({simState.buildings.length})</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeLeftTab === 'zones' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeLeftTab: 'zones' })}
          data-testid="tab-left-zones"
        >
          <Layers size={14} />
          <span>Zones</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeLeftTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeLeftTab: 'sandbox' })}
          data-testid="tab-left-sandbox"
        >
          <Sliders size={14} />
          <span>Sandbox</span>
        </button>
        <button
          type="button"
          className="panel-hide-btn"
          onClick={() => setPanelState({ leftPanelOpen: false })}
          title="Collapse Left Panel"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <div className="panel-body">
        {/* TAB 1: MISSION & OBJECTIVES */}
        {activeLeftTab === 'mission' && (
          <div className="mission-section">
            <div className="section-card">
              <div className="card-header-row">
                <span className="badge-code">{currentScenario.code}</span>
                <span className="badge-difficulty">
                  {currentScenario.difficulty}
                </span>
              </div>
              <h2 className="section-title">{currentScenario.title}</h2>
              <p className="section-desc">{currentScenario.briefing}</p>

              <div className="threat-callout">
                <strong>Threat Vector:</strong> {currentScenario.threatDescription}
              </div>
            </div>

            {/* Live Objectives */}
            <div className="section-card">
              <div className="card-header-row">
                <h3 className="subsection-title">TACTICAL OBJECTIVES</h3>
                <span
                  className={`mission-status-pill ${simState.missionStatus.toLowerCase()}`}
                  data-testid="mission-status-badge"
                >
                  {simState.missionStatus === 'COMPLETED'
                    ? `COMPLETED (${simState.scoreBreakdown?.grade})`
                    : 'IN PROGRESS'}
                </span>
              </div>

              <ul className="objectives-list" data-testid="objectives-list">
                {(simState.objectives || []).map((obj) => (
                  <li
                    key={obj.id}
                    className={`objective-item ${
                      obj.completed ? 'completed' : ''
                    }`}
                  >
                    {obj.completed ? (
                      <CheckCircle2 size={16} className="icon-green shrink-0" />
                    ) : (
                      <Circle size={16} className="icon-muted shrink-0" />
                    )}
                    <span>{obj.label}</span>
                  </li>
                ))}
              </ul>

              {simState.missionStatus === 'COMPLETED' && (
                <div className="debrief-box" data-testid="mission-debrief-box">
                  <h4>After-Action Debrief & Learning Points</h4>
                  <p>{currentScenario.debrief}</p>
                </div>
              )}
            </div>

            {/* Campaign Mission Catalogue */}
            <div className="section-card">
              <h3 className="subsection-title">CAMPAIGN SCENARIOS (6)</h3>
              <div className="scenario-catalogue">
                {SCENARIO_LIST.map((sc) => {
                  const isDone = (
                    simState.progression?.completedMissions || []
                  ).includes(sc.id);
                  const isActive = simState.scenarioId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      className={`scenario-card-btn ${isActive ? 'active' : ''}`}
                      onClick={() => loadScenario(sc.id)}
                      data-testid={`select-scenario-${sc.id}`}
                    >
                      <div className="scenario-card-top">
                        <span className="scenario-code">{sc.code}</span>
                        <span className="scenario-diff">{sc.difficulty}</span>
                        {isDone && (
                          <span className="scenario-done-tag">SOLVED</span>
                        )}
                      </div>
                      <div className="scenario-card-title">{sc.shortTitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSET BROWSER */}
        {activeLeftTab === 'assets' && (
          <div className="assets-section">
            <div className="search-box">
              <Search size={14} className="icon-muted" />
              <input
                type="text"
                placeholder="Filter buildings, IDs, or zones..."
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
              />
            </div>

            <div className="asset-summary-strip">
              <span>{simState.buildings.length} Buildings</span>
              <span>•</span>
              <span>{simState.totalLogicalSystems} Logical Systems</span>
            </div>

            <div className="asset-list" data-testid="asset-browser-list">
              {filteredBuildings.map((b) => {
                const isSelected = b.id === selectedBuildingId;
                const openVulns = b.vulnerabilities.filter(
                  (v) => v.discovered && !v.mitigated
                ).length;

                return (
                  <button
                    key={b.id}
                    type="button"
                    className={`asset-row-btn ${isSelected ? 'selected' : ''} status-${b.healthStatus.toLowerCase()}`}
                    onClick={() => selectBuilding(b.id, true)}
                    data-testid={`asset-item-${b.id}`}
                  >
                    <div className="asset-row-main">
                      <span className="asset-id">{b.id}</span>
                      <span className="asset-name">{b.name}</span>
                      <span className={`health-pill ${b.healthStatus.toLowerCase()}`}>
                        {b.healthStatus}
                      </span>
                    </div>
                    <div className="asset-row-meta">
                      <span>{b.archetypeName}</span>
                      <span>• {b.services.length} sys</span>
                      <span>• Score {b.securityScore}</span>
                      {openVulns > 0 && (
                        <span className="text-amber">• {openVulns} vuln</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: NETWORK SEGMENTATION ZONES */}
        {activeLeftTab === 'zones' && (
          <div className="zones-section">
            <div className="section-card">
              <h3 className="subsection-title">ZONE SEGMENTATION POLICIES</h3>
              <p className="section-desc">
                Control inter-zone communication conduits across the city graph.
                Blocking unsafe bridges halts lateral propagation without
                hurting availability, while blocking legitimate dependencies
                reduces service uptime.
              </p>

              <div className="zone-policy-list">
                {Object.values(simState.zonePolicies).map((policy) => (
                  <div key={policy.id} className="zone-policy-card">
                    <div className="zone-policy-header">
                      <span className="zone-route-title">
                        {policy.sourceZone.replace('_ZONE', '')} →{' '}
                        {policy.targetZone.replace('_ZONE', '')}
                      </span>
                      <button
                        type="button"
                        className={`btn-policy-toggle ${
                          policy.allowed ? 'permit' : 'deny'
                        }`}
                        onClick={() =>
                          setZonePolicyAllowed(policy.id, !policy.allowed)
                        }
                        data-testid={`policy-toggle-${policy.id}`}
                      >
                        {policy.allowed ? (
                          <>
                            <Unlock size={12} /> PERMIT
                          </>
                        ) : (
                          <>
                            <Lock size={12} /> DENY
                          </>
                        )}
                      </button>
                    </div>
                    <p className="zone-policy-desc">{policy.description}</p>
                    <div className="zone-policy-foot">
                      {policy.legitimateDependency ? (
                        <span className="dep-tag required">
                          Legitimate Service Dependency (-8% Uptime if Denied)
                        </span>
                      ) : (
                        <span className="dep-tag unsafe">
                          Unsafe Trust Bridge (Safe to Deny)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SANDBOX GENERATOR */}
        {activeLeftTab === 'sandbox' && (
          <div className="sandbox-section">
            <div className="section-card">
              <h3 className="subsection-title">PROCEDURAL SANDBOX GENERATOR</h3>
              <p className="section-desc">
                Generate a deterministic cyberpunk city and network graph from
                any seed string. Identical seeds and parameters always produce
                the exact same city topology.
              </p>

              <label className="form-label">
                City Seed
                <div className="seed-input-row">
                  <input
                    type="text"
                    className="form-input"
                    value={sandboxForm.seed}
                    onChange={(e) =>
                      setSandboxForm({ ...sandboxForm, seed: e.target.value })
                    }
                    data-testid="sandbox-seed-input"
                  />
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() =>
                      setSandboxForm({
                        ...sandboxForm,
                        seed: `NEON-${Math.floor(1000 + Math.random() * 9000)}`,
                      })
                    }
                  >
                    Random
                  </button>
                </div>
              </label>

              <label className="form-label">
                City Scale (Logical Systems)
                <select
                  className="form-select"
                  value={sandboxForm.size}
                  onChange={(e) =>
                    setSandboxForm({ ...sandboxForm, size: e.target.value })
                  }
                  data-testid="sandbox-size-select"
                >
                  {Object.values(CITY_SIZE_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                Network Link Density
                <select
                  className="form-select"
                  value={sandboxForm.density}
                  onChange={(e) =>
                    setSandboxForm({ ...sandboxForm, density: e.target.value })
                  }
                >
                  <option value="standard">Standard Segmented Mesh</option>
                  <option value="dense">Dense Metro Interconnect</option>
                  <option value="ultra">Ultra Redundant Fiber Ring</option>
                </select>
              </label>

              <label className="form-label">
                Initial Security Maturity
                <select
                  className="form-select"
                  value={sandboxForm.securityMaturity}
                  onChange={(e) =>
                    setSandboxForm({
                      ...sandboxForm,
                      securityMaturity: e.target.value,
                    })
                  }
                >
                  <option value="low">Low (Minimal Pre-installed Controls)</option>
                  <option value="mixed">Mixed (Realistic Smart City)</option>
                  <option value="high">High (Pre-installed SIEM & Vaults)</option>
                </select>
              </label>

              <label className="form-label">
                Simulated Threat Scenario
                <select
                  className="form-select"
                  value={sandboxForm.scenarioId}
                  onChange={(e) =>
                    setSandboxForm({
                      ...sandboxForm,
                      scenarioId: e.target.value,
                    })
                  }
                >
                  {SCENARIO_LIST.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.title}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn-primary-full"
                onClick={() => generateSandboxCity(sandboxForm)}
                data-testid="btn-generate-sandbox"
              >
                <Sparkles size={15} />
                <span>Generate Deterministic City</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
