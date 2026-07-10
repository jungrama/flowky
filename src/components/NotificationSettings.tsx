import { useState } from "react";
import {
  getIdleReminders,
  getSessionNotifications,
  setIdleReminders,
  setSessionNotifications,
} from "../lib/preferences";

export default function NotificationSettings() {
  const [sessionNotifs, setSessionNotifs] = useState(getSessionNotifications);
  const [idleReminders, setIdleRemindersState] = useState(getIdleReminders);

  const toggleSession = (next: boolean) => {
    setSessionNotifs(next);
    setSessionNotifications(next);
  };

  const toggleIdle = (next: boolean) => {
    setIdleRemindersState(next);
    setIdleReminders(next);
  };

  return (
    <div className="settings-group">
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={sessionNotifs}
          onChange={(e) => toggleSession(e.target.checked)}
        />
        <span className="settings-toggle-text">
          <span className="settings-toggle-title">Session notifications</span>
          <span className="settings-toggle-hint">
            A little desktop ping when a session finishes.
          </span>
        </span>
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={idleReminders}
          onChange={(e) => toggleIdle(e.target.checked)}
        />
        <span className="settings-toggle-text">
          <span className="settings-toggle-title">Idle check-in</span>
          <span className="settings-toggle-hint">
            Pop the &ldquo;still there?&rdquo; overlay after 5 minutes away.
          </span>
        </span>
      </label>
    </div>
  );
}
