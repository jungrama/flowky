import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  // Celebrate a finished (non-abandoned) session with a quick confetti burst.
  // Use a dedicated, click-through canvas so it never blocks the rating buttons.
  useEffect(() => {
    if (status === "abandoned") return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
    document.body.appendChild(canvas);
    const fire = confetti.create(canvas, { resize: true, useWorker: true });

    const shots = [0, 180, 360];
    const timers = shots.map((delay) =>
      window.setTimeout(() => {
        void fire({
          particleCount: 60,
          spread: 70,
          startVelocity: 38,
          origin: { y: 0.35 },
          scalar: 0.9,
          disableForReducedMotion: true,
        });
      }, delay),
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      fire.reset();
      canvas.remove();
    };
  }, [status]);

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
    <section
      className="flex w-full max-w-sm flex-col items-center gap-2"
      data-screen="break"
    >
      <div className="border rounded-md w-full bg-gray-100">
        <img
          className="mx-auto h-auto w-[200px] object-contain"
          src={status === "abandoned" ? FINISHED_EARLY_MASCOT : FINISHED_MASCOT}
          alt=""
          aria-hidden
        />
      </div>
      <hr />
      <h2 className="text-2xl font-normal leading-[1.2] tracking-[-0.03em]">
        {status === "abandoned" ? "That's okay" : "Nice work!"}
      </h2>
      <p className="text-sm text-muted-foreground">{session.task}</p>

      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2">
        <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-4">
          <span className="text-2xl font-semibold text-foreground tabular-nums">
            {formatDuration(focusedSeconds)}
          </span>
          <span className="text-xs text-muted-foreground">Time focused</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-4">
          <span className="text-2xl font-semibold text-foreground tabular-nums">
            {session.interrupts}
          </span>
          <span className="text-xs text-muted-foreground">
            {interruptLabel}
          </span>
        </div>
        {distractSeconds > 0 && (
          <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-4">
            <span className="text-2xl font-semibold text-destructive tabular-nums">
              {formatDuration(distractSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">Lost focus</span>
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          How did that session feel?
        </p>
        <div
          className="flex justify-center gap-2"
          role="group"
          aria-label="Session quality rating"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "size-10 rounded-full border-border bg-card text-base font-medium text-foreground tabular-nums shadow-none transition-colors hover:border-primary hover:bg-muted hover:text-foreground",
                rating === value && "border-black hover:text-white",
              )}
              style={
                rating === value
                  ? { backgroundColor: "#000", color: "#fff" }
                  : undefined
              }
              aria-pressed={rating === value}
              aria-label={`${value} — ${RATING_LABELS[value - 1]}`}
              onClick={() => handleRate(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      <Badge
        variant="outline"
        className="gap-2 border-border bg-muted px-4 py-1 text-sm font-normal"
        aria-live="polite"
      >
        <span className="text-xs uppercase tracking-[0.04em] text-muted-foreground">
          Rest up
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {formatBreakTime(breakRemaining)}
        </span>
        <span className="text-xs text-muted-foreground">
          {breakMinutes} min to recharge
        </span>
      </Badge>

      <div className="mt-4 flex w-full flex-col gap-2">
        <Button
          type="button"
          className="h-auto border border-primary px-4 py-2 text-base"
          onClick={onStartNext}
        >
          Start next session
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto border-input bg-card px-4 py-2 text-base font-normal shadow-none hover:bg-muted hover:text-foreground"
          onClick={onViewReview}
        >
          See today&apos;s review
        </Button>
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
