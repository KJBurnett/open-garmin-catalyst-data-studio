# Open Catalyst Data Studio

Open Catalyst Data Studio (OCDS) is a local-first, open-source telemetry archive and viewer. It is deliberately starting with verified, documented formats rather than claiming support for undocumented Garmin Catalyst storage.

## Current status

- A desktop session dashboard can import the documented CSV contract and visualize a route, speed, and friction circle locally.
- The core library defines the versioned `TelemetryDocument` contract and CSV, JSON, and conservative VBO interchange exporters.
- `inspectSource(path)` provides a **read-only** recursive inventory for a mounted microSD card or an extracted support-log backup. It skips symbolic links and reports each file's relative path, size, type guess, and SHA-256 hash.
- `anonymizeInspection()` replaces the source root and directory hierarchy with filenames, allowing a user to share structural diagnostics without sharing their source data.

There is no verified Garmin Catalyst parser yet. Archive and SQLite detection are only classifications; inspection never extracts archives, opens databases, writes to media, or sends data over the network.

## Canonical telemetry contract

The public contract is `TelemetryDocument`, versioned by `schemaVersion` (`1.0.0`):

```text
TelemetryDocument
  schemaVersion
  sessions[]
    id, name, startedAt, trackName?, vehicleName?, source, laps[]
      id, number?, startedAt, durationMs?, points[]
        timestamp, latitude?, longitude?, altitudeM?, speedMps?,
        accelerationLongitudinalG?, accelerationLateralG?, accelerationVerticalG?, channels?
```

All timestamps are ISO-8601 UTC strings. Distance uses metres, speed uses metres/second, acceleration uses standard gravity (`g`), and geographic positions use WGS-84 decimal degrees. Every imported session retains source provenance: source kind, import time, original name where available, content hash where available, parser name, and parser version.

## CSV contract

The initial importer accepts a UTF-8 comma-separated file containing a header and at least one row. It requires `timestamp`; the dashboard additionally requires:

```text
timestamp,latitude,longitude,speedMps,accelerationLongitudinalG,accelerationLateralG
```

Optional core export columns are `altitudeM` and `accelerationVerticalG`. The core CSV parser is intentionally narrow while reverse engineering is ongoing: quoted CSV, device-specific columns, and lap segmentation require a documented adapter rather than guessing.

## Exports and interoperability

- **JSON:** lossless canonical `TelemetryDocument`.
- **CSV:** flat point stream using the units above.
- **VBO:** a conservative VBOX-style interchange subset (`Time`, `Latitude`, `Longitude`, `Velocity`, `LongAccel`, `LatAccel`). It is experimental: users must verify a generated file against their particular Race Studio version before using it for timing or analysis.

AiM/Solo support is not implemented. It will be introduced as independently tested adapters from documented formats into the canonical contract.

## Safe data-sample workflow

1. Copy a microSD card or exported support-log folder to a working directory; keep the original read-only.
2. Run the inspector on the copy and preserve its output with the source hash.
3. Remove personal names, precise locations, and video before sharing a sample. Share `anonymizeInspection()` output first.
4. Add a parser only after checking parsed timestamps, point counts, lap boundaries, and summary values against the Catalyst UI.
5. Retain permissioned, minimal fixtures and regression tests for every understood format.

Direct internal-memory access, video synchronization, automatic corner detection, and claims of Garmin Catalyst import support are out of scope until real, permissioned data establishes a safe, repeatable implementation.
