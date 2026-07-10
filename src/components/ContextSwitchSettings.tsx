import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  dismissContextSwitchPrompt,
  getAutoDetectContextSwitch,
  isContextSwitchPromptDismissed,
  setAutoDetectContextSwitch,
} from "../lib/preferences";
import PermissionsPanel from "./PermissionsPanel";

interface ContextSwitchSettingsProps {
  onChange?: (enabled: boolean) => void;
}

export default function ContextSwitchSettings({
  onChange,
}: ContextSwitchSettingsProps) {
  const [enabled, setEnabled] = useState(getAutoDetectContextSwitch);
  const [showPrompt, setShowPrompt] = useState(
    () => !isContextSwitchPromptDismissed(),
  );

  const apply = (next: boolean, dismissPrompt = false) => {
    setEnabled(next);
    setAutoDetectContextSwitch(next);
    if (dismissPrompt) {
      dismissContextSwitchPrompt();
      setShowPrompt(false);
    }
    onChange?.(next);
  };

  if (showPrompt) {
    return (
      <div className="mt-6 w-full rounded-lg border bg-card p-4">
        <p className="mb-1 text-sm font-medium text-foreground">
          Help you stay on track during sessions?
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Optional Tier 3 detection tracks which app and site are in focus
          during a session and gives you a gentle nudge when a distraction
          pulls you away. Time per app shows in your Daily Review. Manual
          &ldquo;Got distracted&rdquo; always works. macOS may ask for
          Accessibility permission.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => apply(true, true)}>
            Sure, turn it on
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => apply(false, true)}
          >
            Maybe later
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <label
        htmlFor="context-switch-toggle"
        className="mt-6 flex items-center justify-between gap-2 rounded-lg border bg-card p-4"
      >
        <span className="text-sm text-muted-foreground">
          Help me stay on track during sessions
        </span>
        <Switch
          id="context-switch-toggle"
          checked={enabled}
          onCheckedChange={(next) => apply(next)}
        />
      </label>
      {enabled && <PermissionsPanel />}
    </div>
  );
}
