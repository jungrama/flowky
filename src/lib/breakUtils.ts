import type { Depth } from "./tauri";

export function suggestBreakMinutes(
  focusedSeconds: number,
  depth: Depth,
): number {
  if (focusedSeconds < 20 * 60) return 5;
  if (depth === "deep" || focusedSeconds >= 45 * 60) return 15;
  return 10;
}

export function formatBreakTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
