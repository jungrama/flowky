import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppWatcher } from "./hooks/useAppWatcher";
import { useIdleWatcher, IDLE_ABANDON_SECONDS } from "./hooks/useIdleWatcher";
import { useSessions } from "./hooks/useSessions";
import { useTimer } from "./hooks/useTimer";
import { formatDuration } from "./lib/sessionStats";
import {
  openMainWindow,
  saveAppActivity,
  sendNotification,
  setTrayState,
  startAppSession,
  takeAppActivity,
  updateTraySession,
  type SessionStatus,
  type TraySession,
} from "./lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getIdleReminders, getSessionNotifications } from "./lib/preferences";
import AppNav from "./components/AppNav";
import BreakScreen, { buildSessionRecord } from "./screens/BreakScreen";
import DailyReview from "./screens/DailyReview";
import CalendarHeatmap from "./screens/CalendarHeatmap";
import FocusTimer from "./screens/FocusTimer";
import Home from "./screens/Home";
import IdleOverlay from "./screens/IdleOverlay";
import InterruptLog from "./screens/InterruptLog";
import Settings from "./screens/Settings";
import Tasks from "./screens/Tasks";
import WeeklySummary from "./screens/WeeklySummary";
import {
  INITIAL_SESSION,
  toInterruptionInputs,
  type Screen,
  type SessionContext,
  type SettingsTab,
} from "./types/navigation";

interface BreakState {
  focusedSeconds: number;
  savedSessionId: number;
  status: SessionStatus;
  distractSeconds: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("preferences");
  const [detailDay, setDetailDay] = useState<Date | null>(null);
  const [session, setSession] = useState<SessionContext>(INITIAL_SESSION);
  const [showIdleOverlay, setShowIdleOverlay] = useState(false);
  const [idleDismissed, setIdleDismissed] = useState(false);
  const [breakState, setBreakState] = useState<BreakState | null>(null);
  const [interruptInitialType, setInterruptInitialType] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState("");

  const timer = useTimer();
  const { loadSessions, saveSession } = useSessions();
  const { idleSeconds, isIdle } = useIdleWatcher();
  const finishingRef = useRef(false);
  const remainingRef = useRef(timer.remainingSeconds);
  remainingRef.current = timer.remainingSeconds;

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("navigate-daily-review", () => {
      setScreen("dailyReview");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("navigate-weekly-summary", () => {
      setScreen("weeklySummary");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("navigate-calendar-heatmap", () => {
      setScreen("calendarHeatmap");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isIdle) {
      setIdleDismissed(false);
    }
  }, [isIdle]);

  useEffect(() => {
    if (
      screen === "activeSession" &&
      isIdle &&
      !idleDismissed &&
      getIdleReminders()
    ) {
      setShowIdleOverlay(true);
    } else if (!isIdle) {
      setShowIdleOverlay(false);
    }
  }, [screen, isIdle, idleDismissed]);

  useEffect(() => {
    if (screen === "activeSession" || screen === "interruptLog") {
      void setTrayState("running");
      return;
    }
    if (screen === "break") {
      void setTrayState("break");
      return;
    }
    void setTrayState("idle");
  }, [screen]);

  // Keep the tray popover's session snapshot in sync.
  useEffect(() => {
    let status: TraySession["status"];
    if (screen === "activeSession" || screen === "interruptLog") {
      status = timer.isPaused ? "paused" : "running";
    } else if (screen === "break") {
      status = "break";
    } else {
      status = "idle";
    }

    const active = status === "running" || status === "paused";
    const remaining = active ? remainingRef.current : 0;
    const planned = active ? session.plannedSeconds : 0;
    const endsAt =
      status === "running"
        ? Math.floor(Date.now() / 1000) + remaining
        : null;

    void updateTraySession({
      active,
      task: session.task,
      depth: session.depth,
      status,
      remaining_seconds: remaining,
      planned_seconds: planned,
      started_at: session.startedAt,
      interrupts: session.interrupts,
      ends_at: endsAt,
    });
  }, [
    screen,
    timer.isPaused,
    session.task,
    session.depth,
    session.plannedSeconds,
    session.startedAt,
    session.interrupts,
  ]);

  const computeFocusedSeconds = useCallback(() => {
    if (timer.isRunning || timer.isPaused) {
      return Math.max(0, session.plannedSeconds - timer.remainingSeconds);
    }
    return Math.min(
      session.plannedSeconds,
      Math.max(0, Math.floor(Date.now() / 1000) - session.startedAt),
    );
  }, [session.plannedSeconds, session.startedAt, timer.isRunning, timer.isPaused, timer.remainingSeconds]);

  const finishSession = useCallback(
    async (status: SessionStatus = "completed", focusedOverride?: number) => {
      if (finishingRef.current) return;
      finishingRef.current = true;

      const focusedSeconds = focusedOverride ?? computeFocusedSeconds();
      const record = buildSessionRecord(session, focusedSeconds, status);

      try {
        const id = await saveSession(record, toInterruptionInputs(session.loggedInterruptions));
        const activity = await takeAppActivity();
        if (activity.length > 0) {
          void saveAppActivity(id, activity);
        }
        const distractSeconds = activity
          .filter((a) => a.bucket === "distraction")
          .reduce((sum, a) => sum + a.seconds, 0);
        setBreakState({ focusedSeconds, savedSessionId: id, status, distractSeconds });
        timer.reset();
        setShowIdleOverlay(false);
        setScreen("break");

        if (getSessionNotifications()) {
          const title =
            status === "abandoned" ? "Session ended" : "Session complete";
          const body =
            status === "abandoned"
              ? `${session.task} — ended after ${formatDuration(focusedSeconds)}`
              : `${session.task} — ${formatDuration(focusedSeconds)} focused`;
          void sendNotification(title, body);
        }
      } finally {
        finishingRef.current = false;
      }
    },
    [computeFocusedSeconds, saveSession, session, timer],
  );

  useEffect(() => {
    if (timer.isComplete && screen === "activeSession") {
      void finishSession("completed", session.plannedSeconds);
    }
  }, [timer.isComplete, screen, finishSession, session.plannedSeconds]);

  useEffect(() => {
    if (
      screen === "activeSession" &&
      idleSeconds >= IDLE_ABANDON_SECONDS &&
      !finishingRef.current
    ) {
      const elapsed = Math.floor(Date.now() / 1000) - session.startedAt;
      void finishSession("abandoned", Math.min(elapsed, session.plannedSeconds));
    }
  }, [idleSeconds, screen, session.startedAt, session.plannedSeconds, finishSession]);

  const updateSession = useCallback((patch: Partial<SessionContext>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const startSession = useCallback(
    (next: Pick<SessionContext, "task" | "depth" | "plannedSeconds">) => {
      const startedAt = Math.floor(Date.now() / 1000);
      setSession({
        task: next.task,
        depth: next.depth,
        plannedSeconds: next.plannedSeconds,
        interrupts: 0,
        loggedInterruptions: [],
        startedAt,
      });
      setBreakState(null);
      void startAppSession();
      timer.start(next.plannedSeconds);
      setShowIdleOverlay(false);
      setIdleDismissed(false);
      setScreen("activeSession");
    },
    [timer],
  );

  useAppWatcher({
    active: screen === "activeSession",
    isPaused: timer.isPaused,
  });

  const logInterrupt = useCallback(
    (type: string) => {
      if (interruptInitialType === type) return;
      const logged_at = Math.floor(Date.now() / 1000);
      setSession((prev) => ({
        ...prev,
        interrupts: prev.interrupts + 1,
        loggedInterruptions: [...prev.loggedInterruptions, { type, logged_at }],
      }));
    },
    [interruptInitialType],
  );

  const extendSession = useCallback(() => {
    timer.extend();
    updateSession({ plannedSeconds: session.plannedSeconds + 600 });
  }, [timer, session.plannedSeconds, updateSession]);

  const resumeAfterInterrupt = useCallback(() => {
    timer.resume();
    setInterruptInitialType(null);
    setScreen("activeSession");
  }, [timer]);

  const endSession = useCallback(() => {
    void finishSession("completed");
  }, [finishSession]);

  const abandonSession = useCallback(() => {
    const elapsed = Math.floor(Date.now() / 1000) - session.startedAt;
    void finishSession("abandoned", Math.min(elapsed, session.plannedSeconds));
  }, [finishSession, session.startedAt, session.plannedSeconds]);

  const dismissIdleOverlay = useCallback(() => {
    setIdleDismissed(true);
    setShowIdleOverlay(false);
  }, []);

  // Session controls triggered from the tray popover.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<{ action: string; type?: string }>("popover-action", (e) => {
      switch (e.payload.action) {
        case "pause":
          timer.pause();
          break;
        case "resume":
          timer.resume();
          break;
        case "extend":
          extendSession();
          break;
        case "log-interrupt":
          if (e.payload.type) logInterrupt(e.payload.type);
          break;
        case "end":
          // Open the app so the user lands on the break/summary screen.
          void openMainWindow();
          endSession();
          break;
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [timer, extendSession, logInterrupt, endSession]);

  const handleRate = useCallback(
    async (rating: number) => {
      if (!breakState) return;
      const record = buildSessionRecord(
        session,
        breakState.focusedSeconds,
        breakState.status,
        rating,
        breakState.savedSessionId,
      );
      await saveSession(record);
    },
    [breakState, saveSession, session],
  );

  const HUB_SCREENS: Screen[] = [
    "home",
    "tasks",
    "dailyReview",
    "weeklySummary",
    "calendarHeatmap",
    "dayDetail",
    "settings",
  ];
  const showNav = HUB_SCREENS.includes(screen);

  return (
    <div className="flex min-h-screen flex-col">
      {showNav && (
        <AppNav
          screen={screen}
          onNavigate={setScreen}
          settingsTab={settingsTab}
          onSettingsTab={setSettingsTab}
        />
      )}

      <main
        className={`flex flex-1 flex-col items-center overflow-y-auto p-3${showNav ? "" : " justify-center text-center"}`}
      >
        {screen === "home" && (
          <Home
            onStartSession={() => {
              setPendingTask("");
              setScreen("taskSetup");
            }}
            onOpenTasks={() => setScreen("tasks")}
          />
        )}

        {screen === "tasks" && (
          <Tasks
            onStartWith={(title) => {
              setPendingTask(title);
              setScreen("taskSetup");
            }}
          />
        )}

        {(screen === "taskSetup" || screen === "activeSession") && (
          <FocusTimer
            active={screen === "activeSession"}
            session={session}
            initialTask={pendingTask}
            remainingSeconds={timer.remainingSeconds}
            isPaused={timer.isPaused}
            onStart={startSession}
            onPause={timer.pause}
            onResume={timer.resume}
            onExtend={extendSession}
            onEndEarly={endSession}
            onCancel={() => setScreen("home")}
            onBack={() =>
              screen === "activeSession"
                ? void getCurrentWindow().hide()
                : setScreen("home")
            }
          />
        )}

        {screen === "interruptLog" && (
          <InterruptLog
            session={session}
            initialType={interruptInitialType ?? undefined}
            onSelectType={logInterrupt}
            onResume={resumeAfterInterrupt}
            onEnd={endSession}
          />
        )}

        {screen === "break" && breakState && (
          <BreakScreen
            session={session}
            focusedSeconds={breakState.focusedSeconds}
            distractSeconds={breakState.distractSeconds}
            status={breakState.status}
            onRate={handleRate}
            onStartNext={() => setScreen("taskSetup")}
            onViewReview={() => setScreen("dailyReview")}
          />
        )}

        {screen === "dailyReview" && <DailyReview />}

        {screen === "weeklySummary" && <WeeklySummary />}

        {screen === "calendarHeatmap" && (
          <CalendarHeatmap
            onOpenDay={(day) => {
              setDetailDay(day);
              setScreen("dayDetail");
            }}
          />
        )}

        {screen === "dayDetail" && detailDay && (
          <DailyReview
            date={detailDay}
            onBack={() => setScreen("calendarHeatmap")}
          />
        )}

        {screen === "settings" && <Settings tab={settingsTab} />}
      </main>

      {showIdleOverlay && screen === "activeSession" && (
        <IdleOverlay
          idleSeconds={idleSeconds}
          onDismiss={dismissIdleOverlay}
          onEnd={endSession}
          onAbandon={abandonSession}
        />
      )}
    </div>
  );
}
