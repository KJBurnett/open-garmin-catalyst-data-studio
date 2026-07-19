import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type SourceKind = "directory" | "archive" | "sqlite" | "binary" | "file";

export interface SourceFile {
    relativePath: string;
    sizeBytes: number;
    sha256: string;
    kind: SourceKind;
}

export interface SourceInspection {
    rootName: string;
    inspectedAt: string;
    files: SourceFile[];
}

const archiveExtensions = new Set([".zip", ".gz", ".tgz", ".tar", ".7z"]);
const sqliteExtensions = new Set([".db", ".sqlite", ".sqlite3"]);

export async function inspectSource(sourcePath: string): Promise<SourceInspection> {
    const root = path.resolve(sourcePath);
    const rootStat = await fs.lstat(root);
    if (!rootStat.isDirectory()) {
        throw new Error("A mounted-media folder or extracted backup folder is required.");
    }

    const files: SourceFile[] = [];
    async function walk(directory: string): Promise<void> {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) {
                await walk(absolutePath);
            } else if (entry.isFile()) {
                const contents = await fs.readFile(absolutePath);
                const extension = path.extname(entry.name).toLowerCase();
                files.push({
                    relativePath: path.relative(root, absolutePath),
                    sizeBytes: contents.byteLength,
                    sha256: createHash("sha256").update(contents).digest("hex"),
                    kind: archiveExtensions.has(extension)
                        ? "archive"
                        : sqliteExtensions.has(extension) || contents.subarray(0, 16).toString() === "SQLite format 3\u0000"
                            ? "sqlite"
                            : extension === "" ? "binary" : "file",
                });
            }
        }
    }

    await walk(root);
    return { rootName: path.basename(root), inspectedAt: new Date().toISOString(), files };
}

export function anonymizeInspection(inspection: SourceInspection): SourceInspection {
    return {
        ...inspection,
        rootName: "REDACTED",
        files: inspection.files.map(({ relativePath, ...file }) => ({
            ...file,
            relativePath: path.basename(relativePath),
        })),
    };
}
