import { useState } from "react";
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

export default function ContextSwitchSettings({ onChange }: ContextSwitchSettingsProps) {
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
      <div className="context-switch-prompt">
        <p className="context-switch-title">Help you stay on track during sessions?</p>
        <p className="screen-subtitle context-switch-copy">
          Optional Tier 3 detection tracks which app and site are in focus during a
          session and gives you a gentle nudge when a distraction pulls you away. Time
          per app shows in your Daily Review. Manual &ldquo;Got distracted&rdquo; always
          works. macOS may ask for Accessibility permission.
        </p>
        <div className="context-switch-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => apply(true, true)}
          >
  Sure, turn it on
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => apply(false, true)}
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="context-switch-section">
      <label className="context-switch-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => apply(e.target.checked)}
        />
        <span className="context-switch-toggle-label">
          Help me stay on track during sessions
        </span>
      </label>
      {enabled && <PermissionsPanel />}
    </div>
  );
}
