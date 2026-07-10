import { invoke } from "@tauri-apps/api/core";

export interface InterruptionInput {
  interrupt_type: string;
  logged_at: number;
}

export interface InterruptionBreakdown {
  interrupt_type: string;
  count: number;
}

export type Depth = "light" | "deep" | "creative";
export type SessionStatus = "completed" | "abandoned" | "extended";

export interface Session {
  id?: number;
  task: string;
  depth: Depth;
  started_at: number;
  ended_at?: number;
  duration?: number;
  planned: number;
  interrupts: number;
  rating?: number;
  status: SessionStatus;
}

export async function setContextSwitchWatching(enabled: boolean): Promise<void> {
  return invoke("set_context_switch_watching", { enabled });
}

export async function getIdleSeconds(): Promise<number> {
  return invoke("get_idle_seconds");
}

export async function sendNotification(title: string, body: string): Promise<void> {
  return invoke("send_notification", { title, body });
}

export async function setTrayState(state: "idle" | "running" | "break"): Promise<void> {
  return invoke("set_tray_state", { state });
}

export interface TraySession {
  active: boolean;
  task: string;
  depth: string;
  status: "idle" | "running" | "paused" | "break";
  remaining_seconds: number;
  planned_seconds: number;
  started_at: number;
  interrupts: number;
  ends_at: number | null;
}

export async function updateTraySession(session: TraySession): Promise<void> {
  return invoke("update_tray_session", { session });
}

export async function getTraySession(): Promise<TraySession> {
  return invoke("get_tray_session");
}

export async function openMainWindow(): Promise<void> {
  return invoke("open_main_window");
}

export async function saveSession(
  session: Session,
  interruptions: InterruptionInput[] = [],
): Promise<number> {
  return invoke("save_session", { session, interruptions });
}

export async function getSessions(days: number): Promise<Session[]> {
  return invoke("get_sessions", { days });
}

export async function resetData(): Promise<void> {
  return invoke("reset_data");
}

export async function computeScore(sessions: Session[]): Promise<number> {
  return invoke("compute_score", { sessions });
}

export interface LengthSuggestion {
  minutes: number;
  explanation: string;
}

export async function suggestLength(
  sessions: Session[],
  depth: Depth,
): Promise<LengthSuggestion> {
  return invoke("suggest_length", { sessions, depth });
}

export async function getInterruptionBreakdown(
  days: number,
): Promise<InterruptionBreakdown[]> {
  return invoke("get_interruption_breakdown", { days });
}

export type AppBucket = "work" | "distraction" | "neutral";

export interface AppRule {
  app_name: string;
  bucket: AppBucket;
}

export interface SiteRule {
  keyword: string;
  bucket: AppBucket;
}

export interface AppActivityInput {
  app_name: string;
  bucket: AppBucket;
  seconds: number;
}

export interface AppActivityTotal {
  app_name: string;
  bucket: AppBucket;
  seconds: number;
}

export async function startAppSession(): Promise<void> {
  return invoke("start_app_session");
}

export async function takeAppActivity(): Promise<AppActivityInput[]> {
  return invoke("take_app_activity");
}

export interface LiveDistraction {
  app: string;
  seconds: number;
}

export async function getLiveDistractions(): Promise<LiveDistraction[]> {
  return invoke("get_live_distractions");
}

export async function getAppRules(): Promise<AppRule[]> {
  return invoke("get_app_rules");
}

export async function setAppRule(appName: string, bucket: AppBucket): Promise<void> {
  return invoke("set_app_rule", { appName, bucket });
}

export async function getSiteRules(): Promise<SiteRule[]> {
  return invoke("get_site_rules");
}

export async function setSiteRule(keyword: string, bucket: AppBucket): Promise<void> {
  return invoke("set_site_rule", { keyword, bucket });
}

export async function saveAppActivity(
  sessionId: number,
  rows: AppActivityInput[],
): Promise<void> {
  return invoke("save_app_activity", { sessionId, rows });
}

export async function getAppActivity(days: number): Promise<AppActivityTotal[]> {
  return invoke("get_app_activity", { days });
}

export async function getSessionAppActivity(
  sessionId: number,
): Promise<AppActivityTotal[]> {
  return invoke("get_session_app_activity", { sessionId });
}

export type PermissionState = "granted" | "denied" | "unsupported" | "unknown";

export interface PermissionStatus {
  screen_recording: PermissionState;
  notifications: PermissionState;
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return invoke("get_permission_status");
}

export async function requestScreenRecording(): Promise<void> {
  return invoke("request_screen_recording");
}

export async function openSystemSettings(
  target: "screen-recording" | "notifications",
): Promise<void> {
  return invoke("open_system_settings", { target });
}

export async function sendTestNotification(): Promise<void> {
  return invoke("send_test_notification");
}

// ── Tasks (simple todo list) ──────────────────────────────────────────

export interface Task {
  id?: number;
  title: string;
  done: boolean;
  created_at: number;
}

export async function getTasks(): Promise<Task[]> {
  return invoke("get_tasks");
}

export async function addTask(title: string): Promise<Task> {
  return invoke("add_task", {
    title,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function updateTask(
  id: number,
  changes: { title?: string; done?: boolean },
): Promise<void> {
  return invoke("update_task", {
    id,
    title: changes.title ?? null,
    done: changes.done ?? null,
  });
}

export async function deleteTask(id: number): Promise<void> {
  return invoke("delete_task", { id });
}
