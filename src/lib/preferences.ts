const AUTO_DETECT_KEY = "flowky.autoDetectContextSwitch";
const PROMPT_DISMISSED_KEY = "flowky.contextSwitchPromptDismissed";
const USER_NAME_KEY = "flowky.userName";

export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY)?.trim() ?? "";
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name.trim());
}

const SESSION_NOTIFS_KEY = "flowky.sessionNotifications";
const IDLE_REMINDERS_KEY = "flowky.idleReminders";

/** Default on — opt-out booleans (absent = enabled). */
export function getSessionNotifications(): boolean {
  return localStorage.getItem(SESSION_NOTIFS_KEY) !== "false";
}

export function setSessionNotifications(enabled: boolean): void {
  localStorage.setItem(SESSION_NOTIFS_KEY, String(enabled));
}

export function getIdleReminders(): boolean {
  return localStorage.getItem(IDLE_REMINDERS_KEY) !== "false";
}

export function setIdleReminders(enabled: boolean): void {
  localStorage.setItem(IDLE_REMINDERS_KEY, String(enabled));
}

export function getAutoDetectContextSwitch(): boolean {
  return localStorage.getItem(AUTO_DETECT_KEY) === "true";
}

export function setAutoDetectContextSwitch(enabled: boolean): void {
  localStorage.setItem(AUTO_DETECT_KEY, String(enabled));
}

export function isContextSwitchPromptDismissed(): boolean {
  return localStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
}

export function dismissContextSwitchPrompt(): void {
  localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
}
