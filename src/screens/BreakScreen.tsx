import { useCallback, useEffect, useState } from "react";
import { formatDuration } from "../lib/sessionStats";
import { suggestBreakMinutes, formatBreakTime } from "../lib/breakUtils";
import { FINISHED_MASCOT, FINISHED_EARLY_MASCOT } from "../lib/mascots";
import type { Session, SessionStatus } from "../lib/tauri";
import type { SessionContext } from "../types/navigation";

interface BreakScreenProps {
  session: SessionContext;
  focusedSeconds: number;
  distractSeconds?: number;
  status: SessionStatus;
  onRate: (rating: number) => void;
  onStartNext: () => void;
  onViewReview: () => void;
}

const RATING_LABELS = ["Rough", "Meh", "OK", "Nice one", "Full flow"];

export default function BreakScreen({
  session,
  focusedSeconds,
  distractSeconds = 0,
  status,
  onRate,
  onStartNext,
  onViewReview,
}: BreakScreenProps) {
  const breakMinutes = suggestBreakMinutes(focusedSeconds, session.depth);
  const breakSecondsTotal = breakMinutes * 60;
  const [breakRemaining, setBreakRemaining] = useState(breakSecondsTotal);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    if (breakRemaining <= 0) return;
    const id = window.setInterval(() => {
      setBreakRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [breakRemaining]);

  const handleRate = useCallback(
    (value: number) => {
      setRating(value);
      onRate(value);
    },
    [onRate],
  );

  const interruptLabel =
    session.interrupts === 0
      ? "No interruptions!"
      : `${session.interrupts} interruption${session.interrupts === 1 ? "" : "s"}`;

  return (
    <section className="screen screen-break" data-screen="break">
      <img
        className="break-mascot"
        src={status === "abandoned" ? FINISHED_EARLY_MASCOT : FINISHED_MASCOT}
        alt=""
        aria-hidden
      />
      <h2>{status === "abandoned" ? "That's okay" : "Nice work!"}</h2>
      <p className="screen-subtitle">{session.task}</p>

      <div className="break-summary">
        <div className="break-stat">
          <span className="break-stat-value">
            {formatDuration(focusedSeconds)}
          </span>
          <span className="break-stat-label">Time focused</span>
        </div>
        <div className="break-stat">
          <span className="break-stat-value">{session.interrupts}</span>
          <span className="break-stat-label">{interruptLabel}</span>
        </div>
        {distractSeconds > 0 && (
          <div className="break-stat">
            <span className="break-stat-value break-stat-value-distract">
              {formatDuration(distractSeconds)}
            </span>
            <span className="break-stat-label">Lost focus</span>
          </div>
        )}
      </div>

      <div className="rating-group">
        <p className="form-label">How did that session feel?</p>
        <div
          className="rating-options"
          role="group"
          aria-label="Session quality rating"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`rating-option${rating === value ? " rating-option-active" : ""}`}
              aria-pressed={rating === value}
              aria-label={`${value} — ${RATING_LABELS[value - 1]}`}
              onClick={() => handleRate(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="break-pill" aria-live="polite">
        <span className="break-pill-label">Rest up</span>
        <span className="break-pill-time">
          {formatBreakTime(breakRemaining)}
        </span>
        <span className="break-pill-hint">{breakMinutes} min to recharge</span>
      </div>

      <div className="screen-actions">
        <button type="button" className="btn btn-primary" onClick={onStartNext}>
          Start next session
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onViewReview}
        >
          See today&apos;s review
        </button>
      </div>
    </section>
  );
}

export function buildSessionRecord(
  ctx: SessionContext,
  focusedSeconds: number,
  status: SessionStatus,
  rating?: number,
  id?: number,
): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    task: ctx.task,
    depth: ctx.depth,
    started_at: ctx.startedAt,
    ended_at: now,
    duration: focusedSeconds,
    planned: ctx.plannedSeconds,
    interrupts: ctx.interrupts,
    rating,
    status,
  };
}
