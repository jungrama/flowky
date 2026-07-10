import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getIdleSeconds } from "../lib/tauri";

export const IDLE_THRESHOLD_SECONDS = 300;
export const IDLE_BREAK_SUGGEST_SECONDS = 15 * 60;
export const IDLE_ABANDON_SECONDS = 30 * 60;

const POLL_INTERVAL_MS = 5000;

export interface IdlePayload {
  idle_seconds: number;
}

export function useIdleWatcher(onIdle?: (payload: IdlePayload) => void) {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    const applyIdle = (idle_seconds: number) => {
      setIdleSeconds(idle_seconds);
      const idle = idle_seconds >= IDLE_THRESHOLD_SECONDS;
      setIsIdle(idle);
      if (idle) {
        onIdle?.({ idle_seconds });
      }
    };

    void listen<number>("user-idle", (event) => {
      applyIdle(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });

    const poll = async () => {
      try {
        const secs = await getIdleSeconds();
        if (!cancelled) {
          applyIdle(secs);
        }
      } catch {
        // ignore poll errors in dev / non-tauri context
      }
    };

    void poll();
    const pollId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      unlisten?.();
      window.clearInterval(pollId);
    };
  }, [onIdle]);

  return { idleSeconds, isIdle };
}
