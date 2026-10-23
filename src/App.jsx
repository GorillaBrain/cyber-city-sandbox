import React, { useEffect } from 'react';
import TopBar from './components/TopBar.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import RightPanel from './components/RightPanel.jsx';
import BottomPanel from './components/BottomPanel.jsx';
import CityScene3D from './components/CityScene3D.jsx';
import Modals from './components/Modals.jsx';
import { useGameStore } from './store/useGameStore.js';

export default function App() {
  const running = useGameStore((s) => s.simState.running);
  const speed = useGameStore((s) => s.simState.speed);
  const stepForward = useGameStore((s) => s.stepForward);
  const lastActionFeedback = useGameStore((s) => s.lastActionFeedback);
  const activePropagationHighlight = useGameStore(
    (s) => s.simState.activePropagationHighlight
  );
  const selectBuilding = useGameStore((s) => s.selectBuilding);

  // Controlled deterministic simulation loop
  useEffect(() => {
    if (!running) return undefined;
    const intervalMs = Math.max(450, Math.floor(2200 / (speed || 1)));
    const timer = setInterval(() => {
      stepForward(1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [running, speed, stepForward]);

  return (
    <div className="app-shell">
      <TopBar />

      <main className="workspace-main">
        <LeftPanel />

        <div className="viewport-area">
          <CityScene3D />

          {/* Floating Toast Feedback */}
          {lastActionFeedback && (
            <div
              key={lastActionFeedback.id}
              className={`floating-toast toast-${lastActionFeedback.type}`}
              data-testid="action-feedback-toast"
            >
              {lastActionFeedback.message}
            </div>
          )}

          {/* Floating Propagation Banner in Viewport */}
          {activePropagationHighlight && (
            <div
              className={`viewport-propagation-banner ${activePropagationHighlight.outcome.toLowerCase()}`}
              data-testid="viewport-propagation-banner"
            >
              <div className="vp-prop-title">
                <span>
                  {activePropagationHighlight.outcome === 'BLOCKED'
                    ? '🛡️ ATTACK INTERCEPTED'
                    : '⚠️ LATERAL PROPAGATION'}
                </span>
                <button
                  type="button"
                  className="vp-route-btn"
                  onClick={() =>
                    selectBuilding(activePropagationHighlight.targetId, true)
                  }
                >
                  {activePropagationHighlight.sourceId} →{' '}
                  {activePropagationHighlight.targetId}
                </button>
              </div>
              <div className="vp-prop-desc">
                {activePropagationHighlight.explanation}
              </div>
            </div>
          )}

          {/* Compact Floating Legend */}
          <div className="viewport-legend" aria-label="Network Status Legend">
            <span>
              <i className="dot cyan" /> Healthy / Normal
            </span>
            <span>
              <i className="dot amber" /> Vuln / Suspicious
            </span>
            <span>
              <i className="dot red" /> Compromised / Blocked
            </span>
            <span>
              <i className="dot violet" /> Monitored
            </span>
            <span>
              <i className="dot slate" /> Isolated
            </span>
          </div>
        </div>

        <RightPanel />
      </main>

      <BottomPanel />
      <Modals />
    </div>
  );
}
