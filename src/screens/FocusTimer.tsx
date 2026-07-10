import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CatMascot from "../components/CatMascot";
import { useSessions } from "../hooks/useSessions";
import { formatDuration } from "../lib/sessionStats";
import {
  getLiveDistractions,
  type Depth,
  type LiveDistraction,
} from "../lib/tauri";
import type { SessionContext } from "../types/navigation";

interface FocusTimerProps {
  active: boolean;
  session: SessionContext;
  remainingSeconds: number;
  isPaused: boolean;
  onStart: (s: { task: string; depth: Depth; plannedSeconds: number }) => void;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onEndEarly: () => void;
  onCancel: () => void;
  onBack: () => void;
}

const DEPTHS: Depth[] = ["light", "deep", "creative"];
const MIN_MIN = 5;
const MAX_MIN = 90;
const PX_PER_MIN = 10;

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** "45s" under a minute, else "2m 30s" (drops seconds when zero). */
function minSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function clock(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  let total: number;
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    total = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
  } else {
    total = (parseInt(t, 10) || 0) * 60;
  }
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.min(MAX_MIN * 60, Math.max(MIN_MIN * 60, total));
}

/**
 * Tape ruler. The arrow stays centered; the tape position reflects `minutes`.
 * In setup, dragging the tape sets the value. When `readOnly` (active session),
 * it just tracks the remaining time as a ticker — no drag.
 */
export function RulerPicker({
  minutes,
  onChange,
  readOnly = false,
}: {
  minutes: number;
  onChange: (m: number) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const drag = useRef<{ x: number; m: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (ref.current) setWidth(ref.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const offset = width / 2 - minutes * PX_PER_MIN;

  const onDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    drag.current = { x: e.clientX, m: minutes };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const next = Math.round(drag.current.m - dx / PX_PER_MIN);
    onChange(Math.min(MAX_MIN, Math.max(MIN_MIN, next)));
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const ticks = [];
  for (let m = 0; m <= MAX_MIN; m++) ticks.push(m);

  return (
    <div
      className={`ft-ruler${readOnly ? " ft-ruler-static" : ""}`}
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <div
        className="ft-ruler-track"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {ticks.map((m) => {
          const cls =
            m % 15 === 0
              ? "ft-tk ft-tk-major"
              : m % 5 === 0
                ? "ft-tk ft-tk-mid"
                : "ft-tk";
          return (
            <span
              key={m}
              className={cls}
              style={{ left: `${m * PX_PER_MIN}px` }}
            >
              {m % 15 === 0 && <span className="ft-tk-label">{m}</span>}
            </span>
          );
        })}
      </div>
      <div className="ft-ruler-arrow" aria-hidden />
    </div>
  );
}

export default function FocusTimer({
  active,
  session,
  remainingSeconds,
  isPaused,
  onStart,
  onPause,
  onResume,
  onExtend,
  onEndEarly,
  onCancel,
  onBack,
}: FocusTimerProps) {
  const { loadSessions, suggestLength } = useSessions();
  const [task, setTask] = useState("");
  const [depth, setDepth] = useState<Depth>("deep");
  const [durationSec, setDurationSec] = useState(25 * 60);
  const [editing, setEditing] = useState(false);
  const [distractions, setDistractions] = useState<LiveDistraction[]>([]);
  const touched = useRef(false);

  // Live per-app distraction time during the session.
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

  // Seed the suggested length from history until the user adjusts it.
  useEffect(() => {
    if (active) return;
    let cancelled = false;
    void (async () => {
      const data = await loadSessions(14);
      const suggestion = await suggestLength(depth, data);
      if (cancelled || touched.current) return;
      setDurationSec(
        Math.min(MAX_MIN * 60, Math.max(MIN_MIN * 60, suggestion.minutes * 60)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [active, depth, loadSessions, suggestLength]);

  const plannedSeconds = active ? session.plannedSeconds : durationSec;
  const elapsed = active ? Math.max(0, plannedSeconds - remainingSeconds) : 0;
  const displaySeconds = active ? remainingSeconds : durationSec;

  // Goal is scoped to this session: elapsed / planned.
  const goalDone = elapsed;
  const goalTarget = plannedSeconds;
  const goalPct =
    goalTarget > 0 ? Math.min(100, (goalDone / goalTarget) * 100) : 0;

  const startUnix = active ? session.startedAt : Math.floor(Date.now() / 1000);
  const endUnix = active
    ? session.startedAt + plannedSeconds
    : Math.floor(Date.now() / 1000) + plannedSeconds;

  const commitEdit = (text: string) => {
    const parsed = parseTime(text);
    if (parsed !== null) {
      touched.current = true;
      setDurationSec(parsed);
    }
    setEditing(false);
  };

  const start = () => {
    onStart({
      task: task.trim() || "Focus",
      depth,
      plannedSeconds: durationSec,
    });
  };

  return (
    <section
      className="focus-timer"
      data-screen={active ? "activeSession" : "taskSetup"}
    >
      <header className="ft-toprow">
        {!active && (
          <button
            type="button"
            className="ft-back"
            onClick={onBack}
            aria-label="Back"
          >
            ‹
          </button>
        )}
        <span className="ft-spacer" />
        {active ? (
          <span className="ft-badge">{session.depth}</span>
        ) : (
          <button
            type="button"
            className="ft-badge ft-badge-btn"
            onClick={() =>
              setDepth(DEPTHS[(DEPTHS.indexOf(depth) + 1) % DEPTHS.length])
            }
            title="Switch depth"
          >
            {depth}
          </button>
        )}
      </header>

      <div>
        <div className="ft-goal-row">
          <div className="ft-goal">
            <span className="ft-eyebrow">Session goal</span>
            <span className="ft-goal-value">
              {formatDuration(goalDone)}{" "}
              <span className="ft-goal-of">/ {formatDuration(goalTarget)}</span>
            </span>
            <div className="ft-goal-bar">
              <div className="ft-goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
          <CatMascot started={active} />
        </div>

        <RulerPicker
          minutes={
            active ? remainingSeconds / 60 : Math.round(durationSec / 60)
          }
          readOnly={active}
          onChange={(m) => {
            touched.current = true;
            setDurationSec(m * 60);
          }}
        />
      </div>

      <div className="ft-clock">
        {editing && !active ? (
          <input
            className="ft-time ft-time-input"
            type="text"
            inputMode="numeric"
            defaultValue={mmss(durationSec)}
            autoFocus
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commitEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                commitEdit((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Edit session length"
          />
        ) : (
          <button
            type="button"
            className="ft-time ft-time-btn"
            onClick={() => !active && setEditing(true)}
            disabled={active}
            title={active ? undefined : "Tap to set your time"}
          >
            {mmss(displaySeconds)}
          </button>
        )}
        <span className="ft-range">
          {clock(startUnix)} → {clock(endUnix)}
        </span>
      </div>

      {!active ? (
        <input
          className="ft-name"
          type="text"
          placeholder="What are you working on?"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
      ) : (
        <p className="ft-name ft-name-static">{session.task}</p>
      )}

      {active && distractions.length > 0 && (
        <div className="ft-distractions">
          <span className="ft-eyebrow">Distractions</span>
          <ul className="ft-distractions-list">
            {distractions.map((d) => (
              <li key={d.app} className="ft-distractions-row">
                <span className="ft-distractions-app">{d.app}</span>
                <span className="ft-distractions-time">
                  {minSec(d.seconds)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ft-controls">
        <button
          type="button"
          className="ft-btn ft-btn-side"
          onClick={active ? onEndEarly : onCancel}
          aria-label={active ? "End session" : "Cancel"}
        >
          ✕
        </button>
        <button
          type="button"
          className="ft-btn ft-btn-primary"
          onClick={active ? (isPaused ? onResume : onPause) : start}
          aria-label={
            active ? (isPaused ? "Resume" : "Pause") : "Start session"
          }
        >
          {active ? (isPaused ? "▶" : "❚❚") : "▶"}
        </button>
        <button
          type="button"
          className="ft-btn ft-btn-side"
          onClick={active ? onExtend : undefined}
          disabled={!active}
          aria-label="Extend 10 minutes"
        >
          ＋
        </button>
      </div>
    </section>
  );
}
