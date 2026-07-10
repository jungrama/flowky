import { useState } from "react";
import { resetData } from "../lib/tauri";

type State = "idle" | "confirm" | "working" | "done" | "error";

export default function ResetDataSettings() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const wipe = async () => {
    setState("working");
    setError(null);
    try {
      await resetData();
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  };

  return (
    <div className="settings-group">
      <div className="reset-card">
        <p className="reset-title">Reset all data</p>
        <p className="screen-subtitle reset-copy">
          Warning: this permanently deletes every focus session, interruption, and
          tracked app time on this machine. Your app &amp; site lists are kept. This
          cannot be undone.
        </p>

        {state === "confirm" ? (
          <div className="reset-actions">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => void wipe()}
            >
              Yes, delete everything
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setState("idle")}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-danger btn-sm reset-trigger"
            disabled={state === "working"}
            onClick={() => setState("confirm")}
          >
            {state === "working" ? "Deleting…" : "Delete everything"}
          </button>
        )}

        {state === "done" && (
          <p className="screen-subtitle reset-status" role="status">
All done. Fresh start!
          </p>
        )}
        {state === "error" && error && (
          <p className="screen-subtitle reset-status reset-status-error" role="status">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
