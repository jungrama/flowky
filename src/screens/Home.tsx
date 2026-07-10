import { useEffect, useMemo, useState } from "react";
import InfoHint from "../components/InfoHint";
import { useSessions } from "../hooks/useSessions";
import { IDLE_MASCOT } from "../lib/mascots";
import { getUserName } from "../lib/preferences";
import {
  deepFocusSeconds,
  formatDuration,
  getGreeting,
  sessionsForToday,
  sessionsForYesterday,
} from "../lib/sessionStats";

interface HomeProps {
  onStartSession: () => void;
}

export default function Home({ onStartSession }: HomeProps) {
  const name = getUserName();
  const { sessions, loadSessions, computeScore } = useSessions();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    void loadSessions(7);
  }, [loadSessions]);

  const todaySessions = useMemo(() => sessionsForToday(sessions), [sessions]);
  const yesterdaySessions = useMemo(
    () => sessionsForYesterday(sessions),
    [sessions],
  );

  // Prefer today's data; fall back to yesterday; otherwise show nothing.
  const usingToday = todaySessions.length > 0;
  const statSessions = usingToday ? todaySessions : yesterdaySessions;
  const hasData = statSessions.length > 0;
  const caption = usingToday ? "Today's progress so far" : "Yesterday's recap";

  useEffect(() => {
    if (statSessions.length === 0) {
      setScore(null);
      return;
    }
    void computeScore(statSessions).then(setScore);
  }, [statSessions, computeScore]);

  const deepFocus = useMemo(
    () => formatDuration(deepFocusSeconds(statSessions)),
    [statSessions],
  );

  return (
    <section className="screen screen-home" data-screen="home">
      <header className="home-hero">
        <div className="home-hero-text">
          <p className="home-greeting">{getGreeting()}</p>
          <h1>Welcome back, {name || "friend"}</h1>
        </div>
        <img
          className="home-mascot"
          src={IDLE_MASCOT}
          alt="Flowky mascot waving"
        />
      </header>

      {hasData && (
        <>
          <p className="home-stats-caption">{caption}</p>
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
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                </svg>
              </span>
              <span className="stat-label">
                Focus power
                <InfoHint
                  align="start"
                  text="Your focus power from 0–100. It climbs when you finish sessions, avoid interruptions, and rate them well."
                />
              </span>
              <span className="stat-value">
                {score !== null ? Math.round(score) : "—"}
                <span className="stat-unit">/ 100</span>
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
                  <path d="M9 6h11M9 12h11M9 18h11" />
                  <path d="M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
              </span>
              <span className="stat-label">
                Sessions
                <InfoHint text="How many focus sessions you did." />
              </span>
              <span className="stat-value">
                {statSessions.length}
                <span className="stat-unit">done</span>
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
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="stat-label">
                Flow time
                <InfoHint
                  align="end"
                  text="Total time you spent locked in the zone."
                />
              </span>
              <span className="stat-value stat-value-sm">{deepFocus}</span>
            </div>
          </div>
        </>
      )}

      <div className="screen-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onStartSession}
        >
          Start focusing
        </button>
      </div>
    </section>
  );
}
