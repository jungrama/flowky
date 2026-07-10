import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import InfoHint from "../components/InfoHint";
import { useSessions } from "../hooks/useSessions";
import { getInterruptCategoryLabel } from "../lib/interruptCategories";
import {
  getInterruptionBreakdown,
  type InterruptionBreakdown,
} from "../lib/tauri";
import {
  avgInterruptionsPerSession,
  completedSessionCount,
  dayInsight,
  dayLabel,
  deepFocusSeconds,
  formatDuration,
  last7Days,
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

const STAT_CARD_CLASS = "gap-1 rounded-lg px-2 py-4 shadow-none";
const STAT_LABEL_CLASS =
  "inline-flex items-center gap-[5px] text-xs text-muted-foreground";
const STAT_VALUE_CLASS = "font-semibold text-foreground tabular-nums";

export default function WeeklySummary(_props: WeeklySummaryProps) {
  const { sessions, loadSessions, computeScore } = useSessions();
  const [chartScores, setChartScores] = useState<DayScore[]>([]);
  const [interruptBreakdown, setInterruptBreakdown] = useState<
    InterruptionBreakdown[]
  >([]);

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
            return {
              date,
              label: dayLabel(date),
              score: null,
              sessions: daySessions,
            };
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

  const maxChartScore = Math.max(100, ...chartScores.map((d) => d.score ?? 0));

  return (
    <section
      className="flex w-full max-w-sm flex-col items-center gap-4"
      data-screen="weeklySummary"
    >
      <h2 className="text-2xl font-normal tracking-[-0.03em]">This week</h2>
      <p className="text-sm text-muted-foreground">{weekRangeLabel(days)}</p>

      <Card
        className="w-full rounded-lg p-4 shadow-none"
        aria-label="7-day focus scores"
      >
        <div className="flex h-24 items-end justify-between gap-1">
          {chartScores.map((day) => {
            const height =
              day.score !== null ? (day.score / maxChartScore) * 100 : 4;
            return (
              <div
                key={day.date.toISOString()}
                className="flex h-full flex-1 flex-col items-center gap-1"
              >
                <div
                  className={
                    "mt-auto min-h-[4px] w-full max-w-[2rem] rounded-t-md transition-[height] duration-300 " +
                    (day.score !== null ? "bg-foreground" : "bg-border")
                  }
                  style={{ height: `${height}%` }}
                  title={
                    day.score !== null
                      ? `${day.label}: ${Math.round(day.score)}`
                      : `${day.label}: no sessions`
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid w-full grid-cols-3 gap-2">
        <Card className={STAT_CARD_CLASS}>
          <span className={STAT_LABEL_CLASS}>
            Deep focus
            <InfoHint
              align="start"
              text="All the hours you spent focused this week. Nice work!"
            />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-xl`}>
            {hasWeekData ? deepFocus : "—"}
          </span>
        </Card>
        <Card className={STAT_CARD_CLASS}>
          <span className={STAT_LABEL_CLASS}>
            Cleared
            <InfoHint text="Sessions you finished this week instead of stopping early." />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-2xl`}>
            {hasWeekData ? completed : "—"}
          </span>
        </Card>
        <Card className={STAT_CARD_CLASS}>
          <span className={STAT_LABEL_CLASS}>
            Avg interrupts
            <InfoHint
              align="end"
              text="How many distractions popped up each session this week — fewer is better."
            />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-2xl`}>
            {hasWeekData ? avgInterrupts.toFixed(1) : "—"}
          </span>
        </Card>
      </div>

      {interruptBreakdown.length > 0 && (
        <div className="w-full">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            What pulled you away
          </p>
          <ul className="flex flex-col gap-1">
            {interruptBreakdown.map((entry) => (
              <li
                key={entry.interrupt_type}
                className="flex justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {getInterruptCategoryLabel(entry.interrupt_type)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {entry.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(bestDay || worstDay) && (
        <div className="grid w-full grid-cols-2 gap-2">
          {bestDay && (
            <Card className="gap-1 rounded-lg p-3 text-left shadow-none">
              <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                Best day
              </span>
              <span className="text-sm text-foreground">
                {dayInsight(bestDay.sessions, bestDay.date)}
              </span>
            </Card>
          )}
          {worstDay && (
            <Card className="gap-1 rounded-lg p-3 text-left shadow-none">
              <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                Toughest day
              </span>
              <span className="text-sm text-foreground">
                {dayInsight(worstDay.sessions, worstDay.date)}
              </span>
            </Card>
          )}
        </div>
      )}

      <div className="w-full text-left">
        <p className="text-sm font-medium text-muted-foreground">
          Sessions by day
        </p>
        {!hasWeekData ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No sessions logged yet — let's get started!
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            {[...chartScores].reverse().map((day) => {
              const dayHasSessions = day.sessions.length > 0;
              if (!dayHasSessions) return null;

              return (
                <details
                  key={day.date.toISOString()}
                  className="rounded-lg border bg-card px-3 py-2"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {day.label}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {day.sessions.length} session
                      {day.sessions.length === 1 ? "" : "s"}
                      {day.score !== null && (
                        <Badge
                          variant="secondary"
                          className="tabular-nums"
                        >
                          {Math.round(day.score)}
                        </Badge>
                      )}
                    </span>
                  </summary>
                  <ul className="mt-2 flex list-none flex-col gap-1">
                    {day.sessions.map((session) => (
                      <li
                        key={session.id ?? session.started_at}
                        className="flex items-start gap-2 py-1"
                      >
                        <span
                          className="mt-1.5 size-2 flex-none rounded-full bg-foreground"
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-foreground">
                            {session.task}
                          </span>
                          <span className="text-xs text-muted-foreground">
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
