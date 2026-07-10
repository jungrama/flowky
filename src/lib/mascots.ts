import hello from "../assets/char/hello.png";
import focus from "../assets/char/focus.png";
import finished from "../assets/char/finished.png";
import finishedEarly from "../assets/char/finished-early.png";
import interrupted from "../assets/char/interupted.png";

/** Shown before a session starts (home + idle focus screen). */
export const IDLE_MASCOT = hello;

/** Shown during an active focus session. */
export const RUNNING_MASCOT = focus;

/** Shown on the break screen after a completed session. */
export const FINISHED_MASCOT = finished;

/** Shown on the break screen when a session ended early / was abandoned. */
export const FINISHED_EARLY_MASCOT = finishedEarly;

/** The "distracted" mascot for the nudge overlay. */
export function randomBadMascot(): string {
  return interrupted;
}
