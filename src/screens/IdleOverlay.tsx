import { useEffect, useRef, useState } from "react";
import AvatarFace from "../components/AvatarFace";
import {
  IDLE_ABANDON_SECONDS,
  IDLE_BREAK_SUGGEST_SECONDS,
} from "../hooks/useIdleWatcher";

const AUTO_END_SECONDS = 30;

interface IdleOverlayProps {
  idleSeconds: number;
  onDismiss: () => void;
  onEnd: () => void;
  onAbandon: () => void;
}

export default function IdleOverlay({
  idleSeconds,
  onDismiss,
  onEnd,
  onAbandon,
}: IdleOverlayProps) {
  const [countdown, setCountdown] = useState(AUTO_END_SECONDS);
  const abandonTriggered = useRef(false);

  useEffect(() => {
    if (idleSeconds >= IDLE_ABANDON_SECONDS && !abandonTriggered.current) {
      abandonTriggered.current = true;
      onAbandon();
    }
  }, [idleSeconds, onAbandon]);

  useEffect(() => {
    setCountdown(AUTO_END_SECONDS);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      onEnd();
      return;
    }
    const id = window.setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [countdown, onEnd]);

  const progress = countdown / AUTO_END_SECONDS;
  const showBreakSuggestion = idleSeconds >= IDLE_BREAK_SUGGEST_SECONDS;

  return (
    <div className="idle-overlay" data-screen="idleOverlay" role="dialog" aria-modal>
      <div className="idle-overlay-panel">
        <div className="idle-pulse-ring" aria-hidden>
          <div className="idle-pulse-ring-inner" />
          <AvatarFace emotion="surprised" size={48} className="idle-face" />
        </div>

        <h2>Still there?</h2>
        <p className="screen-subtitle">Your session is still running.</p>

        {showBreakSuggestion && (
          <p className="idle-break-hint">
            You&apos;ve been away a while — no shame in logging a break when you&apos;re back.
          </p>
        )}

        <div className="idle-countdown-bar" aria-label={`Auto-ending in ${countdown} seconds`}>
          <div
            className="idle-countdown-bar-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <p className="idle-countdown-label">
          Ending in {countdown}s if you&apos;re still away
        </p>

        <div className="screen-actions">
          <button type="button" className="btn btn-primary" onClick={onDismiss}>
            I&apos;m back, keep going
          </button>
          <button type="button" className="btn btn-ghost" onClick={onEnd}>
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
