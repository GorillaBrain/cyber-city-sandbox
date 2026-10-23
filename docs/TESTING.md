# Testing Guide — Cyber City Sandbox

The test suite uses **Vitest** (`jsdom` environment) and **React Testing Library**. All core simulation tests run independently of WebGL/Three.js.

## 1. Running Tests

```bash
# Run all unit and integration tests once
npm test

# Run Vitest in interactive watch mode
npm run test:watch
```

## 2. Test Coverage Matrix

### Simulation Engine Suite (`src/engine/__tests__/simulation.test.js`)
1. **Deterministic Generation & Stable IDs**: Verifies that identical seeds produce identical building coordinates, IDs, and graph edges, while different seeds diverge.
2. **City Scale Verification**: Confirms Small (20–30), Medium (50–80), and Large (100–150) logical system counts.
3. **Segmented Graph Topology**: Confirms the generator produces segmented zone conduits rather than an all-to-all mesh (e.g., no direct Residential-to-Factory link).
4. **Vulnerability Discovery vs. Mitigation**: Verifies `inspectBuilding` reveals hidden `SIM-VULN-*` items without automatically fixing them.
5. **Control Dependencies & Lifecycle**: Verifies `ids` requires `net_monitoring`, `patch_mgmt` mitigates software flaws, and removing a control reverts mitigation.
6. **Integration Flow 1 — Vulnerable Gateway (Scenario A)**: Confirms compromise spreads when unprotected and is intercepted when `segmentation` and `mfa` are deployed, followed by snapshot restoration and mission completion.
7. **Integration Flow 2 — Critical Infrastructure & OT Boundary (Scenario E)**: Confirms disabling unsafe `CORPORATE_USERS->INDUSTRIAL_CRITICAL` policy protects `BLD-FAC-01`, `BLD-POW-01`, and `BLD-HOS-01`.
8. **Integration Flow 3 — Simulation Controls & Availability**: Verifies pause behavior, deterministic `1x`/`2x` stepping, and availability penalties from indiscriminate isolation.
9. **Save, Restore & Malformed Import Rejection**: Verifies `localStorage` persistence, schema version validation, and rejection of corrupted JSON imports.
10. **Ransomware Snapshot Tampering (Scenario C)**: Verifies that corrupted snapshots block restoration until `backup_recovery` is deployed.
11. **Progression & Anti-Farming**: Verifies one-time mission completion XP bonuses are not granted repeatedly on replay.

### User Interface Integration Suite (`src/components/__tests__/App.test.jsx`)
1. **Tutorial & TopBar Rendering**: Verifies initial rendering and dismissing the onboarding modal.
2. **End-to-End Mission 1 UI Playthrough**: Simulates clicking **Inspect Asset**, viewing `SIM-VULN-001` & `SIM-VULN-002`, deploying **Segmentation**, stepping the simulation clock forward, restoring the host, and verifying the `COMPLETED` badge.
3. **Asset Browser & Sandbox Generator UI**: Simulates switching tabs, selecting `BLD-DC-01`, and generating a Medium (18-building) sandbox city.
