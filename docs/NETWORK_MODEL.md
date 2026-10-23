# Network Model & Segmentation — Cyber City Sandbox

The city's digital backbone is modeled as a labelled, policy-governed graph $G = (V, E)$ where vertices $V$ are buildings (hosting logical systems) and edges $E$ are communication conduits.

## 1. Security Zones (`NETWORK_ZONES`)

Every building belongs to one of six logical security zones:

1. **`PUBLIC_SERVICES`**: Public Transit Hub (`BLD-PUB-01`), Government Services (`BLD-GOV-01`).
2. **`RESIDENTIAL_ZONE`**: Residential Towers (`BLD-RES-01`, etc.).
3. **`CORPORATE_USERS`**: Corporate Skyscrapers (`BLD-CORP-01`), Financial District (`BLD-FIN-01`).
4. **`CORE_SERVERS`**: Data Centers (`BLD-DC-01`).
5. **`MANAGEMENT_ZONE`**: Telecommunications Spine (`BLD-TEL-01`).
6. **`INDUSTRIAL_CRITICAL`**: Smart Factory (`BLD-FAC-01`), Power Facility (`BLD-POW-01`), Hospital (`BLD-HOS-01`).

## 2. Connection Properties

Each edge in `simState.connections` maintains:

- `id`: Stable connection identifier (`CONN-01`, etc.)
- `source` / `target`: Connected building IDs
- `connectionType`: Physical/logical link type (`FIBER_UPLINK`, `VPN_BRIDGE`, `IT_OT_BRIDGE`, `DARK_FIBER`, `SCADA_TIMING`, etc.)
- `allowedTrafficCategories`: Array of protocols (`['MQTT', 'HTTP']`, `['SMB', 'POSTGRES', 'HTTPS']`, etc.)
- `trustRelationship`: Trust model (`PEER_UNTRUSTED`, `REMOTE_ACCESS`, `PERMISSIVE_BRIDGE`, `LIFE_SAFETY`, etc.)
- `securityBoundary`: `INTRA_ZONE` or `SOURCE_ZONE<->TARGET_ZONE`
- `latencyMs` & `bandwidthGbps`: Deterministic link telemetry
- `permitted`: Boolean computed from active zone segmentation policies and host isolation states
- `legitimateDependency`: Boolean indicating whether operational city traffic relies on this route
- `trafficState`: Real-time visual state (`NORMAL`, `HIGH`, `SUSPICIOUS`, `BLOCKED`, `ISOLATED`)

## 3. Inter-Zone Segmentation Policies

Players can toggle inter-zone policies between `PERMIT` and `DENY` in the **Zones** panel:

- **Unsafe Bridges (`legitimateDependency: false`):**
  - `RESIDENTIAL_ZONE -> CORPORATE_USERS` (Unrestricted remote residential bridge)
  - `PUBLIC_SERVICES -> INDUSTRIAL_CRITICAL` (Direct public telemetry relay into OT)
  - `CORPORATE_USERS -> INDUSTRIAL_CRITICAL` (Direct IT-to-OT engineering link)
  - *Effect when Denied:* Blocks cross-zone attack propagation with **0% penalty** to city service availability.
- **Legitimate Operational Conduits (`legitimateDependency: true`):**
  - `RESIDENTIAL_ZONE -> PUBLIC_SERVICES`, `PUBLIC_SERVICES -> CORE_SERVERS`, `CORPORATE_USERS -> CORE_SERVERS`, `CORPORATE_USERS -> MANAGEMENT_ZONE`, `MANAGEMENT_ZONE -> CORE_SERVERS`, `MANAGEMENT_ZONE -> INDUSTRIAL_CRITICAL`.
  - *Effect when Denied:* Blocks traffic across those zones, but reduces city-wide Service Availability by **8%** per denied legitimate dependency.
