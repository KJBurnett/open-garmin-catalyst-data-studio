export const TELEMETRY_SCHEMA_VERSION = "1.0.0";

export interface TelemetryPoint {
    timestamp: string;
    latitude?: number;
    longitude?: number;
    altitudeM?: number;
    speedMps?: number;
    accelerationLongitudinalG?: number;
    accelerationLateralG?: number;
    accelerationVerticalG?: number;
    channels?: Record<string, number | string | boolean | null>;
}

export interface Lap {
    id: string;
    number?: number;
    startedAt: string;
    durationMs?: number;
    points: TelemetryPoint[];
}

export interface Session {
    id: string;
    name: string;
    startedAt: string;
    trackName?: string;
    vehicleName?: string;
    source: SourceProvenance;
    laps: Lap[];
}

export interface TelemetryDocument {
    schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
    sessions: Session[];
}

export interface SourceProvenance {
    kind: "garmin-media" | "garmin-support-log" | "aim-csv" | "generic-csv" | "manual";
    importedAt: string;
    originalName?: string;
    sha256?: string;
    parser: string;
    parserVersion: string;
}
