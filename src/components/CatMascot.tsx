import { IDLE_MASCOT, RUNNING_MASCOT } from "../lib/mascots";
import { cn } from "@/lib/utils";

/** Focus-screen mascot. Idle (no session) shows the calm default; a started
 *  session shows a random "good" mascot chosen for this app launch. */
export default function CatMascot({
  started = false,
  className,
}: {
  started?: boolean;
  className?: string;
}) {
  return (
    <img
      className={cn("-mt-1.5 h-auto w-[120px] shrink-0 object-contain", className)}
      src={started ? RUNNING_MASCOT : IDLE_MASCOT}
      alt=""
      aria-hidden
    />
  );
}
