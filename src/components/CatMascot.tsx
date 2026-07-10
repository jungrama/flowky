import { IDLE_MASCOT, RUNNING_MASCOT } from "../lib/mascots";

/** Focus-screen mascot. Idle (no session) shows the calm default; a started
 *  session shows a random "good" mascot chosen for this app launch. */
export default function CatMascot({ started = false }: { started?: boolean }) {
  return (
    <img
      className="cat-mascot"
      src={started ? RUNNING_MASCOT : IDLE_MASCOT}
      alt=""
      aria-hidden
    />
  );
}
