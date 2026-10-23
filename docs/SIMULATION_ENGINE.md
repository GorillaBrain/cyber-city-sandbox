# Simulation Engine — Cyber City Sandbox

The simulation engine (`src/engine/simulationEngine.js`) is a deterministic, discrete-tick, event-driven state machine.

## 1. Simulation Event Lifecycle

```mermaid
sequenceDiagram
    participant Player as Player / SOC Console
    participant Clock as Controlled Sim Clock (1x/2x/4x/Step)
    participant Engine as simulationEngine.js
    participant Graph as Network Graph & Zone Policies
    participant SIEM as Event Stream & Metrics

    Player->>Engine: Inspect / Install Control / Update Policy / Isolate
    Engine->>Graph: Update Node Vulnerabilities, Controls & Edge Permissions
    Engine->>SIEM: Emit ASSET_DISCOVERED / CONTROL_INSTALLED / POLICY_UPDATED
    Clock->>Engine: stepSimulation(state, 1)
    Engine->>Engine: Advance Tick (T+00:15 per tick)
    Engine->>Graph: Process Benign Traffic Events (HIGH traffic pulses)
    Engine->>Graph: Evaluate Scheduled & Dynamic Attack Propagation Steps
    alt Preconditions Met (Unblocked Route + Unmitigated Vuln)
        Graph-->>Engine: Transition Allowed
        Engine->>SIEM: Update Target Compromise State & Emit COMPROMISE_SIMULATED
    else Intercepted by Control, Patch, Isolation, or Zone Policy
        Graph-->>Engine: Transition Blocked
        Engine->>SIEM: Increment Blocked Counter & Emit PROPAGATION_BLOCKED
    end
    Engine->>SIEM: Recompute Derived Metrics, Objectives & Rubric Score
```

## 2. Controlled Time Advancement

- **Discrete Ticks:** Each simulation tick represents 15 seconds of simulated operational time (`T+00:15`, `T+00:30`, etc.).
- **Pause Behavior:** Pausing stops `stepSimulation` invocations completely; game-state time, attack stages, and events never advance in the background while paused.
- **Deterministic Speeds:** `1x`, `2x`, and `4x` adjust the interval between ticks without introducing randomness or frame-rate dependencies.
- **Single-Step Debugging:** The **STEP** control advances the engine by exactly 1 tick so players can inspect each propagation attempt event-by-event.

## 3. Derived Telemetry & Scoring Formula

All metrics displayed in the Security Console are computed dynamically from `simState`:

- **Service Availability (`0–100%`):** Starts at `100%`. Quarantining (`isolated = true`) a building reduces availability based on its criticality (`CRITICAL: -14%`, `HIGH: -9%`, `MEDIUM: -6%`, `LOW: -4%`). Active `AFFECTED` buildings reduce availability by `-12%`, and denying a `legitimateDependency` zone policy reduces availability by `-8%`.
- **Weighted Mission Score (`0–100`, Grades `S` through `D`):**
  - **Investigation Quality (`15%`)**: Ratio of discovered vulnerabilities and asset inspections performed.
  - **Threat Containment (`20%`)**: Penalizes active compromised buildings and rewards blocked propagation attempts.
  - **Critical Infrastructure Protection (`20%`)**: Percentage of `CRITICAL` buildings kept healthy and un-isolated.
  - **Appropriate Security Controls (`15%`)**: Ratio of mitigated vulnerabilities and defensive control coverage.
  - **Service Availability (`15%`)**: City-wide service uptime percentage.
  - **Resource Efficiency (`5%`)**: Remaining defense budget efficiency.
  - **Evidence Preservation (`10%`)**: Coverage of Centralized Logging (`logging`) across city nodes.
