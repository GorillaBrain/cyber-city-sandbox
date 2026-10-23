import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App.jsx';
import { useGameStore } from '../../store/useGameStore.js';
import { createSimulationState } from '../../engine/simulationEngine.js';

describe('Cyber City Sandbox — UI & Interactive Console Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    const fresh = createSimulationState({
      mode: 'campaign',
      scenarioId: 'SCENARIO_A_SMART_HOME',
    });
    useGameStore.setState({
      simState: fresh,
      selectedBuildingId: 'BLD-RES-01',
      showTutorial: true,
      activeModal: null,
      activeLeftTab: 'mission',
      activeRightTab: 'overview',
      activeBottomTab: 'events',
    });
  });

  it('renders the topbar, tutorial modal, and allows dismissing the tutorial', () => {
    render(<App />);
    expect(screen.getByText('CYBER CITY SANDBOX')).toBeInTheDocument();
    expect(screen.getByTestId('tutorial-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-start-playing'));
    expect(screen.queryByTestId('tutorial-modal')).not.toBeInTheDocument();
  });

  it('allows inspecting a building, discovering vulnerabilities, installing controls, stepping simulation, and completing Mission 1', () => {
    useGameStore.setState({ showTutorial: false });
    render(<App />);

    // Verify Kowloon Hab-Block 01 (BLD-RES-01) is selected
    expect(screen.getByTestId('selected-building-id')).toHaveTextContent('BLD-RES-01');
    expect(screen.getByTestId('selected-building-name')).toHaveTextContent(
      'Kowloon Hab-Block 01'
    );

    // Inspect BLD-RES-01
    fireEvent.click(screen.getByTestId('btn-inspect-building'));

    // Switch to Vulns tab and confirm SIM-VULN-001 and SIM-VULN-002 are discovered
    fireEvent.click(screen.getByTestId('tab-right-vulns'));
    expect(screen.getByTestId('vuln-card-SIM-VULN-001')).toBeInTheDocument();
    expect(screen.getByTestId('vuln-card-SIM-VULN-002')).toBeInTheDocument();

    // Deploy segmentation via quick-mitigate button
    fireEvent.click(
      screen.getByTestId('quick-mitigate-SIM-VULN-002-segmentation')
    );
    expect(screen.getByTestId('vuln-status-SIM-VULN-002')).toHaveTextContent(
      'MITIGATED'
    );

    // Step simulation forward 2 ticks and verify propagation is blocked
    fireEvent.click(screen.getByTestId('btn-step-forward'));
    fireEvent.click(screen.getByTestId('btn-step-forward'));
    expect(screen.getByTestId('sim-clock')).toHaveTextContent('TICK #2');

    // Restore BLD-RES-01 to complete Mission 1
    fireEvent.click(screen.getByTestId('btn-restore-building'));
    expect(screen.getByTestId('mission-status-badge')).toHaveTextContent(
      'COMPLETED'
    );
  });

  it('allows browsing assets, toggling zone policies, and generating a deterministic sandbox city', () => {
    useGameStore.setState({ showTutorial: false });
    render(<App />);

    // Switch to Assets tab and select Hyper-DC Core Vault (BLD-DC-01)
    fireEvent.click(screen.getByTestId('tab-left-assets'));
    fireEvent.click(screen.getByTestId('asset-item-BLD-DC-01'));
    expect(screen.getByTestId('selected-building-id')).toHaveTextContent('BLD-DC-01');

    // Switch to Sandbox tab and generate a Medium city
    fireEvent.click(screen.getByTestId('tab-left-sandbox'));
    fireEvent.change(screen.getByTestId('sandbox-size-select'), {
      target: { value: 'medium' },
    });
    fireEvent.click(screen.getByTestId('btn-generate-sandbox'));

    expect(useGameStore.getState().simState.size).toBe('medium');
    expect(useGameStore.getState().simState.buildings.length).toBe(18);
  });
});
