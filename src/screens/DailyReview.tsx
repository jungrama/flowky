import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import InfoHint from "../components/InfoHint";
import SessionItem from "../components/SessionItem";
import { useSessions } from "../hooks/useSessions";
import {
  getAppActivity,
  getSessionAppActivity,
  type AppActivityTotal,
} from "../lib/tauri";
import {
  completedSessionCount,
  dayLabel,
  deepFocusSeconds,
  formatDuration,
  isSameDay,
  last7DaysEnding,
  sessionsForDay,
  totalInterruptions,
} from "../lib/sessionStats";

interface DailyReviewProps {
  date?: Date;
  onBack?: () => void;
}

interface DayScore {
  date: Date;
  label: string;
  score: number | null;
}

const MS_PER_DAY = 86_400_000;

/** Like formatDuration but keeps seconds visible under a minute (so short
 *  distractions read "42s" instead of "0m"). */
function durationOrSecs(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? `${s}s` : formatDuration(s);
}

const STAT_CARD_CLASS = "gap-1 rounded-lg px-2 py-4 shadow-none";
const STAT_ICON_CLASS =
  "mb-1 inline-flex h-[30px] w-[30px] items-center justify-center rounded-md bg-primary/12 text-primary";
const STAT_LABEL_CLASS =
  "inline-flex items-center gap-[5px] text-xs text-muted-foreground";
const STAT_VALUE_CLASS = "font-semibold text-foreground tabular-nums";

export default function DailyReview({ date, onBack }: DailyReviewProps) {
  const { sessions, loadSessions, computeScore } = useSessions();
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [chartScores, setChartScores] = useState<DayScore[]>([]);
  const [appActivity, setAppActivity] = useState<AppActivityTotal[]>([]);
  const [sessionScores, setSessionScores] = useState<Record<number, number>>(
    {},
  );
  const [sessionActivity, setSessionActivity] = useState<
    Record<number, AppActivityTotal[]>
  >({});

  const targetDate = useMemo(() => date ?? new Date(), [date]);
  const isToday = useMemo(
    () => isSameDay(targetDate, new Date()),
    [targetDate],
  );

  useEffect(() => {
    const since = Math.floor((Date.now() - targetDate.getTime()) / MS_PER_DAY);
    void loadSessions(Math.max(7, since + 7));
  }, [loadSessions, targetDate]);

  useEffect(() => {
    // App activity is only tracked for the live/today view.
    if (!isToday) {
      setAppActivity([]);
      return;
    }
    let cancelled = false;
    void getAppActivity(1).then((rows) => {
      if (!cancelled) setAppActivity(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [sessions, isToday]);

  const appBreakdown = useMemo(() => {
    let distraction = 0;
    for (const row of appActivity) {
      if (row.bucket === "distraction") distraction += row.seconds;
    }
    const topDistractions = appActivity
      .filter((r) => r.bucket === "distraction")
      .slice(0, 3);
    return { distraction, topDistractions };
  }, [appActivity]);

  const todaySessions = useMemo(
    () => sessionsForDay(sessions, targetDate),
    [sessions, targetDate],
  );

  useEffect(() => {
    if (todaySessions.length === 0) {
      setTodayScore(null);
      return;
    }
    void computeScore(todaySessions).then(setTodayScore);
  }, [todaySessions, computeScore]);

  // Per-session focus score for the badge + tooltip.
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      todaySessions.map(async (s) => {
        const key = s.id ?? s.started_at;
        const score = await computeScore([s]);
        return [key, score] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setSessionScores(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [todaySessions, computeScore]);

  // Per-session app activity for the hover tooltip.
  useEffect(() => {
    let cancelled = false;
    const withIds = todaySessions.filter((s) => s.id != null);
    void Promise.all(
      withIds.map(async (s) => {
        const rows = await getSessionAppActivity(s.id as number);
        return [s.id as number, rows] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setSessionActivity(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [todaySessions]);

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      const days = last7DaysEnding(targetDate);
      const scores = await Promise.all(
        days.map(async (date) => {
          const daySessions = sessionsForDay(sessions, date);
          if (daySessions.length === 0) {
            return { date, label: dayLabel(date), score: null };
          }
          const score = await computeScore(daySessions);
          return { date, label: dayLabel(date), score };
        }),
      );
      if (!cancelled) setChartScores(scores);
    }

    void loadChart();
    return () => {
      cancelled = true;
    };
  }, [sessions, computeScore, targetDate]);

  const deepFocus = useMemo(
    () => formatDuration(deepFocusSeconds(todaySessions)),
    [todaySessions],
  );
  const interrupts = useMemo(
    () => totalInterruptions(todaySessions),
    [todaySessions],
  );
  const completed = useMemo(
    () => completedSessionCount(todaySessions),
    [todaySessions],
  );

  const hasTodayData = todaySessions.length > 0;
  const maxChartScore = Math.max(100, ...chartScores.map((d) => d.score ?? 0));

  // Compare the latest day (today) against the average of the prior days.
  const chartCompare = useMemo(() => {
    if (chartScores.length === 0) return null;
    const latest = chartScores[chartScores.length - 1]?.score ?? null;
    const prior = chartScores
      .slice(0, -1)
      .map((d) => d.score)
      .filter((s): s is number => s !== null);
    if (latest === null || prior.length === 0) return null;
    const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const delta = Math.round(latest - avg);
    return { today: Math.round(latest), avg: Math.round(avg), delta };
  }, [chartScores]);

  const heading = isToday
    ? "Today's review"
    : targetDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

  return (
    <section
      className="flex w-full max-w-sm flex-col items-center gap-4"
      data-screen="dailyReview"
    >
      <div className="flex w-full items-center">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mr-1 text-muted-foreground"
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft />
          </Button>
        )}
        <h2 className="text-2xl font-normal tracking-[-0.03em]">{heading}</h2>
      </div>

      <Card className="w-full items-center gap-1 rounded-xl p-6 shadow-none">
        <span className="text-5xl font-semibold leading-none tabular-nums text-foreground">
          {hasTodayData && todayScore !== null ? Math.round(todayScore) : "—"}
        </span>
        <span className="inline-flex items-center gap-[5px] text-sm text-muted-foreground">
          Focus score
          <InfoHint
            placement="below"
            text="Your focus score from 0–100. It goes up when you finish sessions, avoid distractions, and rate them well. Recent sessions count more."
          />
        </span>
      </Card>

      <Card
        className="w-full gap-3 rounded-lg p-4 shadow-none"
        aria-label="7-day focus score"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            Today vs the week before
          </span>
          {chartCompare && (
            <span className="text-xs tabular-nums text-muted-foreground">
              Today {chartCompare.today} · avg {chartCompare.avg}
              <span className="ml-1 font-medium text-foreground">
                {chartCompare.delta > 0
                  ? `▲ ${chartCompare.delta}`
                  : chartCompare.delta < 0
                    ? `▼ ${Math.abs(chartCompare.delta)}`
                    : "±0"}
              </span>
            </span>
          )}
        </div>
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
          <span className={STAT_ICON_CLASS} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className={STAT_LABEL_CLASS}>
            Deep focus
            <InfoHint
              align="start"
              text="Total time you spent focused on your sessions."
            />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-xl`}>
            {hasTodayData ? deepFocus : "—"}
          </span>
        </Card>
        <Card className={STAT_CARD_CLASS}>
          <span className={STAT_ICON_CLASS} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
            </svg>
          </span>
          <span className={STAT_LABEL_CLASS}>
            Interruptions
            <InfoHint text="Times you got distracted — you tapped “got distracted” or switched to a distracting app mid-session." />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-2xl`}>
            {hasTodayData ? interrupts : "—"}
          </span>
        </Card>
        <Card className={STAT_CARD_CLASS}>
          <span className={STAT_ICON_CLASS} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
          </span>
          <span className={STAT_LABEL_CLASS}>
            Completed
            <InfoHint
              align="end"
              text="Sessions you finished instead of ending early."
            />
          </span>
          <span className={`${STAT_VALUE_CLASS} text-2xl`}>
            {hasTodayData ? completed : "—"}
          </span>
        </Card>
      </div>

      {appBreakdown.distraction > 0 && (
        <div className="mt-2 flex w-full flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Distractions (today)
          </p>
          <div className="flex items-stretch gap-4 rounded-[10px] border bg-card p-4">
            <div className="flex flex-none flex-col gap-0.5 border-r pr-4">
              <span className="text-2xl font-semibold leading-tight tabular-nums text-foreground">
                {durationOrSecs(appBreakdown.distraction)}
              </span>
              <span className="text-xs text-muted-foreground">
                lost to distractions
              </span>
            </div>
            {appBreakdown.topDistractions.length > 0 && (
              <ul className="flex flex-1 flex-col justify-center gap-2">
                {appBreakdown.topDistractions.map((row) => (
                  <li
                    key={row.app_name}
                    className="flex justify-between gap-4 text-sm text-body"
                  >
                    <span className="truncate">{row.app_name}</span>
                    <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                      {durationOrSecs(row.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="w-full text-left">
        <p className="text-sm font-medium text-muted-foreground">
          {isToday ? "Today's sessions" : "Sessions"}
        </p>
        {todaySessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {isToday
              ? "No sessions yet today — let's start one!"
              : "No sessions this day."}
          </p>
        ) : (
          <ul className="mt-2 flex list-none flex-col gap-2">
            {todaySessions.map((session) => {
              const key = session.id ?? session.started_at;
              return (
                <SessionItem
                  key={key}
                  session={session}
                  score={sessionScores[key] ?? null}
                  activity={
                    session.id != null
                      ? (sessionActivity[session.id] ?? [])
                      : []
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
