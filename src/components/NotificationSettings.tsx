import { useState } from "react";
import { Switch } from "@/components/ui/switch";
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
    <div className="flex w-full flex-col gap-2">
      <label
        htmlFor="notif-session"
        className="flex items-start justify-between gap-2 rounded-lg border bg-card p-4"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            Session notifications
          </span>
          <span className="text-xs leading-snug text-muted-foreground">
            A little desktop ping when a session finishes.
          </span>
        </span>
        <Switch
          id="notif-session"
          checked={sessionNotifs}
          onCheckedChange={toggleSession}
        />
      </label>

      <label
        htmlFor="notif-idle"
        className="flex items-start justify-between gap-2 rounded-lg border bg-card p-4"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            Idle check-in
          </span>
          <span className="text-xs leading-snug text-muted-foreground">
            Pop the &ldquo;still there?&rdquo; overlay after 5 minutes away.
          </span>
        </span>
        <Switch
          id="notif-idle"
          checked={idleReminders}
          onCheckedChange={toggleIdle}
        />
      </label>
    </div>
  );
}
