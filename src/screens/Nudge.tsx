import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { randomBadMascot } from "../lib/mascots";

// A few warm, non-naggy lines. {app} is filled in with the distraction's name.
const LINES = [
  "{app} snuck in — ready to hop back to it?",
  "Caught a peek at {app}. Your task is still waiting for you.",
  "{app} can wait. Let's get back to what you were doing!",
  "Psst… {app} pulled you away. Want to refocus?",
  "Drifted into {app}. Pick things back up whenever you're ready.",
];

function pickLine(app: string): string {
  const idx = Math.floor(Date.now() / 1000) % LINES.length;
  return LINES[idx].replace("{app}", app);
}

export default function Nudge() {
  const [message, setMessage] = useState(
    "You drifted off — ready to hop back in?",
  );
  // Bump on each show to replay the entrance animation (the webview persists).
  const [shownAt, setShownAt] = useState(0);
  const [mascot, setMascot] = useState(randomBadMascot);

  const dismiss = () => {
    void getCurrentWindow().hide();
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("nudge-show", (event) => {
      setMessage(pickLine(event.payload || "Something"));
      setMascot(randomBadMascot());
      setShownAt((n) => n + 1);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <div key={shownAt} className="nudge-card nudge-card-in">
      <button
        type="button"
        className="nudge-close"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
      <img className="nudge-face" src={mascot} alt="" aria-hidden />
      <div className="nudge-body-text">
        <p className="nudge-message">{message}</p>
      </div>
    </div>
  );
}
