# Security, Safety & Privacy Model — Cyber City Sandbox

## 1. Educational Defensive Simulation Only

**Cyber City Sandbox** is a safe, browser-based educational game and digital-twin strategy simulation.

- **No Real Exploits or Payloads:** All vulnerabilities use synthetic identifiers (`SIM-VULN-001` through `SIM-VULN-010`). No real CVE exploit code, shellcode, or offensive payloads exist anywhere in the codebase.
- **No Real Ransomware or File Modification:** Scenario C (*Ransomware Propagation Simulation*) models impact strictly by flipping an in-memory JavaScript property (`compromiseState: 'AFFECTED'`, `snapshotClean: false`). It never encrypts, modifies, or accesses user files.
- **No Network Scanning or External Connections:** All network nodes, IP/port labels (`MQTT-Bridge/1883`, `Postgres-Sim/5432`), and packet pulses are fictional in-memory graph objects. The application makes zero outbound requests to external hosts or APIs.

## 2. Application Security Controls

- **Validated Save Imports (`src/engine/persistence.js`):**
  - Enforces a strict `512 KB` maximum payload size (`MAX_IMPORT_BYTES`).
  - Parses JSON safely with `JSON.parse` (never `eval` or `Function`).
  - Validates `schemaVersion === 1`, array bounds (`1..100` buildings, `<= 400` edges), valid archetype keys, and valid defensive control IDs.
  - Strips angle brackets (`<`, `>`) and truncates user-supplied strings (`seed`, `name`, `scenarioTitle`) to prevent injection.
- **Zero Secrets:** The application requires no API keys, credentials, or backend tokens.

## 3. Privacy Model

- **100% Local Persistence:** Player progress, city seeds, and sandbox configurations are stored exclusively in the browser's `localStorage` (`cyber_city_sandbox_save_v1`).
- **No Telemetry or Tracking:** No player data, analytics, or crash reports are uploaded to external servers.

## 4. Simulation Limitations

This simulation uses deterministic state-transition rules to teach cybersecurity concepts (network segmentation, least privilege, MFA, patching, immutable backups, and availability trade-offs). Simplified game mechanics do not predict real-world breach outcomes or replace professional security assessments.
