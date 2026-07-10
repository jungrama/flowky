import { useEffect, useMemo, useState, type CSSProperties } from "react";
import InfoHint from "../components/InfoHint";
import { useSessions } from "../hooks/useSessions";
import {
  buildMonthGrid,
  formatDuration,
  heatmapIntensity,
  monthLabel,
  scoreTone,
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
      className="screen screen-review screen-heatmap"
      data-screen="calendarHeatmap"
    >
      <div className="heatmap-nav">
        <button
          type="button"
          className="btn btn-ghost heatmap-nav-btn"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="heatmap-month-label">{monthLabel(viewMonth)}</span>
        <button
          type="button"
          className="btn btn-ghost heatmap-nav-btn"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div
        className="heatmap-grid"
        role="grid"
        aria-label={`Focus heatmap for ${monthLabel(viewMonth)}`}
      >
        <div className="heatmap-weekdays" role="row">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="heatmap-weekday" role="columnheader">
              {label}
            </span>
          ))}
        </div>
        <div className="heatmap-cells">
          {dayData.map((day) => {
            const hasData = day.sessionCount > 0 && day.score !== null;
            const tone = hasData ? scoreTone(day.score!) : "empty";
            const intensity = hasData ? heatmapIntensity(day.score!) : 0;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                role="gridcell"
                className={[
                  "heatmap-cell",
                  !day.inMonth && "heatmap-cell-outside",
                  hasData && `heatmap-cell-${tone}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  hasData
                    ? ({ "--heatmap-intensity": intensity } as CSSProperties)
                    : undefined
                }
                title={dayTooltip(day)}
                aria-label={dayTooltip(day)}
                onClick={() => onOpenDay(day.date)}
              >
                <span className="heatmap-cell-day">{day.date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Low</span>
        <span className="heatmap-legend-gradient" aria-hidden="true" />
        <span className="heatmap-legend-label">High</span>
        <InfoHint
          align="end"
          placement="below"
          text="Each day is shaded by its focus score: lighter = lower, darker = higher."
        />
      </div>
    </section>
  );
}
