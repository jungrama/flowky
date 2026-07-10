import { useEffect, useLayoutEffect, useRef, useState } from "react";
import CatMascot from "../components/CatMascot";
import TaskDrawer from "../components/TaskDrawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
  initialTask?: string;
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
      className={cn(
        "relative h-[62px] w-full touch-none select-none overflow-hidden border-y border-border",
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-[2] before:w-12 before:bg-gradient-to-r before:from-background before:to-transparent",
        "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-[2] after:w-12 after:bg-gradient-to-l after:from-background after:to-transparent",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
      )}
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <div
        className="absolute left-0 top-[26px] h-[22px] will-change-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {ticks.map((m) => {
          const major = m % 15 === 0;
          const mid = !major && m % 5 === 0;
          return (
            <span
              key={m}
              className={cn(
                "absolute w-px",
                major
                  ? "top-0.5 h-4 bg-foreground"
                  : mid
                    ? "top-[5px] h-[11px] bg-muted-foreground"
                    : "top-2 h-2 bg-border",
              )}
              style={{ left: `${m * PX_PER_MIN}px` }}
            >
              {major && (
                <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 text-xs tabular-nums text-muted-foreground">
                  {m}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <div
        className="absolute bottom-2 left-1/2 z-[3] h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-primary"
        aria-hidden
      />
    </div>
  );
}

export default function FocusTimer({
  active,
  session,
  initialTask = "",
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
  const [task, setTask] = useState(initialTask);
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

  const eyebrow =
    "text-[10px] uppercase tracking-[0.16em] text-muted-foreground";
  const badge =
    "rounded-md bg-primary/[0.18] px-[9px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.06em] text-primary";

  return (
    <section
      className="flex min-h-[min(600px,100vh)] w-full flex-col gap-6 text-left text-foreground"
      data-screen={active ? "activeSession" : "taskSetup"}
    >
      <header className="flex items-center gap-2">
        {!active && (
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-[9px] text-[26px] leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onBack}
            aria-label="Back"
          >
            ‹
          </button>
        )}
        <span className="flex-1" />
        {active ? (
          <span className={badge}>{session.depth}</span>
        ) : (
          <button
            type="button"
            className={cn(badge, "cursor-pointer")}
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className={eyebrow}>Session goal</span>
            <span className="text-xl font-semibold">
              {formatDuration(goalDone)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {formatDuration(goalTarget)}
              </span>
            </span>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-[400ms]"
                style={{ width: `${goalPct}%` }}
              />
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

      <div className="mt-2 flex flex-col items-center gap-1">
        {editing && !active ? (
          <input
            className="w-[6.5ch] border-0 border-b-2 border-primary bg-transparent py-0.5 text-center font-mono text-[3.4rem] font-medium leading-none tracking-[0.04em] text-foreground outline-none"
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
            className="rounded-[10px] px-2 py-0.5 font-mono text-[3.4rem] font-medium leading-none tracking-[0.04em] text-foreground transition-colors enabled:hover:bg-muted disabled:cursor-default"
            onClick={() => !active && setEditing(true)}
            disabled={active}
            title={active ? undefined : "Tap to set your time"}
          >
            {mmss(displaySeconds)}
          </button>
        )}
        <span className="text-sm tabular-nums text-muted-foreground">
          {clock(startUnix)} → {clock(endUnix)}
        </span>
      </div>

      {!active ? (
        <TaskDrawer onPick={(title) => setTask(title)}>
          <button
            type="button"
            className={cn(
              "w-full max-w-[240px] self-center border-0 border-b border-border bg-transparent py-1.5 text-center text-sm outline-none focus:border-primary",
              task ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {task || "What are you working on?"}
          </button>
        </TaskDrawer>
      ) : (
        <p className="m-0 self-center text-sm text-muted-foreground">
          {session.task}
        </p>
      )}

      {active && distractions.length > 0 && (
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
      )}

      <div className="mt-auto flex items-center justify-center gap-6 pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-base text-muted-foreground transition enabled:hover:-translate-y-px enabled:hover:text-foreground disabled:cursor-default disabled:opacity-40"
              onClick={active ? onEndEarly : onCancel}
              aria-label={active ? "End session" : "Cancel"}
            >
              ✕
            </button>
          </TooltipTrigger>
          <TooltipContent>{active ? "End session" : "Cancel"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-[22px] text-primary-foreground shadow-[0_8px_22px_rgba(17,17,17,0.28)] transition hover:-translate-y-0.5"
              onClick={active ? (isPaused ? onResume : onPause) : start}
              aria-label={
                active ? (isPaused ? "Resume" : "Pause") : "Start session"
              }
            >
              {active ? (isPaused ? "▶" : "❚❚") : "▶"}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {active ? (isPaused ? "Resume" : "Pause") : "Start session"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-base text-muted-foreground transition enabled:hover:-translate-y-px enabled:hover:text-foreground disabled:cursor-default disabled:opacity-40"
              onClick={active ? onExtend : undefined}
              disabled={!active}
              aria-label="Extend 10 minutes"
            >
              ＋
            </button>
          </TooltipTrigger>
          <TooltipContent>Add 10 minutes</TooltipContent>
        </Tooltip>
      </div>
    </section>
  );
}
