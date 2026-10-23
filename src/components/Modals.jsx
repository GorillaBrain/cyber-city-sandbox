import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Sliders,
  Shield,
  Compass,
  Network,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';

export default function Modals() {
  const showTutorial = useGameStore((s) => s.showTutorial);
  const activeModal = useGameStore((s) => s.activeModal);
  const graphics = useGameStore((s) => s.graphics);
  const closeTutorial = useGameStore((s) => s.closeTutorial);
  const setPanelState = useGameStore((s) => s.setPanelState);
  const toggleGraphicSetting = useGameStore((s) => s.toggleGraphicSetting);
  const exportCitySaveString = useGameStore((s) => s.exportCitySaveString);
  const importCitySaveString = useGameStore((s) => s.importCitySaveString);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);

  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleDownloadJson = () => {
    const json = exportCitySaveString();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyber-city-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    const res = importCitySaveString(importText);
    if (res.valid) {
      setImportText('');
      setPanelState({ activeModal: null });
    }
  };

  return (
    <>
      {/* 1. FIRST-RUN TUTORIAL & TACTICAL LEGEND MODAL */}
      {showTutorial && (
        <div className="modal-backdrop" data-testid="tutorial-modal">
          <div className="modal-card wide">
            <div className="modal-header">
              <div className="modal-title-group">
                <Shield size={20} className="icon-cyan" />
                <h2>WELCOME TO CYBER CITY SANDBOX</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={closeTutorial}
                aria-label="Close Tutorial"
                data-testid="btn-close-tutorial"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-lead">
                Every skyscraper in <strong>Neo-Veridia</strong> is a live
                computer system or network segment. Your mission is to inspect
                the city&apos;s digital infrastructure, uncover vulnerabilities,
                deploy defensive controls, intercept attack propagation, and
                restore affected services.
              </p>

              <div className="tutorial-steps-grid">
                <div className="tutorial-step-box">
                  <div className="tut-icon-row">
                    <Compass size={16} className="icon-cyan" />
                    <strong>1. Navigate & Inspect</strong>
                  </div>
                  <p>
                    Drag to <strong>Orbit</strong>, right-drag to{' '}
                    <strong>Pan</strong>, and scroll to <strong>Zoom</strong>.
                    Click any building (or double-click to focus) and press{' '}
                    <strong>Inspect Asset</strong> in the right panel to uncover
                    hidden weaknesses (<code>SIM-VULN-*</code>).
                  </p>
                </div>

                <div className="tutorial-step-box">
                  <div className="tut-icon-row">
                    <Network size={16} className="icon-violet" />
                    <strong>2. Trace Network Topology</strong>
                  </div>
                  <p>
                    Glowing fiber links show real communication paths. Use the{' '}
                    <strong>Zones</strong> tab on the left to lock down unsafe
                    inter-zone bridges while keeping legitimate dependencies
                    online.
                  </p>
                </div>

                <div className="tutorial-step-box">
                  <div className="tut-icon-row">
                    <Wrench size={16} className="icon-amber" />
                    <strong>3. Deploy Defenses & Simulate</strong>
                  </div>
                  <p>
                    Install <strong>Firewalls</strong>,{' '}
                    <strong>Segmentation</strong>, <strong>MFA</strong>,{' '}
                    <strong>Patch Management</strong>, <strong>EDR</strong>, and{' '}
                    <strong>Immutable Backups</strong>. Use{' '}
                    <strong>PLAY / STEP</strong> in the top bar to watch how your
                    defenses block propagation!
                  </p>
                </div>

                <div className="tutorial-step-box">
                  <div className="tut-icon-row">
                    <CheckCircle2 size={16} className="icon-green" />
                    <strong>4. Restore & Complete Missions</strong>
                  </div>
                  <p>
                    Once a building is protected, click{' '}
                    <strong>Restore Host</strong> to recover from a clean
                    snapshot. Avoid isolating healthy critical infrastructure so
                    city service uptime stays above 85%.
                  </p>
                </div>
              </div>

              <div className="legend-strip-card">
                <h4>COLOR & TELEMETRY LEGEND</h4>
                <div className="legend-items-row">
                  <span className="legend-pill">
                    <i className="dot cyan" /> Normal Traffic / Healthy Node
                  </span>
                  <span className="legend-pill">
                    <i className="dot violet" /> Monitoring / SIEM Telemetry
                  </span>
                  <span className="legend-pill">
                    <i className="dot amber" /> Discovered Vuln / Suspicious Flow
                  </span>
                  <span className="legend-pill">
                    <i className="dot red" /> Compromised / Blocked Boundary
                  </span>
                  <span className="legend-pill">
                    <i className="dot slate" /> Quarantined / Isolated Host
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary-lg"
                onClick={closeTutorial}
                data-testid="btn-start-playing"
              >
                Enter Security Operations Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SAVE / EXPORT / IMPORT MODAL */}
      {activeModal === 'save_export' && (
        <div className="modal-backdrop" data-testid="save-export-modal">
          <div className="modal-card">
            <div className="modal-header">
              <h2>SAVE, EXPORT & IMPORT CONFIGURATION</h2>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setPanelState({ activeModal: null })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="section-desc">
                Progress is saved automatically to local storage. You can also
                export a validated JSON snapshot or import a saved city state.
              </p>

              <div className="save-actions-row">
                <button
                  type="button"
                  className="btn-action primary"
                  onClick={handleDownloadJson}
                  data-testid="btn-download-json"
                >
                  <Download size={15} />
                  <span>Download Save (.JSON)</span>
                </button>

                <button
                  type="button"
                  className="btn-action secondary"
                  onClick={() => setImportText(exportCitySaveString())}
                  data-testid="btn-populate-export-json"
                >
                  <span>Load Current JSON into Editor</span>
                </button>
              </div>

              <label className="form-label" style={{ marginTop: '12px' }}>
                Validated JSON Payload (Schema v1)
                <textarea
                  rows={6}
                  className="form-textarea"
                  placeholder="Paste exported Cyber City Sandbox JSON here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  data-testid="import-json-textarea"
                />
              </label>

              <div className="save-actions-row">
                <button
                  type="button"
                  className="btn-action success"
                  disabled={!importText.trim()}
                  onClick={handleImportSubmit}
                  data-testid="btn-import-json-submit"
                >
                  <Upload size={15} />
                  <span>Validate & Import JSON</span>
                </button>

                {!confirmReset ? (
                  <button
                    type="button"
                    className="btn-action danger"
                    onClick={() => setConfirmReset(true)}
                  >
                    <Trash2 size={15} />
                    <span>Reset All Progress</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-action danger"
                    onClick={() => {
                      resetAllProgress();
                      setConfirmReset(false);
                      setPanelState({ activeModal: null });
                    }}
                    data-testid="btn-confirm-reset-all"
                  >
                    <span>Confirm Full Wipe?</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. GRAPHICS & PERFORMANCE SETTINGS MODAL */}
      {activeModal === 'settings' && (
        <div className="modal-backdrop" data-testid="settings-modal">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title-group">
                <Sliders size={18} className="icon-cyan" />
                <h2>PERFORMANCE & GRAPHICS SETTINGS</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setPanelState({ activeModal: null })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="section-desc">
                Adjust 3D rendering effects for optimal frame rate on your
                device. Simulation rules remain 100% deterministic regardless of
                visual settings.
              </p>

              <div className="settings-toggle-list">
                {[
                  {
                    key: 'bloom',
                    label: 'High-Intensity Emissive Neon & Lighting',
                    desc: 'Enhances neon signage and window glow across the nighttime diorama.',
                  },
                  {
                    key: 'particles',
                    label: 'Animated Network Packet Pulses',
                    desc: 'Animates live traffic spheres along fiber links.',
                  },
                  {
                    key: 'flyingTraffic',
                    label: 'Flying Hover-Vehicles & Street Traffic',
                    desc: 'Renders ambient cyberpunk air spinners and street cars.',
                  },
                  {
                    key: 'shadows',
                    label: 'Dynamic Directional Shadows',
                    desc: 'Enables real-time shadow casting between skyscrapers.',
                  },
                ].map((item) => (
                  <div key={item.key} className="setting-row">
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      className={`btn-policy-toggle ${
                        graphics[item.key] ? 'permit' : 'deny'
                      }`}
                      onClick={() => toggleGraphicSetting(item.key)}
                    >
                      {graphics[item.key] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
