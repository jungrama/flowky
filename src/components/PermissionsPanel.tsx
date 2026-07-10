import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPermissionStatus,
  openSystemSettings,
  requestScreenRecording,
  sendTestNotification,
  type PermissionStatus,
} from "../lib/tauri";

const isMac = navigator.userAgent.includes("Mac");

function statusLabel(state: string): string {
  switch (state) {
    case "granted":
      return "Granted";
    case "denied":
      return "Not granted";
    case "unsupported":
      return "Not required";
    default:
      return "Unknown";
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

  const screenGranted = status.screen_recording === "granted";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Permissions</p>
        <Button type="button" size="sm" variant="ghost" onClick={refresh}>
          Re-check
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Distraction detection
          </span>
          <Badge variant="secondary">
            {statusLabel(status.screen_recording)}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {isMac
            ? "Needs Screen Recording access to spot distractions."
            : "No permission needed."}
        </span>
        {isMac && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void openSystemSettings("screen-recording")}
            >
              Open settings
            </Button>
            {!screenGranted && (
              <Button type="button" size="sm" onClick={() => void grantScreen()}>
                Grant
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Notifications
          </span>
          <Badge variant="secondary">Managed by the OS</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Send a test to make sure alerts reach you.
        </span>
        <div className="flex gap-2">
          {isMac && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void openSystemSettings("notifications")}
            >
              Open settings
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void test()}
          >
            Send a test
          </Button>
        </div>
        {testMsg && (
          <p className="text-sm text-muted-foreground" role="status">
            {testMsg}
          </p>
        )}
      </div>
    </div>
  );
}
