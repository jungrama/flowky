import { useCallback, useEffect, useState } from "react";
import {
  getPermissionStatus,
  openSystemSettings,
  requestScreenRecording,
  sendTestNotification,
  type PermissionStatus,
} from "../lib/tauri";

const isMac = navigator.userAgent.includes("Mac");

function statusDot(state: string): { className: string; label: string } {
  switch (state) {
    case "granted":
      return { className: "perm-dot-ok", label: "Granted" };
    case "denied":
      return { className: "perm-dot-bad", label: "Not granted" };
    case "unsupported":
      return { className: "perm-dot-ok", label: "Not required" };
    default:
      return { className: "perm-dot-unknown", label: "Unknown" };
  }
}

export default function PermissionsPanel() {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getPermissionStatus().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // macOS only applies a newly-granted Screen Recording grant after restart, so
  // we both prompt and open the settings pane, then re-check.
  const grantScreen = async () => {
    await requestScreenRecording();
    await openSystemSettings("screen-recording");
    setTimeout(refresh, 1000);
  };

  const test = async () => {
    setTestMsg(null);
    try {
      await sendTestNotification();
      setTestMsg("Sent! If nothing appeared, enable notifications below.");
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (!status) return null;

  const screen = statusDot(status.screen_recording);
  const screenGranted = status.screen_recording === "granted";

  return (
    <div className="perm-panel">
      <div className="perm-header">
        <p className="form-label">Permissions</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm perm-recheck"
          onClick={refresh}
        >
          Re-check
        </button>
      </div>

      <div className="perm-row">
        <div className="perm-row-head">
          <span className={`perm-dot ${screen.className}`} aria-hidden />
          <span className="perm-name">Distraction detection</span>
          <span className={`perm-badge ${screen.className}`}>{screen.label}</span>
        </div>
        <span className="perm-status">
          {isMac ? "Needs Screen Recording access to spot distractions." : "No permission needed."}
        </span>
        {isMac && (
          <div className="perm-actions">
            {!screenGranted && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void grantScreen()}
              >
                Grant
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void openSystemSettings("screen-recording")}
            >
              Open settings
            </button>
          </div>
        )}
      </div>

      <div className="perm-row">
        <div className="perm-row-head">
          <span className="perm-dot perm-dot-unknown" aria-hidden />
          <span className="perm-name">Notifications</span>
          <span className="perm-badge perm-dot-unknown">Managed by the OS</span>
        </div>
        <span className="perm-status">
          Send a test to make sure alerts reach you.
        </span>
        <div className="perm-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void test()}
          >
            Send a test
          </button>
          {isMac && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void openSystemSettings("notifications")}
            >
              Open settings
            </button>
          )}
        </div>
        {testMsg && (
          <p className="screen-subtitle perm-test-msg" role="status">
            {testMsg}
          </p>
        )}
      </div>
    </div>
  );
}
