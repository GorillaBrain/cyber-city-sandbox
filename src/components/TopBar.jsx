import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Shield,
  Activity,
  AlertTriangle,
  Coins,
  Award,
  Network,
  Bug,
  Eye,
  Compass,
  Volume2,
  VolumeX,
  Download,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import { SCENARIO_LIST } from '../engine/scenarios.js';
import { formatSimTimestamp } from '../engine/simulationEngine.js';

export default function TopBar() {
  const simState = useGameStore((s) => s.simState);
  const overlays = useGameStore((s) => s.overlays);
  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const togglePlayPause = useGameStore((s) => s.togglePlayPause);
  const setSimSpeed = useGameStore((s) => s.setSimSpeed);
  const stepForward = useGameStore((s) => s.stepForward);
  const resetCurrentScenario = useGameStore((s) => s.resetCurrentScenario);
  const loadScenario = useGameStore((s) => s.loadScenario);
  const toggleOverlay = useGameStore((s) => s.toggleOverlay);
  const resetCamera = useGameStore((s) => s.resetCamera);
  const toggleAudio = useGameStore((s) => s.toggleAudio);
  const setPanelState = useGameStore((s) => s.setPanelState);

  const metrics = simState.metrics || {};

  return (
    <header className="topbar" data-testid="topbar">
      {/* Brand Identity */}
      <div className="topbar-brand">
        <div className="brand-logo-badge">
          <Shield size={18} className="icon-cyan" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-title">CYBER CITY SANDBOX</h1>
            <span className={`mode-pill ${simState.mode}`}>
              {simState.mode === 'sandbox' ? 'SANDBOX' : 'CAMPAIGN'}
            </span>
          </div>
          <p className="brand-subtitle">
            A living city. A connected network. Your security, your rules.
          </p>
        </div>
      </div>

      {/* Scenario Selector & Simulation Playback Controls */}
      <div className="topbar-sim-controls">
        <select
          aria-label="Select Scenario"
          className="scenario-select"
          value={simState.scenarioId}
          onChange={(e) => loadScenario(e.target.value)}
        >
          {SCENARIO_LIST.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.code}: {sc.shortTitle} ({sc.difficulty})
            </option>
          ))}
        </select>

        <div className="sim-transport-group">
          <button
            type="button"
            className={`btn-transport ${simState.running ? 'active-play' : ''}`}
            onClick={togglePlayPause}
            title={simState.running ? 'Pause Simulation' : 'Play Simulation'}
            data-testid="btn-play-pause"
          >
            {simState.running ? <Pause size={15} /> : <Play size={15} />}
            <span>{simState.running ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            type="button"
            className="btn-transport"
            onClick={() => stepForward(1)}
            disabled={simState.running}
            title="Step Forward 1 Tick (+15s)"
            data-testid="btn-step-forward"
          >
            <SkipForward size={15} />
            <span>STEP</span>
          </button>

          <div className="speed-selector" role="group" aria-label="Simulation Speed">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`btn-speed ${simState.speed === spd ? 'active' : ''}`}
                onClick={() => setSimSpeed(spd)}
                data-testid={`btn-speed-${spd}x`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-transport"
            onClick={resetCurrentScenario}
            title="Reset Scenario to T+00:00"
            data-testid="btn-reset-scenario"
          >
            <RotateCcw size={14} />
          </button>

          <div className="sim-clock" data-testid="sim-clock">
            <span className="clock-time">{formatSimTimestamp(simState.tick)}</span>
            <span className="clock-tick">TICK #{simState.tick}</span>
          </div>
        </div>
      </div>

      {/* Live Derived Telemetry KPIs */}
      <div className="topbar-kpis">
        <div className="kpi-chip" title="Overall City Security Score">
          <Shield size={14} className="icon-cyan" />
          <div>
            <span className="kpi-label">SECURITY</span>
            <span className="kpi-value" data-testid="kpi-security-score">
              {metrics.citySecurityScore ?? 70}%
            </span>
          </div>
        </div>

        <div className="kpi-chip" title="City-Wide Service Availability">
          <Activity size={14} className="icon-green" />
          <div>
            <span className="kpi-label">UPTIME</span>
            <span className="kpi-value" data-testid="kpi-availability">
              {metrics.serviceAvailability ?? 100}%
            </span>
          </div>
        </div>

        <div className="kpi-chip" title="Active Compromised or Affected Buildings">
          <AlertTriangle
            size={14}
            className={
              (metrics.activeIncidents || 0) > 0 ? 'icon-danger' : 'icon-muted'
            }
          />
          <div>
            <span className="kpi-label">INCIDENTS</span>
            <span
              className={`kpi-value ${
                (metrics.activeIncidents || 0) > 0 ? 'text-danger' : ''
              }`}
              data-testid="kpi-incidents"
            >
              {metrics.activeIncidents ?? 0}
            </span>
          </div>
        </div>

        <div className="kpi-chip" title="Available Defense Budget (Credits)">
          <Coins size={14} className="icon-amber" />
          <div>
            <span className="kpi-label">BUDGET</span>
            <span className="kpi-value text-amber" data-testid="kpi-budget">
              {simState.budget} CR
            </span>
          </div>
        </div>

        <div
          className="kpi-chip rank-chip"
          title={`Analyst Rank ${simState.progression?.rank}: ${simState.progression?.rankTitle}`}
        >
          <Award size={14} className="icon-violet" />
          <div>
            <span className="kpi-label">
              RANK {simState.progression?.rank || 1}
            </span>
            <span className="kpi-value" data-testid="kpi-xp">
              {simState.progression?.xp || 0} XP
            </span>
          </div>
        </div>
      </div>

      {/* 3D Overlay & Utility Buttons */}
      <div className="topbar-actions">
        <button
          type="button"
          className={`btn-icon-toggle ${overlays.network ? 'active' : ''}`}
          onClick={() => toggleOverlay('network')}
          title="Toggle Network Topology Overlay"
          data-testid="toggle-overlay-network"
        >
          <Network size={15} />
          <span>Net</span>
        </button>

        <button
          type="button"
          className={`btn-icon-toggle ${overlays.threats ? 'active' : ''}`}
          onClick={() => toggleOverlay('threats')}
          title="Toggle Threat & Compromise Overlay"
          data-testid="toggle-overlay-threats"
        >
          <AlertTriangle size={15} />
          <span>Threats</span>
        </button>

        <button
          type="button"
          className={`btn-icon-toggle ${overlays.vulnerabilities ? 'active' : ''}`}
          onClick={() => toggleOverlay('vulnerabilities')}
          title="Toggle Discovered Vulnerability Badges"
          data-testid="toggle-overlay-vulns"
        >
          <Bug size={15} />
          <span>Vulns</span>
        </button>

        <button
          type="button"
          className={`btn-icon-toggle ${overlays.controls ? 'active' : ''}`}
          onClick={() => toggleOverlay('controls')}
          title="Toggle Installed Security Controls Overlay"
          data-testid="toggle-overlay-controls"
        >
          <Eye size={15} />
          <span>Ctrls</span>
        </button>

        <button
          type="button"
          className="btn-icon-only"
          onClick={resetCamera}
          title="Reset 3D Camera View"
          data-testid="btn-reset-camera"
        >
          <Compass size={16} />
        </button>

        <button
          type="button"
          className={`btn-icon-only ${audioEnabled ? 'active' : ''}`}
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute Synth Audio' : 'Enable Synth Audio'}
          data-testid="btn-toggle-audio"
        >
          {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          type="button"
          className="btn-icon-only"
          onClick={() => setPanelState({ activeModal: 'save_export' })}
          title="Save / Export / Import City State"
          data-testid="btn-open-save-modal"
        >
          <Download size={16} />
        </button>

        <button
          type="button"
          className="btn-icon-only"
          onClick={() => setPanelState({ activeModal: 'settings' })}
          title="Graphics & Performance Settings"
          data-testid="btn-open-settings"
        >
          <Sliders size={16} />
        </button>

        <button
          type="button"
          className="btn-icon-only"
          onClick={() => setPanelState({ showTutorial: true })}
          title="Open Tactical Guide & Legend"
          data-testid="btn-open-tutorial"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}
