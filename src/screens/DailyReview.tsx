import { useEffect, useMemo, useState } from "react";
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
  scoreTone,
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

export default function DailyReview({ date, onBack }: DailyReviewProps) {
  const { sessions, loadSessions, computeScore } = useSessions();
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [chartScores, setChartScores] = useState<DayScore[]>([]);
  const [appActivity, setAppActivity] = useState<AppActivityTotal[]>([]);
  const [sessionScores, setSessionScores] = useState<Record<number, number>>({});
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
  const tone = todayScore !== null ? scoreTone(todayScore) : "amber";
  const maxChartScore = Math.max(100, ...chartScores.map((d) => d.score ?? 0));

  const heading = isToday
    ? "Today's review"
    : targetDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

  return (
    <section className="screen screen-review" data-screen="dailyReview">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        {onBack && (
          <button
            type="button"
            className="btn btn-ghost review-back"
            style={{ marginTop: "8px", padding: "0px 4px" }}
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M10 22L0 12L10 2l1.775 1.775L3.55 12l8.225 8.225z"
              />
            </svg>
          </button>
        )}
        <h2>{heading}</h2>
      </div>

      <div className={`review-score review-score-${tone}`}>
        <span className="review-score-value">
          {hasTodayData && todayScore !== null ? Math.round(todayScore) : "—"}
        </span>
        <span className="review-score-label">
          Focus score
          <InfoHint
            placement="below"
            text="Your focus score from 0–100. It goes up when you finish sessions, avoid distractions, and rate them well. Recent sessions count more."
          />
        </span>
      </div>

      <div className="review-chart" aria-label="7-day focus score">
        <div className="review-chart-bars">
          {chartScores.map((day) => {
            const height =
              day.score !== null ? (day.score / maxChartScore) * 100 : 4;
            const barTone = day.score !== null ? scoreTone(day.score) : "empty";
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
          <span className="stat-icon" aria-hidden="true">
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
          <span className="stat-label">
            Deep focus
            <InfoHint
              align="start"
              text="Total time you spent focused on your sessions."
            />
          </span>
          <span className="stat-value stat-value-sm">
            {hasTodayData ? deepFocus : "—"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
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
          <span className="stat-label">
            Interruptions
            <InfoHint text="Times you got distracted — you tapped “got distracted” or switched to a distracting app mid-session." />
          </span>
          <span className="stat-value">{hasTodayData ? interrupts : "—"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
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
          <span className="stat-label">
            Completed
            <InfoHint
              align="end"
              text="Sessions you finished instead of ending early."
            />
          </span>
          <span className="stat-value">{hasTodayData ? completed : "—"}</span>
        </div>
      </div>

      {appBreakdown.distraction > 0 && (
        <div className="review-apps">
          <p className="form-label">Distractions (today)</p>
          <div className="review-distract-card">
            <div className="review-distract-total">
              <span className="review-distract-value">
                {formatDuration(appBreakdown.distraction)}
              </span>
              <span className="stat-label">lost to distractions</span>
            </div>
            {appBreakdown.topDistractions.length > 0 && (
              <ul className="review-apps-list review-distract-list">
                {appBreakdown.topDistractions.map((row) => (
                  <li key={row.app_name} className="review-apps-row">
                    <span className="review-apps-title">{row.app_name}</span>
                    <span className="review-apps-secs">
                      {formatDuration(row.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="review-sessions">
        <p className="form-label">
          {isToday ? "Today's sessions" : "Sessions"}
        </p>
        {todaySessions.length === 0 ? (
          <p className="screen-subtitle">
            {isToday ? "No sessions yet today — let's start one!" : "No sessions this day."}
          </p>
        ) : (
          <ul className="review-session-list">
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
