import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { getAllSessions, type Session } from "./tauri";

const CSV_HEADERS = [
  "id",
  "task",
  "depth",
  "started_at",
  "ended_at",
  "duration",
  "planned",
  "interrupts",
  "rating",
  "status",
] as const;

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function sessionsToCsv(sessions: Session[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const session of sessions) {
    lines.push(
      [
        session.id,
        session.task,
        session.depth,
        session.started_at,
        session.ended_at,
        session.duration,
        session.planned,
        session.interrupts,
        session.rating,
        session.status,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function sessionsToJson(sessions: Session[]): string {
  return `${JSON.stringify(sessions, null, 2)}\n`;
}

function exportFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `flowky-sessions-${stamp}`;
}

function formatFromPath(path: string): "csv" | "json" | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return null;
}

export type ExportResult = "saved" | "cancelled";

export async function exportSessions(): Promise<ExportResult> {
  const sessions = await getAllSessions();
  const path = await save({
    defaultPath: `${exportFilename()}.json`,
    filters: [
      { name: "JSON", extensions: ["json"] },
      { name: "CSV", extensions: ["csv"] },
    ],
  });

  if (!path) return "cancelled";

  const format = formatFromPath(path) ?? "json";
  const content =
    format === "csv" ? sessionsToCsv(sessions) : sessionsToJson(sessions);

  await writeTextFile(path, content);
  return "saved";
}
