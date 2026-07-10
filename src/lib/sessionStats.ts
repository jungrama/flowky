import type { Session } from "./tauri";

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function dayRange(date: Date): [number, number] {
  const start = startOfDay(date);
  return [start, start + 86_400];
}

export function todayRange(): [number, number] {
  return dayRange(new Date());
}

export function yesterdayRange(): [number, number] {
  const todayStart = startOfDay(new Date());
  return [todayStart - 86_400, todayStart];
}

export function sessionsInRange(
  sessions: Session[],
  start: number,
  end: number,
): Session[] {
  return sessions.filter((s) => s.started_at >= start && s.started_at < end);
}

export function sessionsForDay(sessions: Session[], date: Date): Session[] {
  const [start, end] = dayRange(date);
  return sessionsInRange(sessions, start, end);
}

export function sessionsForToday(sessions: Session[]): Session[] {
  const [start, end] = todayRange();
  return sessionsInRange(sessions, start, end);
}

export function sessionsForYesterday(sessions: Session[]): Session[] {
  const [start, end] = yesterdayRange();
  return sessionsInRange(sessions, start, end);
}

export function last7Days(): Date[] {
  return last7DaysEnding(new Date());
}

export function last7DaysEnding(end: Date): Date[] {
  const days: Date[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - offset);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

export function dayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function scoreTone(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export function sessionDotTone(session: Session): "green" | "coral" {
  return session.interrupts === 0 ? "green" : "coral";
}

export function totalInterruptions(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + s.interrupts, 0);
}

export function completedSessionCount(sessions: Session[]): number {
  return sessions.filter((s) => s.status !== "abandoned").length;
}

export function deepFocusSeconds(sessions: Session[]): number {
  return sessions
    .filter((s) => s.depth === "deep")
    .reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning!";
  if (hour < 17) return "Afternoon!";
  return "Evening!";
}

export type TimeOfDay = "morning" | "afternoon" | "night";

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

export function fullDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

export function weekRangeLabel(days: Date[]): string {
  if (days.length === 0) return "";
  const start = days[0];
  const end = days[days.length - 1];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

export function avgInterruptionsPerSession(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  return totalInterruptions(sessions) / sessions.length;
}

export function totalFocusSeconds(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function daysNeededThroughMonth(month: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const diffDays = Math.ceil((today.getTime() - monthStart.getTime()) / 86_400_000);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Math.max(90, diffDays + daysInMonth);
}

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
}

export function buildMonthGrid(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startPad = firstDay.getDay();
  const cells: CalendarCell[] = [];

  for (let i = startPad - 1; i >= 0; i -= 1) {
    cells.push({
      date: new Date(year, monthIndex, -i),
      inMonth: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push({
      date: new Date(year, monthIndex, day),
      inMonth: true,
    });
  }

  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: new Date(year, monthIndex + 1, trailing),
      inMonth: false,
    });
    trailing += 1;
  }

  return cells;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function heatmapIntensity(score: number): number {
  return 0.2 + (Math.min(100, Math.max(0, score)) / 100) * 0.8;
}

export function dayInsight(sessions: Session[], date: Date): string {
  const label = fullDayLabel(date);
  if (sessions.length === 0) return `${label} — no sessions, take it easy`;

  const clean = sessions.filter((s) => s.interrupts === 0).length;
  const deep = sessions.filter((s) => s.depth === "deep").length;
  const completed = completedSessionCount(sessions);

  if (clean === sessions.length && deep > 0) {
    return `${label} — ${deep} clean deep session${deep === 1 ? "" : "s"}!`;
  }
  if (clean === sessions.length) {
    return `${label} — ${sessions.length} clean session${sessions.length === 1 ? "" : "s"}, nice!`;
  }
  if (completed < sessions.length) {
    return `${label} — ${completed} of ${sessions.length} done, keep going!`;
  }

  const interrupts = totalInterruptions(sessions);
  return `${label} — ${sessions.length} session${sessions.length === 1 ? "" : "s"}, ${interrupts} interruption${interrupts === 1 ? "" : "s"}`;
}
