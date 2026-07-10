import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-8"
      data-screen="idleOverlay"
      role="dialog"
      aria-modal
    >
      <Card className="w-full max-w-xs gap-0 px-6 text-center">
        <div className="relative mx-auto mb-6 size-[72px]" aria-hidden>
          <div className="absolute inset-0 rounded-full border-[3px] border-primary animate-idle-pulse" />
          <AvatarFace
            emotion="surprised"
            size={48}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <h2 className="text-2xl font-normal leading-[1.2] tracking-[-0.03em]">
          Still there?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session is still running.
        </p>

        {showBreakSuggestion && (
          <p className="mt-2 text-sm font-medium leading-normal text-foreground">
            You&apos;ve been away a while — no shame in logging a break when you&apos;re back.
          </p>
        )}

        <Progress
          className="mt-6"
          value={progress * 100}
          aria-label={`Auto-ending in ${countdown} seconds`}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Ending in {countdown}s if you&apos;re still away
        </p>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button type="button" onClick={onDismiss}>
            I&apos;m back, keep going
          </Button>
          <Button type="button" variant="ghost" onClick={onEnd}>
            End session
          </Button>
        </div>
      </Card>
    </div>
  );
}
