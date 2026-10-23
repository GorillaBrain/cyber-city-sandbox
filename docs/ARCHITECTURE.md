# Architecture Overview — Cyber City Sandbox

**Cyber City Sandbox** is engineered around a strict four-layer separation of concerns so that the cybersecurity simulation engine is 100% deterministic, fast, and independently testable without requiring a WebGL context or DOM renderer.

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph UI["User Interface Layer (React + Lucide)"]
        TopBar["TopBar (Transport, KPIs, Overlays)"]
        LeftPanel["LeftPanel (Missions, Assets, Zones, Sandbox)"]
        RightPanel["RightPanel (Asset Inspector, Vulns, Controls, Links)"]
        BottomPanel["BottomPanel (SIEM Event Stream, Propagation, Score)"]
        Modals["Modals (Tutorial, Save/Import, Graphics Settings)"]
    end

    subgraph Render3D["3D Rendering Layer (Three.js + React Three Fiber + Drei)"]
        Scene["CityScene3D (Canvas, Lighting, Fog, CameraController)"]
        Buildings["VoxelBuilding (10 Archetypes, Procedural Window Grids, Beacons)"]
        NetLayer["NetworkTopologyLayer (Quadratic Bezier Conduits & Packet Pulses)"]
        Traffic["AmbientCyberTraffic (Hover-Vehicles & Ground Street Cars)"]
        Fallback2D["Fallback2DCityMap (Interactive SVG Map when WebGL is disabled)"]
    end

    subgraph State["State & Audio Bridge"]
        Store["useGameStore (Zustand)"]
        Audio["CyberSoundEngine (Web Audio API Synth)"]
    end

    subgraph Engine["Pure Simulation Engine (src/engine/*)"]
        PRNG["prng.js (Mulberry32 + FNV-1a Seed Hash)"]
        Catalog["catalog.js (Archetypes, Zones, SIM-VULN-*, 12 Controls)"]
        Gen["cityGenerator.js (Deterministic City & Graph Builder)"]
        Scenarios["scenarios.js (6 Campaign Scenarios A–F)"]
        Sim["simulationEngine.js (Preconditions, Propagation, Scoring)"]
        Persist["persistence.js (Schema v1 Validation, LocalStorage, JSON I/O)"]
    end

    UI -->|Actions| Store
    Render3D -->|Select / Hover / Focus| Store
    Store -->|State Subscriptions| UI
    Store -->|State Subscriptions| Render3D
    Store -->|Pure State Transitions| Sim
    Store -->|Validated Save / Load| Persist
    Store -->|Optional Synth Cues| Audio
    Sim --> Gen
    Sim --> Scenarios
    Sim --> Catalog
    Gen --> PRNG
    Gen --> Catalog
```

## 2. Layer Responsibilities

| Layer | Directory / Files | Responsibility |
| :--- | :--- | :--- |
| **Simulation Engine** | `src/engine/prng.js`<br>`src/engine/catalog.js`<br>`src/engine/cityGenerator.js`<br>`src/engine/scenarios.js`<br>`src/engine/simulationEngine.js` | Deterministic city generation, network topology construction, zone segmentation policies, vulnerability lifecycle, defensive control enforcement, event-driven attack propagation, service restoration, and mission scoring. Zero Three.js or React dependencies. |
| **Persistence Layer** | `src/engine/persistence.js` | Schema-versioned (`schemaVersion: 1`) serialization, size-bounded (`<= 512 KB`) JSON import validation, input sanitization, and automatic `localStorage` persistence. |
| **State & Audio Bridge** | `src/store/useGameStore.js`<br>`src/utils/soundEffects.js` | Connects pure engine transitions to React components and the 3D scene while isolating high-frequency 3D animation frames from UI re-renders. |
| **Rendering Layer** | `src/components/CityScene3D.jsx` | Renders the nighttime cyberpunk voxel diorama, procedural emissive window textures, neon signage, hover-traffic, and real-time network/threat/control overlays. Includes an automatic 2D interactive SVG fallback when WebGL is unavailable. |
| **User Interface Layer** | `src/components/TopBar.jsx`<br>`src/components/LeftPanel.jsx`<br>`src/components/RightPanel.jsx`<br>`src/components/BottomPanel.jsx`<br>`src/components/Modals.jsx` | Security Operations Center (SOC) console for asset inspection, vulnerability remediation, zone policy management, SIEM event investigation, and mission tracking. |

## 3. Relationship Between City Assets and Network Nodes

```mermaid
erDiagram
    CITY ||--|{ BUILDING : contains
    BUILDING ||--|{ LOGICAL_SYSTEM : hosts
    BUILDING ||--o{ VULNERABILITY_INSTANCE : exhibits
    BUILDING ||--o{ DEFENSIVE_CONTROL : installs
    BUILDING }|--|{ NETWORK_CONNECTION : connects_via
    NETWORK_ZONE ||--|{ BUILDING : segments
    ZONE_POLICY ||--o{ NETWORK_CONNECTION : governs
```

Every 3D skyscraper in the scene maps `1:1` by stable ID (`BLD-RES-01`, `BLD-DC-01`, etc.) to a building node in `simState.buildings`, which in turn hosts multiple logical services (`BLD-DC-01-SYS-01`, etc.). Visual indicators (status beacons, quarantine cages, firewall rings, monitoring octahedrons, and fiber pulse colors) are computed directly from the underlying simulation state.
