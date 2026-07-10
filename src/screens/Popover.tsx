import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
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
      clearTimer = window.setTimeout(() => setDistractApp(null), DISTRACT_CLEAR_MS);
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
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
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
    <div className="popover ft-scope">
      {active ? (
        <>
          <header className="ft-toprow">
            <span className="ft-spacer" />
            <span className="ft-badge">{session.depth}</span>
          </header>

          <div className="ft-goal-row">
            <div className="ft-goal">
              <span className="ft-eyebrow">Goal</span>
              <span className="ft-goal-value">
                {formatDuration(elapsed)}{" "}
                <span className="ft-goal-of">/ {formatDuration(planned)}</span>
              </span>
              <div className="ft-goal-bar">
                <div className="ft-goal-fill" style={{ width: `${goalPct}%` }} />
              </div>
            </div>
            <CatMascot started />
          </div>

          <RulerPicker minutes={remaining / 60} readOnly onChange={() => {}} />

          <div className="ft-clock">
            <span className="ft-time">{mmss(remaining)}</span>
            <span className="ft-range">
              {clock(session.started_at)} → {clock(session.started_at + planned)}
            </span>
          </div>

          <p className="ft-name ft-name-static">{session.task}</p>

          <div className="ft-controls">
            <button
              type="button"
              className="ft-btn ft-btn-side"
              onClick={() => sendAction("end")}
              aria-label="End session"
            >
              ✕
            </button>
            <button
              type="button"
              className="ft-btn ft-btn-primary"
              onClick={() => sendAction(isPaused ? "resume" : "pause")}
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? "▶" : "❚❚"}
            </button>
            <button
              type="button"
              className="ft-btn ft-btn-side"
              onClick={() => sendAction("extend")}
              aria-label="Extend 10 minutes"
            >
              ＋
            </button>
          </div>

          {distractions.length > 0 ? (
            <div className="ft-distractions">
              <span className="ft-eyebrow">Distractions</span>
              <ul className="ft-distractions-list">
                {distractions.map((d) => (
                  <li key={d.app} className="ft-distractions-row">
                    <span className="ft-distractions-app">{d.app}</span>
                    <span className="ft-distractions-time">{minSec(d.seconds)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={`ft-distract-status${distractApp ? " is-on" : ""}`}>
              {distractApp
                ? `${distractApp} pulled you in`
                : "No distractions so far — nice one!"}
            </p>
          )}

          <button
            type="button"
            className="popover-open-btn"
            onClick={() => void openMainWindow()}
          >
            Open app
          </button>
        </>
      ) : (
        <div className="popover-empty">
          <CatMascot />
          <h3 className="popover-empty-title">{emptyCopy.title}</h3>
          <p className="popover-empty-subtitle">{emptyCopy.subtitle}</p>
          <button
            type="button"
            className="popover-open-btn"
            onClick={() => void openMainWindow()}
          >
            Open app
          </button>
        </div>
      )}
    </div>
  );
}
