import type { Depth, InterruptionInput } from "../lib/tauri";

export type Screen =
  | "home"
  | "tasks"
  | "taskSetup"
  | "activeSession"
  | "interruptLog"
  | "break"
  | "dailyReview"
  | "weeklySummary"
  | "calendarHeatmap"
  | "dayDetail"
  | "settings";

export type SettingsTab =
  | "preferences"
  | "notifications"
  | "distractions"
  | "data";

export const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "distractions", label: "Distractions" },
  { id: "data", label: "Data" },
];

export interface LoggedInterruption {
  type: string;
  logged_at: number;
}

export interface SessionContext {
  task: string;
  depth: Depth;
  plannedSeconds: number;
  interrupts: number;
  loggedInterruptions: LoggedInterruption[];
  startedAt: number;
}

export const INITIAL_SESSION: SessionContext = {
  task: "",
  depth: "deep",
  plannedSeconds: 25 * 60,
  interrupts: 0,
  loggedInterruptions: [],
  startedAt: 0,
};

export function toInterruptionInputs(
  logged: LoggedInterruption[],
): InterruptionInput[] {
  return logged.map((entry) => ({
    interrupt_type: entry.type,
    logged_at: entry.logged_at,
  }));
}
