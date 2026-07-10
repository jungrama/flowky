import { useEffect, useMemo, useState } from "react";
import InfoHint from "../components/InfoHint";
import { useSessions } from "../hooks/useSessions";
import { getInterruptCategoryLabel } from "../lib/interruptCategories";
import { getInterruptionBreakdown, type InterruptionBreakdown } from "../lib/tauri";
import {
  avgInterruptionsPerSession,
  completedSessionCount,
  dayInsight,
  dayLabel,
  deepFocusSeconds,
  formatDuration,
  last7Days,
  scoreTone,
  sessionDotTone,
  sessionsForDay,
  weekRangeLabel,
} from "../lib/sessionStats";

type WeeklySummaryProps = Record<string, never>;

interface DayScore {
  date: Date;
  label: string;
  score: number | null;
  sessions: ReturnType<typeof sessionsForDay>;
}

export default function WeeklySummary(_props: WeeklySummaryProps) {
  const { sessions, loadSessions, computeScore } = useSessions();
  const [chartScores, setChartScores] = useState<DayScore[]>([]);
  const [interruptBreakdown, setInterruptBreakdown] = useState<InterruptionBreakdown[]>([]);

  useEffect(() => {
    void loadSessions(7);
  }, [loadSessions]);

  useEffect(() => {
    let cancelled = false;
    void getInterruptionBreakdown(7).then((breakdown) => {
      if (!cancelled) setInterruptBreakdown(breakdown);
    });
    return () => {
      cancelled = true;
    };
  }, [sessions]);

  const days = useMemo(() => last7Days(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      const scores = await Promise.all(
        days.map(async (date) => {
          const daySessions = sessionsForDay(sessions, date);
          if (daySessions.length === 0) {
            return { date, label: dayLabel(date), score: null, sessions: daySessions };
          }
          const score = await computeScore(daySessions);
          return { date, label: dayLabel(date), score, sessions: daySessions };
        }),
      );
      if (!cancelled) setChartScores(scores);
    }

    void loadChart();
    return () => {
      cancelled = true;
    };
  }, [sessions, computeScore, days]);

  const weekSessions = useMemo(() => sessions, [sessions]);
  const hasWeekData = weekSessions.length > 0;

  const deepFocus = useMemo(
    () => formatDuration(deepFocusSeconds(weekSessions)),
    [weekSessions],
  );
  const completed = useMemo(
    () => completedSessionCount(weekSessions),
    [weekSessions],
  );
  const avgInterrupts = useMemo(
    () => avgInterruptionsPerSession(weekSessions),
    [weekSessions],
  );

  const { bestDay, worstDay } = useMemo(() => {
    const withScores = chartScores.filter((d) => d.score !== null);
    if (withScores.length === 0) return { bestDay: null, worstDay: null };

    const best = withScores.reduce((a, b) =>
      (a.score ?? 0) >= (b.score ?? 0) ? a : b,
    );
    const worst = withScores.reduce((a, b) =>
      (a.score ?? 0) <= (b.score ?? 0) ? a : b,
    );

    return {
      bestDay: best.score === worst.score ? null : best,
      worstDay: best.score === worst.score ? null : worst,
    };
  }, [chartScores]);

  const maxChartScore = Math.max(
    100,
    ...chartScores.map((d) => d.score ?? 0),
  );

  return (
    <section className="screen screen-review screen-weekly" data-screen="weeklySummary">
      <h2>This week</h2>
      <p className="screen-subtitle">{weekRangeLabel(days)}</p>

      <div className="review-chart" aria-label="7-day focus scores">
        <div className="review-chart-bars">
          {chartScores.map((day) => {
            const height =
              day.score !== null ? (day.score / maxChartScore) * 100 : 4;
            const barTone =
              day.score !== null ? scoreTone(day.score) : "empty";
            return (
              <div key={day.date.toISOString()} className="review-chart-col">
                <div
                  className={`review-chart-bar review-chart-bar-${barTone}`}
                  style={{ height: `${height}%` }}
                  title={
                    day.score !== null
                      ? `${day.label}: ${Math.round(day.score)}`
                      : `${day.label}: no sessions`
                  }
                />
                <span className="review-chart-label">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <span className="stat-label">
            Deep focus
            <InfoHint
              align="start"
              text="All the hours you spent focused this week. Nice work!"
            />
          </span>
          <span className="stat-value stat-value-sm">
            {hasWeekData ? deepFocus : "—"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            Cleared
            <InfoHint text="Sessions you finished this week instead of stopping early." />
          </span>
          <span className="stat-value">
            {hasWeekData ? completed : "—"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            Avg interrupts
            <InfoHint
              align="end"
              text="How many distractions popped up each session this week — fewer is better."
            />
          </span>
          <span className="stat-value">
            {hasWeekData ? avgInterrupts.toFixed(1) : "—"}
          </span>
        </div>
      </div>

      {interruptBreakdown.length > 0 && (
        <div className="weekly-interrupt-breakdown">
          <p className="form-label">What pulled you away</p>
          <ul className="weekly-interrupt-list">
            {interruptBreakdown.map((entry) => (
              <li key={entry.interrupt_type} className="weekly-interrupt-item">
                <span className="weekly-interrupt-label">
                  {getInterruptCategoryLabel(entry.interrupt_type)}
                </span>
                <span className="weekly-interrupt-count">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(bestDay || worstDay) && (
        <div className="weekly-callouts">
          {bestDay && (
            <div className="weekly-callout weekly-callout-best">
              <span className="weekly-callout-tag">Best day</span>
              <span className="weekly-callout-text">
                {dayInsight(bestDay.sessions, bestDay.date)}
              </span>
            </div>
          )}
          {worstDay && (
            <div className="weekly-callout weekly-callout-worst">
              <span className="weekly-callout-tag">Toughest day</span>
              <span className="weekly-callout-text">
                {dayInsight(worstDay.sessions, worstDay.date)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="review-sessions weekly-days">
        <p className="form-label">Sessions by day</p>
        {!hasWeekData ? (
          <p className="screen-subtitle">No sessions logged yet — let's get started!</p>
        ) : (
          <div className="weekly-day-list">
            {[...chartScores].reverse().map((day) => {
              const dayHasSessions = day.sessions.length > 0;
              if (!dayHasSessions) return null;

              return (
                <details key={day.date.toISOString()} className="weekly-day-details">
                  <summary className="weekly-day-summary">
                    <span className="weekly-day-label">{day.label}</span>
                    <span className="weekly-day-meta">
                      {day.sessions.length} session
                      {day.sessions.length === 1 ? "" : "s"}
                      {day.score !== null && (
                        <span
                          className={`weekly-day-score weekly-day-score-${scoreTone(day.score)}`}
                        >
                          {Math.round(day.score)}
                        </span>
                      )}
                    </span>
                  </summary>
                  <ul className="review-session-list">
                    {day.sessions.map((session) => (
                      <li
                        key={session.id ?? session.started_at}
                        className="review-session-item"
                      >
                        <span
                          className={`review-session-dot review-session-dot-${sessionDotTone(session)}`}
                          aria-hidden="true"
                        />
                        <div className="review-session-info">
                          <span className="review-session-task">{session.task}</span>
                          <span className="review-session-meta">
                            {formatDuration(session.duration ?? 0)}
                            {session.interrupts > 0
                              ? ` · ${session.interrupts} interrupt${session.interrupts === 1 ? "" : "s"}`
                              : " · no interruptions"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
