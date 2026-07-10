import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import InfoHint from "../components/InfoHint";
import { useSessions } from "../hooks/useSessions";
import {
  buildMonthGrid,
  formatDuration,
  heatmapIntensity,
  monthLabel,
  sessionsForDay,
  totalFocusSeconds,
  WEEKDAY_LABELS,
  daysNeededThroughMonth,
} from "../lib/sessionStats";

interface CalendarHeatmapProps {
  onOpenDay: (date: Date) => void;
}

interface DayData {
  date: Date;
  inMonth: boolean;
  score: number | null;
  sessionCount: number;
  focusSeconds: number;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarHeatmap({ onOpenDay }: CalendarHeatmapProps) {
  const { sessions, loadSessions, computeScore } = useSessions();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [dayData, setDayData] = useState<DayData[]>([]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  useEffect(() => {
    void loadSessions(daysNeededThroughMonth(viewMonth));
  }, [loadSessions, viewMonth]);

  useEffect(() => {
    let cancelled = false;

    async function loadDays() {
      const data = await Promise.all(
        grid.map(async ({ date, inMonth }) => {
          const daySessions = sessionsForDay(sessions, date);
          if (daySessions.length === 0) {
            return {
              date,
              inMonth,
              score: null,
              sessionCount: 0,
              focusSeconds: 0,
            };
          }
          const score = await computeScore(daySessions);
          return {
            date,
            inMonth,
            score,
            sessionCount: daySessions.length,
            focusSeconds: totalFocusSeconds(daySessions),
          };
        }),
      );
      if (!cancelled) setDayData(data);
    }

    void loadDays();
    return () => {
      cancelled = true;
    };
  }, [sessions, computeScore, grid]);

  function shiftMonth(delta: number) {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  }

  function dayTooltip(day: DayData): string {
    const label = day.date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (day.sessionCount === 0) return `${label} — a rest day`;
    const scorePart =
      day.score !== null ? ` · score ${Math.round(day.score)}` : "";
    return `${label} — ${day.sessionCount} session${day.sessionCount === 1 ? "" : "s"} · ${formatDuration(day.focusSeconds)} focused${scorePart}`;
  }

  return (
    <section
      className="flex w-full max-w-sm flex-col items-center gap-4"
      data-screen="calendarHeatmap"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-w-10 px-2 text-xl leading-none"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </Button>
        <span className="font-medium tabular-nums">{monthLabel(viewMonth)}</span>
        <Button
          type="button"
          variant="ghost"
          className="min-w-10 px-2 text-xl leading-none"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </Button>
      </div>

      <div
        className="w-full"
        role="grid"
        aria-label={`Focus heatmap for ${monthLabel(viewMonth)}`}
      >
        <div className="mb-1 grid grid-cols-7 gap-1" role="row">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="text-center text-xs text-muted-foreground"
              role="columnheader"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dayData.map((day) => {
            const hasData = day.sessionCount > 0 && day.score !== null;
            const intensity = hasData ? heatmapIntensity(day.score!) : 0;
            const pct = Math.round(intensity * 45);

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                role="gridcell"
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border text-xs text-foreground transition-colors hover:border-primary",
                  !day.inMonth && "opacity-35",
                )}
                style={
                  hasData
                    ? {
                        background: `color-mix(in srgb, #111 ${pct}%, #fff)`,
                      }
                    : undefined
                }
                title={dayTooltip(day)}
                aria-label={dayTooltip(day)}
                onClick={() => onOpenDay(day.date)}
              >
                <span className="pointer-events-none">
                  {day.date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">Low</span>
        <span
          className="h-[0.6rem] w-[120px] rounded-full border bg-[linear-gradient(90deg,#fff_0%,color-mix(in_srgb,#111_45%,#fff)_100%)]"
          aria-hidden="true"
        />
        <span className="text-xs text-muted-foreground">High</span>
        <InfoHint
          align="end"
          placement="below"
          text="Each day is shaded by its focus score: lighter = lower, darker = higher."
        />
      </div>
    </section>
  );
}
