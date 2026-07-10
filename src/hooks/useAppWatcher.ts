import { useEffect } from "react";
import { getAutoDetectContextSwitch } from "../lib/preferences";
import { setContextSwitchWatching } from "../lib/tauri";

interface UseAppWatcherOptions {
  active: boolean;
  isPaused: boolean;
}

/**
 * Tier 3 app watcher. While a session is active and auto-detect is enabled, the
 * Rust watcher tracks the foreground app/site and, when the user lingers on a
 * distraction past the dwell threshold, shows the cute nudge window itself
 * (see `show_nudge` in notifications.rs). This hook only toggles watching on
 * and off — there's nothing for the main window to handle on distraction.
 */
export function useAppWatcher({ active, isPaused }: UseAppWatcherOptions) {
  useEffect(() => {
    const enabled = getAutoDetectContextSwitch() && active && !isPaused;
    void setContextSwitchWatching(enabled);

    return () => {
      void setContextSwitchWatching(false);
    };
  }, [active, isPaused]);
}
