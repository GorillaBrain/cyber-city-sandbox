import React, { useState } from 'react';
import {
  Terminal,
  GitBranch,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore.js';
import { SCENARIOS } from '../engine/scenarios.js';
import { ACHIEVEMENT_BADGES } from '../engine/catalog.js';

export default function BottomPanel() {
  const simState = useGameStore((s) => s.simState);
  const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
  const selectedEventId = useGameStore((s) => s.selectedEventId);
  const bottomPanelOpen = useGameStore((s) => s.bottomPanelOpen);
  const activeBottomTab = useGameStore((s) => s.activeBottomTab);
  const setPanelState = useGameStore((s) => s.setPanelState);
  const selectEvent = useGameStore((s) => s.selectEvent);
  const selectBuilding = useGameStore((s) => s.selectBuilding);

  const [filterBySelectedBuilding, setFilterBySelectedBuilding] = useState(false);

  if (!bottomPanelOpen) {
    return (
      <div className="bottom-collapsed-bar">
        <button
          type="button"
          className="btn-expand-bottom"
          onClick={() => setPanelState({ bottomPanelOpen: true })}
        >
          <ChevronUp size={15} />
          <span>
            Open Security Operations Console ({simState.events.length} Events)
          </span>
        </button>
      </div>
    );
  }

  const events = filterBySelectedBuilding
    ? simState.events.filter((e) =>
        (e.relatedNodeIds || []).includes(selectedBuildingId)
      )
    : simState.events;

  const scenario =
    SCENARIOS[simState.scenarioId] || SCENARIOS.SCENARIO_A_SMART_HOME;
  const highlight = simState.activePropagationHighlight;
  const metrics = simState.metrics || {};
  const scoreBreakdown = simState.scoreBreakdown || {
    totalScore: 70,
    grade: 'B',
    components: [],
  };

  return (
    <section className="bottom-panel" data-testid="bottom-panel">
      <div className="bottom-header">
        <div className="bottom-tabs">
          <button
            type="button"
            className={`panel-tab ${activeBottomTab === 'events' ? 'active' : ''}`}
            onClick={() => setPanelState({ activeBottomTab: 'events' })}
            data-testid="tab-bottom-events"
          >
            <Terminal size={14} />
            <span>SIEM Event Stream ({events.length})</span>
          </button>

          <button
            type="button"
            className={`panel-tab ${
              activeBottomTab === 'propagation' ? 'active' : ''
            }`}
            onClick={() => setPanelState({ activeBottomTab: 'propagation' })}
            data-testid="tab-bottom-propagation"
          >
            <GitBranch size={14} />
            <span>
              Propagation & Interception{' '}
              {simState.blockedAttempts > 0
                ? `(${simState.blockedAttempts} Blocked)`
                : ''}
            </span>
          </button>

          <button
            type="button"
            className={`panel-tab ${activeBottomTab === 'score' ? 'active' : ''}`}
            onClick={() => setPanelState({ activeBottomTab: 'score' })}
            data-testid="tab-bottom-score"
          >
            <BarChart3 size={14} />
            <span>
              Security Overview & Score ({scoreBreakdown.grade} •{' '}
              {scoreBreakdown.totalScore}/100)
            </span>
          </button>
        </div>

        <div className="bottom-controls-right">
          {activeBottomTab === 'events' && (
            <button
              type="button"
              className={`btn-filter-building ${
                filterBySelectedBuilding ? 'active' : ''
              }`}
              onClick={() =>
                setFilterBySelectedBuilding(!filterBySelectedBuilding)
              }
              data-testid="btn-filter-events-building"
            >
              <Filter size={13} />
              <span>
                {filterBySelectedBuilding
                  ? `Filtered: ${selectedBuildingId}`
                  : `Filter by ${selectedBuildingId}`}
              </span>
            </button>
          )}
          <button
            type="button"
            className="panel-hide-btn"
            onClick={() => setPanelState({ bottomPanelOpen: false })}
            title="Minimize Security Console"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      <div className="bottom-body">
        {/* TAB 1: SIEM EVENT STREAM */}
        {activeBottomTab === 'events' && (
          <div className="event-feed-table" data-testid="event-feed-list">
            {events.length === 0 ? (
              <div className="empty-events">
                No telemetry events matching current filter. Advance the
                simulation or inspect an asset.
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => selectEvent(evt)}
                  className={`event-row ${
                    selectedEventId === evt.id ? 'selected' : ''
                  } sev-row-${evt.severity.toLowerCase()}`}
                  data-testid={`event-row-${evt.id}`}
                >
                  <span className="evt-time">{evt.timestamp}</span>
                  <span className={`evt-sev-badge sev-${evt.severity.toLowerCase()}`}>
                    {evt.severity}
                  </span>
                  <span className="evt-type-badge">{evt.type}</span>
                  <span className="evt-nodes">
                    {evt.sourceId || 'CITY'}
                    {evt.targetId ? ` → ${evt.targetId}` : ''}
                  </span>
                  <span className="evt-desc">{evt.description}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: PROPAGATION & INTERCEPTION INSPECTOR */}
        {activeBottomTab === 'propagation' && (
          <div className="propagation-inspector-grid">
            <div className="prop-card">
              <h4 className="subsection-title">
                LATEST TRANSITION EVALUATION
              </h4>
              {!highlight ? (
                <p className="section-desc">
                  Press <strong>PLAY</strong> or <strong>STEP</strong> in the top
                  bar to advance the simulation clock and observe attack
                  propagation and defensive interception in real time.
                </p>
              ) : (
                <div
                  className={`prop-highlight-box ${highlight.outcome.toLowerCase()}`}
                >
                  <div className="prop-outcome-row">
                    {highlight.outcome === 'BLOCKED' ? (
                      <span className="prop-badge blocked">
                        <ShieldCheck size={14} /> PROPAGATION INTERCEPTED
                      </span>
                    ) : (
                      <span className="prop-badge allowed">
                        <AlertTriangle size={14} /> COMPROMISE PROPAGATED
                      </span>
                    )}
                    <span className="prop-tick">Tick #{highlight.tick}</span>
                  </div>
                  <div className="prop-route">
                    <button
                      type="button"
                      className="link-node-btn"
                      onClick={() => selectBuilding(highlight.sourceId, true)}
                    >
                      {highlight.sourceId}
                    </button>
                    <span> ➔ </span>
                    <button
                      type="button"
                      className="link-node-btn"
                      onClick={() => selectBuilding(highlight.targetId, true)}
                    >
                      {highlight.targetId}
                    </button>
                    <span className="prop-vector-tag">
                      Vector: {highlight.vector} ({highlight.requiredVuln})
                    </span>
                  </div>
                  <p className="prop-explanation">{highlight.explanation}</p>
                </div>
              )}
            </div>

            <div className="prop-card">
              <h4 className="subsection-title">
                SCENARIO ATTACK TIMELINE & PRECONDITIONS
              </h4>
              <div className="prop-steps-list">
                {(scenario.propagationSteps || []).map((st, idx) => (
                  <div
                    key={idx}
                    className={`prop-step-item ${
                      simState.tick >= st.tick ? 'reached' : ''
                    }`}
                  >
                    <span className="prop-step-tick">Tick #{st.tick}</span>
                    <span className="prop-step-route">
                      {st.sourceId} → {st.targetId}
                    </span>
                    <span className="prop-step-vuln">{st.requiredVuln}</span>
                    <span className="prop-step-desc">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY OVERVIEW, SCORE BREAKDOWN & ACHIEVEMENTS */}
        {activeBottomTab === 'score' && (
          <div className="score-overview-grid" data-testid="score-panel">
            <div className="derived-metrics-panel">
              <h4 className="subsection-title">DERIVED TELEMETRY METRICS</h4>
              <div className="derived-grid">
                <div className="derived-box">
                  <span>Total Assets / Logical Systems</span>
                  <strong>
                    {metrics.totalAssets} Bldgs / {metrics.totalLogicalSystems}{' '}
                    Sys
                  </strong>
                </div>
                <div className="derived-box">
                  <span>Discovered / Total Vulns</span>
                  <strong>
                    {metrics.discoveredVulnerabilities} /{' '}
                    {metrics.totalVulnerabilities}
                  </strong>
                </div>
                <div className="derived-box">
                  <span>Mitigated Vulnerabilities</span>
                  <strong className="text-green">
                    {metrics.mitigatedVulnerabilities} /{' '}
                    {metrics.totalVulnerabilities}
                  </strong>
                </div>
                <div className="derived-box">
                  <span>Protected Critical Assets</span>
                  <strong className="text-cyan">
                    {metrics.protectedCriticalSystems} /{' '}
                    {metrics.totalCriticalSystems}
                  </strong>
                </div>
                <div className="derived-box">
                  <span>Blocked Attack Attempts</span>
                  <strong className="text-cyan">
                    {metrics.blockedPropagationAttempts}
                  </strong>
                </div>
                <div className="derived-box">
                  <span>Defensive Control Coverage</span>
                  <strong>{metrics.controlCoverage}%</strong>
                </div>
              </div>
            </div>

            <div className="score-rubric-panel">
              <h4 className="subsection-title">
                SCORING RUBRIC BREAKDOWN (GRADE {scoreBreakdown.grade} •{' '}
                {scoreBreakdown.totalScore}/100)
              </h4>
              <div className="rubric-list">
                {scoreBreakdown.components.map((comp) => (
                  <div key={comp.key} className="rubric-item">
                    <div className="rubric-top">
                      <strong>{comp.label}</strong>
                      <span className="rubric-score">{comp.score}/100</span>
                    </div>
                    <div className="rubric-sub">{comp.explanation}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="badges-panel">
              <h4 className="subsection-title">
                ANALYST BADGES (
                {(simState.progression?.unlockedBadges || []).length}/
                {ACHIEVEMENT_BADGES.length})
              </h4>
              <div className="badges-list">
                {ACHIEVEMENT_BADGES.map((badge) => {
                  const unlocked = (
                    simState.progression?.unlockedBadges || []
                  ).includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`badge-item ${unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <Award size={14} />
                      <div>
                        <div className="badge-name">{badge.name}</div>
                        <div className="badge-desc">{badge.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
