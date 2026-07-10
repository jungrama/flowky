import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <section
      className="flex w-full max-w-sm flex-col items-center gap-6"
      data-screen="activeSession"
    >
      <div className="relative h-[220px] w-[220px]">
        <svg
          className="block"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden
        >
          <circle
            className="stroke-border"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
          />
          <circle
            className={cn(
              "stroke-primary [transition:stroke-dashoffset_0.25s_linear]",
              isPaused && "opacity-50",
            )}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-[2rem] font-medium text-foreground tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
          {isPaused && (
            <span className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
              Paused
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-normal leading-[1.2] tracking-[-0.03em]">
          {session.task}
        </h2>
        <p className="text-sm text-muted-foreground">
          Began {formatStartTime(session.startedAt)} · {session.depth}
          {session.interrupts > 0 && ` · ${session.interrupts} interruption${session.interrupts === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={isPaused ? onResume : onPause}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" variant="outline" onClick={onExtend}>
            +10 min
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onInterrupt}
        >
          Got distracted
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onEndEarly}
        >
          Done
        </Button>
      </div>
    </section>
  );
}
