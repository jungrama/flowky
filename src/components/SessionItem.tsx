import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { formatDuration, scoreTone, sessionDotTone } from "../lib/sessionStats";
import type { AppActivityTotal, Session } from "../lib/tauri";

interface SessionItemProps {
  session: Session;
  score: number | null;
  activity: AppActivityTotal[];
}

function minSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function SessionItem({
  session,
  score,
  activity,
}: SessionItemProps) {
  // Tone is mono in the B&W theme; kept for semantics.
  void sessionDotTone(session);
  void scoreTone;
  const time = new Date(session.started_at * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const abandoned = session.status === "abandoned";

  const focused = session.duration ?? 0;
  const planned = session.planned || 1;
  const completion = Math.min(100, Math.round((focused / planned) * 100));
  const distractions = activity.filter((a) => a.bucket === "distraction");

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <li
          className="flex cursor-pointer items-stretch gap-4 rounded-lg border bg-card py-2 pr-4 text-left transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          role="button"
        >
          <span
            className="w-[3px] flex-none self-stretch rounded-full bg-foreground"
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium">{session.task}</span>
              <span className="flex-none text-sm font-semibold tabular-nums">
                {formatDuration(focused)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-secondary px-[7px] py-px text-xs capitalize text-body">
                {session.depth}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {time}
              </span>
              {abandoned ? (
                <span className="rounded-full bg-secondary px-2 py-px text-xs font-medium">
                  ended early
                </span>
              ) : session.interrupts > 0 ? (
                <span className="rounded-full bg-secondary px-2 py-px text-xs font-medium">
                  {session.interrupts} interrupt
                  {session.interrupts === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-px text-xs font-medium">
                  ✓ clean
                </span>
              )}
              {score !== null && (
                <span className="rounded-full bg-primary px-2 py-px text-xs font-semibold tabular-nums text-primary-foreground">
                  {Math.round(score)}
                </span>
              )}
              {session.rating != null && (
                <span
                  className="ml-auto text-sm tracking-wide text-foreground"
                  aria-label={`Rated ${session.rating} of 5`}
                >
                  {"★".repeat(session.rating)}
                  <span className="text-muted-foreground/40">
                    {"★".repeat(5 - session.rating)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </li>
      </DrawerTrigger>

      <DrawerContent>
        <div className="mx-auto w-full max-w-sm px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>{session.task}</DrawerTitle>
            <DrawerDescription className="capitalize">
              {session.depth} · {time}
            </DrawerDescription>
          </DrawerHeader>

          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Focus score</dt>
            <dd className="m-0 text-right tabular-nums">
              {score !== null ? `${Math.round(score)} / 100` : "—"}
            </dd>
            <dt className="text-muted-foreground">Focused</dt>
            <dd className="m-0 text-right tabular-nums">
              {formatDuration(focused)} of {formatDuration(planned)} (
              {completion}%)
            </dd>
            <dt className="text-muted-foreground">Interrupts</dt>
            <dd className="m-0 text-right tabular-nums">{session.interrupts}</dd>
            <dt className="text-muted-foreground">Rating</dt>
            <dd className="m-0 text-right">
              {session.rating != null ? `${session.rating} / 5` : "Not rated"}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="m-0 text-right capitalize">{session.status}</dd>
          </dl>

          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Distractions</p>
            {distractions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None. Nice focus!</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {distractions.map((d) => (
                  <li key={d.app_name} className="flex justify-between gap-2">
                    <span>{d.app_name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {minSec(d.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
