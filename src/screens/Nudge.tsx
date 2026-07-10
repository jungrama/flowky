import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { randomBadMascot } from "../lib/mascots";

export default function Nudge() {
  const [app, setApp] = useState("Something");
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
      setApp(event.payload || "Something");
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
        className="relative flex flex-1 animate-nudge-enter items-center gap-2 overflow-hidden rounded-2xl border bg-card pr-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
      >
        <button
          type="button"
          className="absolute right-3 top-2 z-10 flex size-[22px] items-center justify-center rounded-full text-lg leading-none text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
        <img
          className="h-full w-[132px] flex-none self-end object-contain object-bottom"
          src={mascot}
          alt=""
          aria-hidden
        />
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-xl font-bold leading-tight tracking-[-0.02em] text-foreground">
            You&apos;ve got distracted!
          </h2>
          <p className="text-sm leading-snug text-muted-foreground">
            {app} can wait. Let&apos;s get back to what you were doing!
          </p>
        </div>
      </div>
    </div>
  );
}
