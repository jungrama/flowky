import type { SessionContext } from "../types/navigation";

interface ActiveSessionProps {
  session: SessionContext;
  remainingSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onInterrupt: () => void;
  onEndEarly: () => void;
}

const RING_SIZE = 220;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatStartTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActiveSession({
  session,
  remainingSeconds,
  isPaused,
  onPause,
  onResume,
  onExtend,
  onInterrupt,
  onEndEarly,
}: ActiveSessionProps) {
  const progress = Math.min(1, remainingSeconds / session.plannedSeconds);
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <section className="screen screen-active" data-screen="activeSession">
      <div className={`countdown-ring${isPaused ? " countdown-ring-paused" : ""}`}>
        <svg
          className="countdown-ring-svg"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden
        >
          <circle
            className="countdown-ring-track"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
          />
          <circle
            className="countdown-ring-progress"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <div className="countdown-ring-center">
          <span className="timer-display">{formatTime(remainingSeconds)}</span>
          {isPaused && <span className="countdown-paused-label">Paused</span>}
        </div>
      </div>

      <div className="session-meta">
        <h2 className="session-task">{session.task}</h2>
        <p className="screen-subtitle">
          Began {formatStartTime(session.startedAt)} · {session.depth}
          {session.interrupts > 0 && ` · ${session.interrupts} interruption${session.interrupts === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="screen-actions session-actions">
        <div className="action-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={isPaused ? onResume : onPause}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onExtend}>
            +10 min
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onInterrupt}>
          Got distracted
        </button>
        <button type="button" className="btn btn-ghost" onClick={onEndEarly}>
          Done
        </button>
      </div>
    </section>
  );
}
