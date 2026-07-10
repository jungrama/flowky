import { useCallback, useEffect, useRef, useState } from "react";

const EXTEND_SECONDS = 600;

export interface UseTimerResult {
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  extend: () => void;
  reset: () => void;
}

function getRemaining(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

export function useTimer(): UseTimerResult {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const endAtRef = useRef(0);
  const pausedRemainingRef = useRef(0);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const tick = () => {
      const remaining = getRemaining(endAtRef.current);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsRunning(false);
        setIsComplete(true);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRunning, isPaused]);

  const start = useCallback((seconds: number) => {
    endAtRef.current = Date.now() + seconds * 1000;
    pausedRemainingRef.current = seconds;
    setRemainingSeconds(seconds);
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
  }, []);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    const remaining = getRemaining(endAtRef.current);
    pausedRemainingRef.current = remaining;
    setRemainingSeconds(remaining);
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    endAtRef.current = Date.now() + pausedRemainingRef.current * 1000;
    setIsPaused(false);
    setIsComplete(false);
  }, [isPaused]);

  const extend = useCallback(() => {
    const remaining = isPaused
      ? pausedRemainingRef.current
      : getRemaining(endAtRef.current);
    const extended = remaining + EXTEND_SECONDS;
    pausedRemainingRef.current = extended;
    setRemainingSeconds(extended);
    setIsComplete(false);

    if (isPaused) return;

    endAtRef.current = Date.now() + extended * 1000;
    if (!isRunning) {
      setIsRunning(true);
    }
  }, [isPaused, isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setRemainingSeconds(0);
    endAtRef.current = 0;
    pausedRemainingRef.current = 0;
  }, []);

  return {
    remainingSeconds,
    isRunning,
    isPaused,
    isComplete,
    start,
    pause,
    resume,
    extend,
    reset,
  };
}
