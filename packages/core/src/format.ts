import { randomUUID } from "node:crypto";
import { TELEMETRY_SCHEMA_VERSION, type Session, type TelemetryDocument, type TelemetryPoint } from "./model.js";

const columns = ["timestamp", "latitude", "longitude", "altitudeM", "speedMps", "accelerationLongitudinalG", "accelerationLateralG", "accelerationVerticalG"] as const;

function escapeCsv(value: string | number | undefined): string {
    const text = value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportCsv(session: Session): string {
    const rows = [columns.join(",")];
    for (const lap of session.laps) {
        for (const point of lap.points) {
            rows.push(columns.map((column) => escapeCsv(point[column])).join(","));
        }
    }
    return `${rows.join("\n")}\n`;
}

export function exportJson(session: Session): string {
    const document: TelemetryDocument = { schemaVersion: TELEMETRY_SCHEMA_VERSION, sessions: [session] };
    return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Produces a conservative, documented VBO interchange subset. Verify imports
 * against the target Race Studio version before relying on it for lap timing.
 */
export function exportVbo(session: Session): string {
    const points = session.laps.flatMap((lap) => lap.points);
    const start = new Date(session.startedAt).getTime();
    const rows = [
        "[header]",
        "created by=Open Catalyst Data Studio",
        "file type=VBOX",
        "data format=Time,Latitude,Longitude,Velocity,LongAccel,LatAccel",
        "[column names]",
        "Time,Latitude,Longitude,Velocity,LongAccel,LatAccel",
        "[data]",
    ];
    for (const point of points) {
        const milliseconds = new Date(point.timestamp).getTime() - start;
        rows.push([
            (milliseconds / 1000).toFixed(3),
            point.latitude?.toFixed(7) ?? "",
            point.longitude?.toFixed(7) ?? "",
            point.speedMps === undefined ? "" : (point.speedMps * 3.6).toFixed(3),
            point.accelerationLongitudinalG?.toFixed(4) ?? "",
            point.accelerationLateralG?.toFixed(4) ?? "",
        ].join(","));
    }
    return `${rows.join("\n")}\n`;
}

export function importGenericCsv(input: string, name = "Imported session"): Session {
    const [headerLine, ...data] = input.trim().split(/\r?\n/);
    if (!headerLine || data.length === 0) throw new Error("CSV must include a header and at least one telemetry row.");
    const headers = headerLine.split(",").map((header) => header.trim());
    const index = (column: string): number => headers.indexOf(column);
    const timestampIndex = index("timestamp");
    if (timestampIndex < 0) throw new Error("CSV must include an ISO-8601 timestamp column.");
    const numberAt = (values: string[], column: string): number | undefined => {
        const value = values[index(column)];
        return value === undefined || value === "" ? undefined : Number(value);
    };
    const points: TelemetryPoint[] = data.filter(Boolean).map((line) => {
        const values = line.split(",").map((value) => value.trim());
        const timestamp = values[timestampIndex];
        if (Number.isNaN(new Date(timestamp).getTime())) throw new Error(`Invalid timestamp: ${timestamp}`);
        return {
            timestamp,
            latitude: numberAt(values, "latitude"),
            longitude: numberAt(values, "longitude"),
            altitudeM: numberAt(values, "altitudeM"),
            speedMps: numberAt(values, "speedMps"),
            accelerationLongitudinalG: numberAt(values, "accelerationLongitudinalG"),
            accelerationLateralG: numberAt(values, "accelerationLateralG"),
            accelerationVerticalG: numberAt(values, "accelerationVerticalG"),
        };
    });
    const startedAt = points[0].timestamp;
    return {
        id: randomUUID(),
        name,
        startedAt,
        source: { kind: "generic-csv", importedAt: new Date().toISOString(), parser: "generic-csv", parserVersion: TELEMETRY_SCHEMA_VERSION },
        laps: [{ id: randomUUID(), number: 1, startedAt, points }],
    };
}
