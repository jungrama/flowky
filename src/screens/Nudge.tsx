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

  const dismiss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
    // Fills the whole webview so stray clicks can't fall through to the app
    // behind the (unfocused, transparent) nudge window.
    <div className="flex h-screen w-screen items-stretch p-2">
      <div
        key={shownAt}
        className="relative flex flex-1 animate-nudge-enter items-end gap-3 overflow-hidden rounded-2xl border bg-card pl-4 pr-3 pt-4 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
      >
        <button
          type="button"
          className="absolute right-2 top-1.5 z-10 flex size-[22px] items-center justify-center rounded-full text-lg leading-none text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
        <p className="flex-1 pb-5 text-sm leading-normal text-foreground">
          {message}
        </p>
        <img
          className="-mb-1 w-[110px] flex-none animate-nudge-bob self-end object-contain"
          src={mascot}
          alt=""
          aria-hidden
        />
      </div>
    </div>
  );
}
