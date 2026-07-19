import { useMemo, useState, type ChangeEvent } from "react";

type Point = { timestamp: string; latitude: number; longitude: number; speedMps: number; accelerationLongitudinalG: number; accelerationLateralG: number };

const samplePoints: Point[] = Array.from({ length: 80 }, (_, index) => {
    const angle = (index / 79) * Math.PI * 2;
    return {
        timestamp: new Date(Date.UTC(2026, 6, 17, 14, 0, index)).toISOString(),
        latitude: 33.767 + Math.sin(angle) * 0.004,
        longitude: -84.402 + Math.cos(angle) * 0.006,
        speedMps: 24 + Math.sin(angle * 2) * 12,
        accelerationLongitudinalG: Math.cos(angle * 2) * 0.7,
        accelerationLateralG: Math.sin(angle * 2) * 1.1,
    };
});

function parseCsv(input: string): Point[] {
    const [header, ...rows] = input.trim().split(/\r?\n/);
    const columns = header.split(",").map((item) => item.trim());
    const at = (name: string) => columns.indexOf(name);
    if (at("timestamp") < 0) throw new Error("The CSV needs an ISO-8601 timestamp column.");
    return rows.filter(Boolean).map((row) => {
        const values = row.split(",").map((item) => item.trim());
        const value = (name: string) => Number(values[at(name)]);
        const timestamp = values[at("timestamp")];
        if (Number.isNaN(new Date(timestamp).getTime())) throw new Error(`Invalid timestamp: ${timestamp}`);
        return {
            timestamp,
            latitude: value("latitude"),
            longitude: value("longitude"),
            speedMps: value("speedMps"),
            accelerationLongitudinalG: value("accelerationLongitudinalG"),
            accelerationLateralG: value("accelerationLateralG"),
        };
    });
}

function App() {
    const [points, setPoints] = useState(samplePoints);
    const [sessionName, setSessionName] = useState("Demo track day");
    const [notice, setNotice] = useState("Showing local demo data. Import a documented CSV to replace it.");
    const mapPoints = useMemo(() => {
        const lats = points.map((point) => point.latitude);
        const lons = points.map((point) => point.longitude);
        const latitudeRange = Math.max(...lats) - Math.min(...lats) || 1;
        const longitudeRange = Math.max(...lons) - Math.min(...lons) || 1;
        return points.map((point) => `${20 + ((point.longitude - Math.min(...lons)) / longitudeRange) * 260},${180 - ((point.latitude - Math.min(...lats)) / latitudeRange) * 140}`).join(" ");
    }, [points]);
    const maxSpeed = Math.max(...points.map((point) => point.speedMps * 2.23694));

    const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const imported = parseCsv(await file.text());
            if (imported.some((point) => Object.values(point).some((value) => typeof value === "number" && Number.isNaN(value)))) {
                throw new Error("CSV must include numeric latitude, longitude, speedMps, accelerationLongitudinalG, and accelerationLateralG columns.");
            }
            setPoints(imported);
            setSessionName(file.name.replace(/\.csv$/i, ""));
            setNotice(`Imported ${imported.length} local points from ${file.name}. Nothing was uploaded.`);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not import that CSV.");
        }
    };

    return (
        <main>
            <header>
                <div><p className="eyebrow">LOCAL-FIRST TELEMETRY</p><h1>Open Catalyst Data Studio</h1></div>
                <label className="button">Import documented CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label>
            </header>
            <p className="notice">{notice}</p>
            <section className="summary">
                <article><span>TRACK DAY</span><strong>{sessionName}</strong></article>
                <article><span>LAPS</span><strong>1 <small>unverified</small></strong></article>
                <article><span>PEAK SPEED</span><strong>{maxSpeed.toFixed(1)} mph</strong></article>
                <article><span>SAMPLES</span><strong>{points.length}</strong></article>
            </section>
            <section className="grid">
                <article className="panel map"><h2>Track map</h2><svg viewBox="0 0 300 200" aria-label="Telemetry route"><polyline points={mapPoints} /></svg></article>
                <article className="panel"><h2>Friction circle</h2><svg className="circle" viewBox="-1.4 -1.4 2.8 2.8" aria-label="Lateral and longitudinal acceleration"><circle r="1.1" /><line x1="-1.3" x2="1.3" /><line y1="-1.3" y2="1.3" />{points.map((point, index) => <circle className="dot" key={index} cx={point.accelerationLateralG} cy={-point.accelerationLongitudinalG} r=".035" />)}</svg></article>
                <article className="panel chart"><h2>Speed</h2><div className="bars">{points.filter((_, index) => index % 3 === 0).map((point, index) => <i key={index} style={{ height: `${(point.speedMps / maxSpeed) * 110}px` }} />)}</div><p>mph over session timeline</p></article>
            </section>
            <footer>Garmin Catalyst media support is inspection-only until real, permissioned samples establish a verified parser. Use source hashes and retain original media.</footer>
        </main>
    );
}

export default App;
