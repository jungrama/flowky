import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  onOpenTasks: () => void;
}

const STAT_CARD_CLASS = "gap-1 rounded-lg px-2 py-4 shadow-none";
const STAT_ICON_CLASS =
  "mb-1 inline-flex h-[30px] w-[30px] items-center justify-center rounded-md bg-primary/12 text-primary";
const STAT_LABEL_CLASS =
  "inline-flex items-center gap-[5px] text-xs text-muted-foreground";
const STAT_VALUE_CLASS = "font-semibold text-foreground tabular-nums";
const STAT_UNIT_CLASS = "ml-[0.35ch] text-xs font-normal text-muted-foreground";

export default function Home({ onStartSession, onOpenTasks }: HomeProps) {
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
    <section
      className="flex w-full max-w-sm flex-col items-center gap-6"
      data-screen="home"
    >
      <Card className="relative mt-[25px] flex min-h-[165px] w-full flex-row items-center justify-between gap-4 overflow-visible py-0 text-left shadow-none">
        <div className="z-[1] flex min-w-0 flex-1 flex-col gap-1 pl-5">
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-[2rem] font-normal leading-[1.2] tracking-[-0.03em]">
            Welcome back, {name || "friend"}
          </h1>
        </div>
        <img
          className="pointer-events-none w-[180px] -mt-20 shrink-0 self-end object-contain"
          src={IDLE_MASCOT}
          alt="Flowky mascot waving"
        />
      </Card>

      {hasData && (
        <>
          <p className="-mb-2 text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
            {caption}
          </p>
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
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                </svg>
              </span>
              <span className={STAT_LABEL_CLASS}>
                Focus power
                <InfoHint
                  align="start"
                  text="Your focus power from 0–100. It climbs when you finish sessions, avoid interruptions, and rate them well."
                />
              </span>
              <span className={`${STAT_VALUE_CLASS} text-2xl`}>
                {score !== null ? Math.round(score) : "—"}
                <span className={STAT_UNIT_CLASS}>/ 100</span>
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
                  <path d="M9 6h11M9 12h11M9 18h11" />
                  <path d="M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
              </span>
              <span className={STAT_LABEL_CLASS}>
                Sessions
                <InfoHint text="How many focus sessions you did." />
              </span>
              <span className={`${STAT_VALUE_CLASS} text-2xl`}>
                {statSessions.length}
                <span className={STAT_UNIT_CLASS}>done</span>
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
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className={STAT_LABEL_CLASS}>
                Flow time
                <InfoHint
                  align="end"
                  text="Total time you spent locked in the zone."
                />
              </span>
              <span className={`${STAT_VALUE_CLASS} text-xl`}>{deepFocus}</span>
            </Card>
          </div>
        </>
      )}

      {!hasData && (
        <Card className="w-full items-center gap-2 rounded-xl border-dashed p-6 text-center shadow-none">
          <span className="text-3xl" aria-hidden="true">
            🌱
          </span>
          <p className="text-base font-medium text-foreground">
            No plans yet today
          </p>
          <p className="max-w-[28ch] text-sm text-muted-foreground">
            Add a task and start your day — your focus stats will show up here.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-1"
            onClick={onOpenTasks}
          >
            Add a task
          </Button>
        </Card>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          className="h-auto w-full rounded-lg border border-primary px-4 py-2 text-base font-medium hover:border-[#333333] hover:bg-[#333333]"
          onClick={onStartSession}
        >
          Start focusing
        </Button>
      </div>
    </section>
  );
}
