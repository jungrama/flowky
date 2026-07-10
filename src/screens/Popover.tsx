import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import CatMascot from "../components/CatMascot";
import { formatDuration } from "../lib/sessionStats";
import {
  getLiveDistractions,
  getTraySession,
  openMainWindow,
  type LiveDistraction,
  type TraySession,
} from "../lib/tauri";
import { RulerPicker } from "./FocusTimer";

function minSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

const EMPTY: TraySession = {
  active: false,
  task: "",
  depth: "deep",
  status: "idle",
  remaining_seconds: 0,
  planned_seconds: 0,
  started_at: 0,
  interrupts: 0,
  ends_at: null,
};

const EMPTY_COPY: Record<
  TraySession["status"],
  { title: string; subtitle: string }
> = {
  idle: {
    title: "Ready when you are",
    subtitle: "Nothing running right now. Open Flowky to get started!",
  },
  running: {
    title: "In the zone",
    subtitle: "Your session is underway — you've got this!",
  },
  paused: {
    title: "Paused",
    subtitle: "Take your time — pick back up whenever you're ready.",
  },
  break: {
    title: "Taking a breather",
    subtitle: "Recharge for a bit — your next session is waiting.",
  },
};

const DISTRACT_CLEAR_MS = 20_000;

function sendAction(action: string): void {
  void emit("popover-action", { action });
}

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function clock(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const eyebrow = "text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
const sideBtn =
  "inline-flex size-12 items-center justify-center rounded-full bg-muted text-base text-muted-foreground transition hover:-translate-y-px hover:text-foreground";

export default function Popover() {
  const [session, setSession] = useState<TraySession>(EMPTY);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [distractApp, setDistractApp] = useState<string | null>(null);
  const [distractions, setDistractions] = useState<LiveDistraction[]>([]);

  useEffect(() => {
    void getTraySession().then(setSession);
    let unlistenSession: (() => void) | undefined;
    let unlistenDistract: (() => void) | undefined;
    let clearTimer: number | undefined;

    void listen<TraySession>("tray-session", (e) => setSession(e.payload)).then(
      (fn) => {
        unlistenSession = fn;
      },
    );

    // Auto-detected distraction from the Tier 3 watcher.
    void listen<string>("app-distraction", (e) => {
      setDistractApp(e.payload);
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(
        () => setDistractApp(null),
        DISTRACT_CLEAR_MS,
      );
    }).then((fn) => {
      unlistenDistract = fn;
    });

    return () => {
      unlistenSession?.();
      unlistenDistract?.();
      window.clearTimeout(clearTimer);
    };
  }, []);

  // Local 1s tick so the countdown moves while the popover is open.
  useEffect(() => {
    if (session.status !== "running" || session.ends_at == null) return;
    setNow(Math.floor(Date.now() / 1000));
    const id = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [session.status, session.ends_at]);

  const active = session.active && session.planned_seconds > 0;

  // Clear a stale distraction notice once the session is gone.
  useEffect(() => {
    if (!active) setDistractApp(null);
  }, [active]);

  // Live per-app distraction time — mirrors the main timer screen.
  useEffect(() => {
    if (!active) {
      setDistractions([]);
      return;
    }
    let cancelled = false;
    const load = () =>
      void getLiveDistractions().then((d) => {
        if (!cancelled) setDistractions(d);
      });
    load();
    const id = window.setInterval(load, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active]);

  const remaining = useMemo(() => {
    if (session.status === "running" && session.ends_at != null) {
      return Math.max(0, session.ends_at - now);
    }
    return session.remaining_seconds;
  }, [session.status, session.ends_at, session.remaining_seconds, now]);

  const planned = session.planned_seconds;
  const elapsed = Math.max(0, planned - remaining);
  const goalPct = planned > 0 ? Math.min(100, (elapsed / planned) * 100) : 0;
  const isPaused = session.status === "paused";
  const emptyCopy = EMPTY_COPY[session.status] ?? EMPTY_COPY.idle;

  return (
    <div className="m-1 flex max-h-[calc(100vh-0.5rem)] min-h-[calc(100vh-0.5rem)] flex-col items-center gap-3 overflow-y-auto rounded-xl border border-input bg-card p-4 text-left text-foreground">
      {active ? (
        <>
          <header className="flex w-full items-center gap-2">
            <span className="flex-1" />
            <span className="rounded-md bg-primary/[0.18] px-[9px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
              {session.depth}
            </span>
          </header>

          <div className="w-full">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className={eyebrow}>Session goal</span>
                <span className="text-xl font-semibold">
                  {formatDuration(elapsed)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    / {formatDuration(planned)}
                  </span>
                </span>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-[400ms]"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
              </div>
              <CatMascot started className="w-[96px]" />
            </div>

            <RulerPicker
              minutes={remaining / 60}
              readOnly
              onChange={() => {}}
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[3rem] font-medium leading-none tracking-[0.04em] text-foreground">
              {mmss(remaining)}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {clock(session.started_at)} →{" "}
              {clock(session.started_at + planned)}
            </span>
          </div>

          <p className="m-0 self-center text-sm text-muted-foreground">
            {session.task}
          </p>

          <div className="flex items-center justify-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={sideBtn}
                  onClick={() => sendAction("end")}
                  aria-label="End session"
                >
                  ✕
                </button>
              </TooltipTrigger>
              <TooltipContent>End session</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-[22px] text-primary-foreground shadow-[0_8px_22px_rgba(17,17,17,0.28)] transition hover:-translate-y-0.5"
                  onClick={() => sendAction(isPaused ? "resume" : "pause")}
                  aria-label={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? "▶" : "❚❚"}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isPaused ? "Resume" : "Pause"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={sideBtn}
                  onClick={() => sendAction("extend")}
                  aria-label="Extend 10 minutes"
                >
                  ＋
                </button>
              </TooltipTrigger>
              <TooltipContent>Add 10 minutes</TooltipContent>
            </Tooltip>
          </div>

          {distractions.length > 0 ? (
            <div className="flex w-full max-w-[260px] flex-col gap-1 self-center">
              <span className={eyebrow}>Distractions</span>
              <ul className="flex flex-col gap-1">
                {distractions.map((d) => (
                  <li
                    key={d.app}
                    className="flex justify-between gap-4 text-sm text-foreground"
                  >
                    <span>{d.app}</span>
                    <span className="tabular-nums text-foreground">
                      {minSec(d.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p
              className={cn(
                "m-0 self-center text-center text-xs text-muted-foreground",
                distractApp && "font-medium text-foreground",
              )}
            >
              {distractApp
                ? `${distractApp} pulled you in`
                : "No distractions so far — nice one!"}
            </p>
          )}

          <Button
            type="button"
            className="mt-auto w-full"
            onClick={() => void openMainWindow()}
          >
            Open app
          </Button>
        </>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 py-6">
          <CatMascot />
          <h3 className="m-0 text-xl font-semibold text-foreground">
            {emptyCopy.title}
          </h3>
          <p className="m-0 max-w-[24ch] text-center text-sm leading-snug text-muted-foreground">
            {emptyCopy.subtitle}
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => void openMainWindow()}
          >
            Open app
          </Button>
        </div>
      )}
    </div>
  );
}
