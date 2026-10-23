import React from 'react';
import {
  Search,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  Server,
  Bug,
  Shield,
  Network,
  ChevronRight,
  ChevronLeft,
  Check,
  Trash2,
  AlertOctagon,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import { DEFENSIVE_CONTROLS } from '../engine/catalog.js';

export default function RightPanel() {
  const simState = useGameStore((s) => s.simState);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const rightPanelOpen = useGameStore((s) => s.rightPanelOpen);
  const activeRightTab = useGameStore((s) => s.activeRightTab);
  const setPanelState = useGameStore((s) => s.setPanelState);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const runBuildingInspection = useGameStore((s) => s.runBuildingInspection);
  const deployDefensiveControl = useGameStore((s) => s.deployDefensiveControl);
  const uninstallDefensiveControl = useGameStore(
    (s) => s.uninstallDefensiveControl
  );
  const toggleIsolation = useGameStore((s) => s.toggleIsolation);
  const restoreSystem = useGameStore((s) => s.restoreSystem);

  if (!rightPanelOpen) {
    return (
      <button
        type="button"
        className="panel-collapse-trigger right"
        onClick={() => setPanelState({ rightPanelOpen: true })}
        title="Expand System Inspector Panel"
      >
        <ChevronLeft size={18} />
      </button>
    );
  }

  const building =
    simState.buildings.find((b) => b.id === selectedBuildingId) ||
    simState.buildings[0];

  if (!building) return null;

  const connectedEdges = simState.connections.filter(
    (c) => c.source === building.id || c.target === building.id
  );

  const discoveredVulns = building.vulnerabilities.filter((v) => v.discovered);
  const hiddenVulnCount = building.vulnerabilities.filter(
    (v) => !v.discovered
  ).length;

  return (
    <aside className="side-panel right-panel" data-testid="right-panel">
      {/* Selected Asset Header */}
      <div className="inspector-header">
        <div className="inspector-title-row">
          <div>
            <div className="inspector-id-row">
              <span className="asset-code-badge" data-testid="selected-building-id">
                {building.id}
              </span>
              <span className={`crit-badge crit-${building.criticality.toLowerCase()}`}>
                {building.criticality}
              </span>
              <span className={`health-pill ${building.healthStatus.toLowerCase()}`}>
                {building.healthStatus}
              </span>
            </div>
            <h2 className="inspector-building-name" data-testid="selected-building-name">
              {building.name}
            </h2>
            <p className="inspector-building-role">
              {building.archetypeName} • {building.zoneName}
            </p>
          </div>
          <button
            type="button"
            className="panel-hide-btn"
            onClick={() => setPanelState({ rightPanelOpen: false })}
            title="Collapse Inspector Panel"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Primary Incident Response Action Bar */}
        <div className="inspector-action-grid">
          <button
            type="button"
            className="btn-action primary"
            onClick={() => runBuildingInspection(building.id)}
            title="Run deep asset vulnerability scan (20 CR)"
            data-testid="btn-inspect-building"
          >
            <Search size={14} />
            <span>
              Inspect Asset {hiddenVulnCount > 0 ? `(${hiddenVulnCount}?)` : '(Done)'}
            </span>
          </button>

          <button
            type="button"
            className="btn-action success"
            onClick={() => restoreSystem(building.id)}
            disabled={building.compromiseState === 'NONE'}
            title="Restore system from clean snapshot"
            data-testid="btn-restore-building"
          >
            <RotateCcw size={14} />
            <span>Restore Host</span>
          </button>

          <button
            type="button"
            className={`btn-action ${building.isolated ? 'warning' : 'secondary'}`}
            onClick={() => toggleIsolation(building.id)}
            title="Toggle Emergency Network Quarantine"
            data-testid="btn-isolate-building"
          >
            {building.isolated ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{building.isolated ? 'Reconnect' : 'Isolate Host'}</span>
          </button>

          <button
            type="button"
            className="btn-action secondary"
            onClick={() => selectBuilding(building.id, true)}
            title="Center 3D Camera on Building"
            data-testid="btn-focus-building"
          >
            <Crosshair size={14} />
            <span>Focus Cam</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="panel-tabs">
        <button
          type="button"
          className={`panel-tab ${activeRightTab === 'overview' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeRightTab: 'overview' })}
          data-testid="tab-right-overview"
        >
          <Server size={14} />
          <span>Systems ({building.services.length})</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeRightTab === 'vulns' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeRightTab: 'vulns' })}
          data-testid="tab-right-vulns"
        >
          <Bug size={14} />
          <span>Vulns ({discoveredVulns.length})</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeRightTab === 'controls' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeRightTab: 'controls' })}
          data-testid="tab-right-controls"
        >
          <Shield size={14} />
          <span>Controls ({building.installedControls.length})</span>
        </button>
        <button
          type="button"
          className={`panel-tab ${activeRightTab === 'network' ? 'active' : ''}`}
          onClick={() => setPanelState({ activeRightTab: 'network' })}
          data-testid="tab-right-network"
        >
          <Network size={14} />
          <span>Links ({connectedEdges.length})</span>
        </button>
      </div>

      <div className="panel-body">
        {/* SUB-TAB 1: OVERVIEW & LOGICAL SYSTEMS */}
        {activeRightTab === 'overview' && (
          <div className="inspector-overview">
            <div className="section-card">
              <div className="score-meter-header">
                <span>Asset Security Posture</span>
                <strong data-testid="building-security-score">
                  {building.securityScore} / 100
                </strong>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${building.securityScore}%`,
                    backgroundColor:
                      building.securityScore >= 75
                        ? '#00f0ff'
                        : building.securityScore >= 50
                        ? '#ffb800'
                        : '#ff2a55',
                  }}
                />
              </div>

              <div className="telemetry-grid">
                <div className="telemetry-cell">
                  <span className="tel-label">Compromise State</span>
                  <span
                    className={`tel-val ${
                      building.compromiseState !== 'NONE' ? 'text-danger' : 'text-cyan'
                    }`}
                    data-testid="building-compromise-state"
                  >
                    {building.compromiseState}
                  </span>
                </div>
                <div className="telemetry-cell">
                  <span className="tel-label">Detection Telemetry</span>
                  <span className="tel-val">{building.detectionState}</span>
                </div>
                <div className="telemetry-cell">
                  <span className="tel-label">Snapshot Status</span>
                  <span
                    className={`tel-val ${
                      building.snapshotClean ? 'text-green' : 'text-danger'
                    }`}
                  >
                    {building.snapshotClean ? 'VERIFIED CLEAN' : 'CORRUPTED'}
                  </span>
                </div>
                <div className="telemetry-cell">
                  <span className="tel-label">Network Access</span>
                  <span className="tel-val">
                    {building.isolated ? 'QUARANTINED' : 'CONNECTED'}
                  </span>
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="subsection-title">
                HOSTED LOGICAL SYSTEMS ({building.services.length})
              </h3>
              <p className="section-desc">{building.systemRole}</p>
              <div className="services-list">
                {building.services.map((svc) => (
                  <div key={svc.id} className="service-item">
                    <div>
                      <div className="service-name">{svc.name}</div>
                      <div className="service-proto">
                        {svc.id} • {svc.protocol}
                      </div>
                    </div>
                    <span className={`svc-status-badge ${svc.status.toLowerCase()}`}>
                      {svc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: VULNERABILITIES & WEAKNESSES */}
        {activeRightTab === 'vulns' && (
          <div className="inspector-vulns" data-testid="vulnerabilities-panel">
            {hiddenVulnCount > 0 && (
              <div className="undiscovered-banner">
                <AlertOctagon size={16} className="icon-amber shrink-0" />
                <div>
                  <strong>
                    {hiddenVulnCount} Undiscovered Weakness(es) Detected by Heuristic
                    Probe
                  </strong>
                  <p>
                    Click <em>Inspect Asset</em> above to run a full configuration
                    assessment and reveal remediation options.
                  </p>
                </div>
              </div>
            )}

            {discoveredVulns.length === 0 ? (
              <div className="empty-state-box">
                <p>
                  No vulnerabilities revealed yet on {building.name}. Run an Asset
                  Inspection to scan for weaknesses.
                </p>
              </div>
            ) : (
              discoveredVulns.map((v) => (
                <div
                  key={v.id}
                  className={`vuln-card ${v.mitigated ? 'mitigated' : 'open'}`}
                  data-testid={`vuln-card-${v.catalogId}`}
                >
                  <div className="vuln-card-header">
                    <span className="vuln-id-badge">{v.catalogId}</span>
                    <span className={`sev-badge sev-${v.severity.toLowerCase()}`}>
                      {v.severity}
                    </span>
                    <span
                      className={`vuln-status-tag ${v.status.toLowerCase()}`}
                      data-testid={`vuln-status-${v.catalogId}`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <h4 className="vuln-title">{v.name}</h4>
                  <p className="vuln-desc">{v.description}</p>
                  <div className="vuln-meta-box">
                    <div>
                      <strong>Preconditions:</strong> {v.preconditions}
                    </div>
                    <div>
                      <strong>Simulated Impact:</strong> {v.potentialImpact}
                    </div>
                    <div>
                      <strong>Remediation:</strong> {v.remediation}
                    </div>
                  </div>

                  {!v.mitigated && (
                    <div className="vuln-quick-fix-row">
                      {v.mitigatedByControls.map((ctrlId) => {
                        const ctrl = DEFENSIVE_CONTROLS[ctrlId];
                        if (!ctrl) return null;
                        const installed =
                          building.installedControls.includes(ctrlId);
                        return (
                          <button
                            key={ctrlId}
                            type="button"
                            className="btn-remediate-sm"
                            disabled={installed}
                            onClick={() =>
                              deployDefensiveControl(building.id, ctrlId)
                            }
                            data-testid={`quick-mitigate-${v.catalogId}-${ctrlId}`}
                          >
                            <ShieldCheck size={13} />
                            <span>
                              Deploy {ctrl.shortName} ({ctrl.cost} CR)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* SUB-TAB 3: DEFENSIVE CONTROLS */}
        {activeRightTab === 'controls' && (
          <div className="inspector-controls" data-testid="controls-panel">
            <div className="section-card">
              <h3 className="subsection-title">
                INSTALLED CONTROLS ({building.installedControls.length})
              </h3>
              {building.installedControls.length === 0 ? (
                <p className="section-desc">
                  No defensive controls installed on this building yet.
                </p>
              ) : (
                <div className="installed-controls-list">
                  {building.installedControls.map((ctrlId) => {
                    const ctrl = DEFENSIVE_CONTROLS[ctrlId];
                    if (!ctrl) return null;
                    return (
                      <div key={ctrlId} className="installed-ctrl-row">
                        <div>
                          <div className="ctrl-name">{ctrl.name}</div>
                          <div className="ctrl-effect">{ctrl.observableEffect}</div>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-ctrl"
                          onClick={() =>
                            uninstallDefensiveControl(building.id, ctrlId)
                          }
                          title="Remove control (50% credit refund)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="section-card">
              <h3 className="subsection-title">AVAILABLE DEFENSIVE UPGRADES</h3>
              <div className="control-catalog-list">
                {Object.values(DEFENSIVE_CONTROLS).map((ctrl) => {
                  const isInstalled = building.installedControls.includes(ctrl.id);
                  const isEligible =
                    ctrl.eligibleArchetypes === 'ALL' ||
                    ctrl.eligibleArchetypes.includes(building.archetype);
                  const missingDeps = (ctrl.dependencies || []).filter(
                    (d) => !building.installedControls.includes(d)
                  );
                  const canAfford = simState.budget >= ctrl.cost;

                  return (
                    <div
                      key={ctrl.id}
                      className={`control-upgrade-card ${
                        isInstalled ? 'installed' : !isEligible ? 'ineligible' : ''
                      }`}
                    >
                      <div className="ctrl-card-top">
                        <div>
                          <span className="ctrl-cat-tag">{ctrl.category}</span>
                          <h4 className="ctrl-card-title">{ctrl.name}</h4>
                        </div>
                        <span className="ctrl-cost-badge">{ctrl.cost} CR</span>
                      </div>
                      <p className="ctrl-card-benefits">
                        <strong>Benefit:</strong> {ctrl.benefits}
                      </p>
                      <p className="ctrl-card-limits">
                        <strong>Trade-off:</strong> {ctrl.limitations}
                      </p>

                      {missingDeps.length > 0 && (
                        <div className="ctrl-dep-warning">
                          Requires:{' '}
                          {missingDeps
                            .map((d) => DEFENSIVE_CONTROLS[d]?.shortName || d)
                            .join(', ')}
                        </div>
                      )}

                      <button
                        type="button"
                        className={`btn-deploy-ctrl ${
                          isInstalled ? 'done' : ''
                        }`}
                        disabled={
                          isInstalled ||
                          !isEligible ||
                          missingDeps.length > 0 ||
                          !canAfford
                        }
                        onClick={() =>
                          deployDefensiveControl(building.id, ctrl.id)
                        }
                        data-testid={`deploy-control-${ctrl.id}`}
                      >
                        {isInstalled ? (
                          <>
                            <Check size={14} /> Installed
                          </>
                        ) : !isEligible ? (
                          'Incompatible Asset Type'
                        ) : missingDeps.length > 0 ? (
                          'Dependency Required'
                        ) : !canAfford ? (
                          'Insufficient Budget'
                        ) : (
                          <>
                            <ShieldAlert size={14} /> Deploy {ctrl.shortName}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: NETWORK CONNECTIONS */}
        {activeRightTab === 'network' && (
          <div className="inspector-network">
            <div className="section-card">
              <h3 className="subsection-title">
                ACTIVE GRAPH EDGES ({connectedEdges.length})
              </h3>
              <div className="connections-list">
                {connectedEdges.map((edge) => {
                  const peerId =
                    edge.source === building.id ? edge.target : edge.source;
                  const peer = simState.buildings.find((b) => b.id === peerId);

                  return (
                    <div key={edge.id} className="connection-card">
                      <div className="conn-header">
                        <button
                          type="button"
                          className="conn-peer-link"
                          onClick={() => selectBuilding(peerId, true)}
                        >
                          {peer ? `${peer.name} (${peer.id})` : peerId}
                        </button>
                        <span
                          className={`traffic-state-badge state-${edge.trafficState.toLowerCase()}`}
                        >
                          {edge.trafficState}
                        </span>
                      </div>
                      <div className="conn-meta-grid">
                        <span>Type: {edge.connectionType}</span>
                        <span>Trust: {edge.trustRelationship}</span>
                        <span>Latency: {edge.latencyMs}ms</span>
                        <span>Capacity: {edge.bandwidthGbps} Gbps</span>
                      </div>
                      <div className="conn-protocols">
                        Allowed Traffic: {edge.allowedTrafficCategories.join(', ')}
                      </div>
                      <div className="conn-boundary">
                        Boundary: {edge.securityBoundary}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
