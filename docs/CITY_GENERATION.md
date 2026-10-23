# Procedural City & Topology Generation — Cyber City Sandbox

`src/engine/cityGenerator.js` implements a deterministic procedural generator seeded via `src/engine/prng.js` (FNV-1a string hash + Mulberry32 PRNG).

## 1. Deterministic Guarantee

Given an identical tuple of `(seed, size, density, difficulty, securityMaturity)`:
1. Building IDs, names, archetypes, coordinates, heights, and window seed offsets are 100% identical.
2. Logical systems (`services`) hosted inside each building are identical.
3. Initial vulnerabilities (`SIM-VULN-*`) and pre-installed controls are identical.
4. Network connections (`connections`) and inter-zone policies (`zonePolicies`) are identical.

## 2. Ten Building Archetypes

| Archetype ID | Display Name | Default Zone | Default Criticality | Example Hosted Logical Systems |
| :--- | :--- | :--- | :--- | :--- |
| `residential` | Residential Tower | `RESIDENTIAL_ZONE` | `LOW` | Smart Home Gateway (`MQTT-Bridge/1883`), Building HVAC (`BACnet-Sim/47808`) |
| `corporate` | Corporate Skyscraper | `CORPORATE_USERS` | `MEDIUM` | Employee Workstation Pool (`RDP-Sim/3389`), Internal File Share (`SMB-Sim/445`) |
| `factory` | Smart Factory | `INDUSTRIAL_CRITICAL` | `HIGH` | Industrial Monitoring Gateway (`OPC-UA-Sim/4840`), Simulated Assembly PLC (`Modbus-Sim/502`) |
| `datacenter` | Data Center | `CORE_SERVERS` | `CRITICAL` | Public Web Tier (`HTTPS-Ingress/443`), Core Database (`Postgres-Sim/5432`), Immutable Snapshot Vault |
| `hospital` | Hospital | `INDUSTRIAL_CRITICAL` | `CRITICAL` | Hospital Information System (`HL7-Sim/2575`), Diagnostic Imaging (`DICOM-Sim/104`) |
| `financial` | Financial District Building | `CORPORATE_USERS` | `CRITICAL` | High-Frequency Settlement Node (`FIX-Sim/9876`), Cold-Storage Audit Gateway |
| `transport` | Public Transport Hub | `PUBLIC_SERVICES` | `HIGH` | Automated Rail Signaling (`Signal-Sim/6200`), Smart Roadway Controller (`V2X-Sim/5100`) |
| `power` | Power Facility | `INDUSTRIAL_CRITICAL` | `CRITICAL` | Energy Management System (`IEC61850-Sim/102`), Substation Telemetry (`DNP3-Sim/20000`) |
| `telecom` | Telecommunications Tower | `MANAGEMENT_ZONE` | `CRITICAL` | City Backbone Core Router (`BGP-Sim/179`), Authoritative Internal DNS (`DNS-Sim/53`) |
| `government` | Government Services Building | `PUBLIC_SERVICES` | `HIGH` | Citizen Identity Portal (`HTTPS-Gov/443`), Emergency Coordination Bus (`AlertBus-Sim/7443`) |

## 3. Supported City Scales

- **Small (`small`):** 10 buildings hosting **20–30 logical systems**. Ideal for focused campaign missions and miniature diorama inspection.
- **Medium (`medium`):** 18 buildings hosting **50–80 logical systems**. Adds outer-ring sector towers connected via zone meshes and backbone uplinks.
- **Large (`large`):** 32 buildings hosting **100–150 logical systems**. Full metropolitan grid with multi-ring zoning.
