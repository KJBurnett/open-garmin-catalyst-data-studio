# Open Catalyst Data Studio

Open Catalyst Data Studio (OCDS) is a local-first, open-source project for preserving, inspecting, normalizing, viewing, and exporting driving telemetry. Its long-term purpose is to give owners durable access to their own track data without requiring a cloud service or a single vendor's desktop application.

The project begins with Garmin Catalyst because its data should remain useful even if the device, an account, or vendor support becomes unavailable. OCDS is not yet a Garmin Catalyst decoder: no real Catalyst media or permissioned backup sample has been received or verified. Until that happens, the software intentionally does not claim that it can import Catalyst sessions.

## Principles

- **Local first:** source data stays on the user's computer. The application has no cloud upload path.
- **Read-only acquisition:** an SD card or backup folder is inspected without changing it. Users should work from a copy and retain the original media.
- **Evidence before inference:** proprietary file formats are not guessed. A parser is only added after it has been verified against real, permissioned samples and the device UI.
- **Open, documented outputs:** the canonical model can be exported as JSON, CSV, and an experimental VBO interchange subset.
- **Provenance and privacy:** imported sessions retain parser and source information. Diagnostic inventories can be anonymized before sharing.
- **Cross-platform desktop experience:** the current application is TypeScript, React, and Electron, with Linux AppImage packaging verified.

## Current capabilities

| Area | Status | Notes |
| --- | --- | --- |
| Canonical `TelemetryDocument` model | Implemented | Versioned `1.0.0`, with sessions, laps, telemetry points, optional channels, and provenance. |
| Generic CSV import | Implemented | Requires ISO-8601 `timestamp`; the viewer also requires position, speed, longitudinal G, and lateral G. |
| JSON export | Implemented | Lossless representation of the canonical model. |
| CSV export | Implemented | Flat stream of normalized telemetry points. |
| VBO export | Experimental | Conservative VBOX-style subset; validate every file in the target Race Studio version before relying on it. |
| Source inspection | Implemented | Read-only recursive file inventory, content SHA-256 hashes, and archive/SQLite/binary classification. |
| Anonymized diagnostics | Implemented | Removes the root name and directory hierarchy from inspection output. |
| Desktop dashboard | Implemented | Local CSV import, sample session, route view, speed bars, and friction circle. |
| Garmin Catalyst parser | Not implemented | Blocked on real, permissioned data samples and validation. |
| AiM/Solo import | Not implemented | Requires documented source-format adapters and test fixtures. |

## Architecture

```text
Mounted microSD card / copied support-log folder / documented third-party export
                                  |
                                  v
                     Read-only inspection and hashing
                                  |
                                  v
                  Verified source-specific import adapter
                                  |
                                  v
                    TelemetryDocument (versioned core model)
                      /              |                 \
                     v               v                  v
              Desktop viewer        CSV                JSON / VBO
```

`packages/core` is the import, inspection, normalization, and export library. `packages/app` is the Electron/React local viewer. The application does not give the renderer Node.js access; Electron runs with context isolation enabled and Node integration disabled.

## Canonical telemetry contract

The core contract is `TelemetryDocument`, versioned by `schemaVersion`:

```text
TelemetryDocument
  schemaVersion: "1.0.0"
  sessions[]
    id, name, startedAt, trackName?, vehicleName?, source, laps[]
      id, number?, startedAt, durationMs?, points[]
        timestamp, latitude?, longitude?, altitudeM?, speedMps?,
        accelerationLongitudinalG?, accelerationLateralG?,
        accelerationVerticalG?, channels?
```

### Units and conventions

| Field | Convention |
| --- | --- |
| `timestamp`, `startedAt`, `importedAt` | ISO-8601 UTC string |
| `latitude`, `longitude` | WGS-84 decimal degrees |
| `altitudeM` | metres |
| `speedMps` | metres per second |
| `acceleration*G` | standard gravity (`g`) |
| `channels` | source-specific scalar/string/boolean values retained without redefining the standard model |

Every `Session` includes `source` provenance: source kind, import time, optional original name, optional SHA-256, parser name, and parser version. Do not remove provenance when transforming data; add a new record when a future workflow supports derivation history.

## Supported interchange formats

### Generic CSV import

The importer expects UTF-8 comma-separated data with a header and at least one sample. Core import requires:

```csv
timestamp
2026-01-01T00:00:00.000Z
```

The desktop viewer requires all of the following numeric columns so it can render a route and friction circle:

```csv
timestamp,latitude,longitude,speedMps,accelerationLongitudinalG,accelerationLateralG
2026-01-01T00:00:00.000Z,33.767,-84.402,25.1,-0.42,0.91
```

Optional normalized fields are `altitudeM` and `accelerationVerticalG`. This early importer deliberately does not attempt to handle quoted CSV, unknown vendor column names, custom timestamps, or automatic lap detection. Those behaviours need a documented adapter and regression fixtures rather than permissive guessing.

### Exports

- **JSON:** complete canonical document, suitable for archival and future conversion.
- **CSV:** normalized telemetry rows in the units described above.
- **VBO:** `Time`, `Latitude`, `Longitude`, `Velocity`, `LongAccel`, and `LatAccel`. Velocity is emitted in km/h, while acceleration remains in `g`.

VBO support is experimental. Race Studio versions and import settings vary; compare imported samples with the original session before using generated data for analysis, timing, competition, or safety decisions.

## Safe source-data workflow

1. Remove a Catalyst microSD card only while the device is powered down, following Garmin's device instructions.
2. Copy the card or exported support-log folder to a working directory; preserve the original media unchanged.
3. Run `inspectSource()` on the copied directory. It only reads regular files and skips symbolic links.
4. Keep the inspection result and source hashes alongside the copy so later parser results can be traced to exact input data.
5. Before sharing diagnostic information, use `anonymizeInspection()`. It replaces the root name and each relative path with a filename, but hashes and filenames can still reveal information—review before sharing.
6. Remove videos, account information, personal names, and precise location history before sharing a test dataset.
7. For each new parser, compare timestamp range, point count, lap count, lap boundaries, best-lap time, and displayed metrics with the source device or a known-good export.
8. Retain only minimal, permissioned fixtures in the repository, with consent and provenance documented.

Inspection classifies extensions and SQLite file signatures. It does **not** extract archives, open databases, decrypt data, interpret binary blobs, write to a device, or contact a network service.

## Developer setup

### Prerequisites

- Node.js compatible with the locked dependencies
- Yarn Classic (v1)
- A Linux desktop environment for running the packaged AppImage locally; platform-specific packaging work remains to be done for Windows and macOS

### Install and validate

```bash
yarn install
yarn lint
yarn build
```

`yarn build` type-checks both workspaces, builds the Vite renderer and Electron main process, and creates a Linux AppImage. The application uses the default Electron icon until branded assets are supplied.

For development:

```bash
yarn dev
```

The project presently has no automated test suite. Add focused core tests and permissioned format fixtures before expanding importer behaviour.

## Roadmap

This roadmap is intentionally explicit about completed work, uncompleted work, and work that is blocked or deferred. Checkboxes describe the repository state, not a promise of Catalyst compatibility.

### Foundation and safety

- [x] Establish a TypeScript monorepo with a core library and Electron/React application.
- [x] Define a versioned canonical telemetry model with documented units and source provenance.
- [x] Define JSON, CSV, and conservative VBO output contracts.
- [x] Implement read-only directory inspection with SHA-256 content hashes.
- [x] Implement anonymized inspection diagnostics.
- [x] Disable Electron renderer Node integration and enable context isolation.
- [x] Build and package a Linux AppImage.
- [ ] Add automated unit tests for model validation, CSV parsing, and every exporter.
- [ ] Add fixtures containing only permissioned, minimized, documented telemetry data.
- [ ] Add integrity checks and user-facing error reports for malformed source files.
- [ ] Add a stable CLI for inspection, import, validation, and export.

### Garmin Catalyst research and import — blocked on samples

- [ ] Obtain permissioned Catalyst microSD and/or support-log samples from multiple firmware/device configurations.
- [ ] Document the media directory layout, file signatures, archives, database schemas, and binary formats from those samples.
- [ ] Determine whether mounted microSD media contains usable telemetry, video metadata, or only a partial export.
- [ ] Determine the safe, supported path for user-provided support-log backups.
- [ ] Verify timestamp epoch/timezone semantics and sample rates against the Catalyst UI.
- [ ] Verify session and lap boundaries, track identifiers, vehicle information, speed, and acceleration values against known sessions.
- [ ] Implement a source-specific, read-only Catalyst adapter only after the previous checks pass.
- [ ] Add regression fixtures and test vectors for each verified Catalyst format/version.
- [ ] Publish a compatibility matrix by device software version and source type.
- [ ] **Deferred:** direct internal-memory access. It must not be attempted without a safe, reproducible, user-authorized method.
- [ ] **Deferred:** decryption, bypassing access controls, or reverse engineering that would require circumventing device security.

### Desktop product

- [x] Provide a local dashboard with a sample session and documented CSV import.
- [x] Render a basic route, speed overview, and friction circle.
- [ ] Store imported sessions locally with a migration strategy and a user-controlled data directory.
- [ ] Add a session browser organized by track day, track, session, and lap.
- [ ] Add an import flow that shows source inspection, parser version, hashes, warnings, and validation results.
- [ ] Add real telemetry charts with synchronized cursor, selectable channels, units, and accessible labels.
- [ ] Add map tiles only as an opt-in feature, with a fully offline route mode by default.
- [ ] Add export controls for JSON, CSV, and verified VBO.
- [ ] Add settings for units, privacy, data location, and diagnostic export.
- [ ] Add Windows and macOS packaging, signing, update policy, and release automation.
- [ ] Add application icons and native accessibility testing.

### Analysis features

- [ ] Add deterministic lap segmentation only when a source format supplies reliable lap markers or a documented user workflow exists.
- [ ] Add lap overlays, best/optimal lap comparisons, and time delta visualization.
- [ ] Add sector definition and comparison.
- [ ] Add derived G-sum, corner radius, braking, and coasting metrics with documented formulas and limitations.
- [ ] Validate calculated metrics against reference data before presenting them as driving guidance.
- [ ] **Deferred:** automatic corner-phase analysis until sampling quality and channel semantics are validated.
- [ ] **Deferred:** video synchronization until a supported video/data timestamp relationship is demonstrated.

### Interoperability

- [x] Support documented generic CSV input and open JSON/CSV output.
- [x] Add an experimental VBO-style exporter.
- [ ] Test VBO output against supported Race Studio versions and document import instructions/results.
- [ ] Research AiM Solo/Race Studio documented export formats and licensing constraints.
- [ ] Implement each AiM/Solo adapter as a separately tested importer into the canonical model.
- [ ] Add adapters for other documented racing-data formats as contributors provide lawful samples and specifications.
- [ ] Never advertise a format as supported until fixture-based import/export validation exists.

### Community and release readiness

- [ ] Add contribution, code-of-conduct, security, privacy, and sample-data-consent policies.
- [ ] Define a disclosure process for potentially sensitive proprietary-format discoveries.
- [ ] Add issue templates for source-layout reports, parser bugs, and data-sample offers.
- [ ] Document supported operating systems and a formal compatibility policy.
- [ ] Publish reproducible release artifacts and checksums.

## Known limitations

- No verified Garmin Catalyst, Garmin support-log, AiM, Solo, or Race Studio importer exists.
- The UI currently uses its own narrow CSV reader; it will be unified with the core importer as the application import boundary is developed.
- The dashboard represents a single imported session/lap and has no local persistent session database.
- No GPS map tiles are used; the route is a normalized local SVG path.
- VBO output has not been tested in Race Studio and must be treated as an interchange experiment.
- The project has no user-provided sample fixture, automated regression suite, or compatibility matrix.
- Linux AppImage packaging is verified; Windows and macOS packages are not.

## How to help

The highest-value contribution is a small, permissioned, sanitized data sample paired with a description of what the Catalyst UI shows: device software version, track day/session/lap counts, lap times, known timestamps, and whether the source came from microSD or a support-log backup. Start by sharing an anonymized inspection result—not raw data—so the project can determine whether a sample is needed and how to handle it safely.

Please do not submit credentials, account exports, private videos, other drivers' data without consent, or data obtained by bypassing device controls.

## License

MIT. See [LICENSE](LICENSE).
