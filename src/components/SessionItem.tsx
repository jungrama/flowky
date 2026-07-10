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

export default function SessionItem({ session, score, activity }: SessionItemProps) {
  const tone = sessionDotTone(session);
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
    <li
      className={`review-session-item review-session-item-${tone}`}
      tabIndex={0}
    >
      <span
        className={`review-session-rail review-session-rail-${tone}`}
        aria-hidden="true"
      />
      <div className="review-session-main">
        <div className="review-session-top">
          <span className="review-session-task">{session.task}</span>
          <span className="review-session-duration">
            {formatDuration(focused)}
          </span>
        </div>
        <div className="review-session-bottom">
          <span className="review-session-depth">{session.depth}</span>
          <span className="review-session-time">{time}</span>
          {abandoned ? (
            <span className="review-chip review-chip-amber">ended early</span>
          ) : session.interrupts > 0 ? (
            <span className="review-chip review-chip-coral">
              {session.interrupts} interrupt
              {session.interrupts === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="review-chip review-chip-green">✓ clean</span>
          )}
          {score !== null && (
            <span className={`review-session-score review-chip-${scoreTone(score)}`}>
              {Math.round(score)}
            </span>
          )}
          {session.rating != null && (
            <span
              className="review-session-stars"
              aria-label={`Rated ${session.rating} of 5`}
            >
              {"★".repeat(session.rating)}
              <span className="review-session-stars-empty">
                {"★".repeat(5 - session.rating)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="session-tip" role="tooltip">
        <p className="session-tip-title">{session.task}</p>
        <dl className="session-tip-grid">
          <dt>Focus score</dt>
          <dd>{score !== null ? `${Math.round(score)} / 100` : "—"}</dd>
          <dt>Focused</dt>
          <dd>
            {formatDuration(focused)} of {formatDuration(planned)} ({completion}%)
          </dd>
          <dt>Depth</dt>
          <dd className="session-tip-cap">{session.depth}</dd>
          <dt>Interrupts</dt>
          <dd>{session.interrupts}</dd>
          <dt>Rating</dt>
          <dd>{session.rating != null ? `${session.rating} / 5` : "Not rated"}</dd>
          <dt>Status</dt>
          <dd className="session-tip-cap">{session.status}</dd>
        </dl>
        <div className="session-tip-distract">
          <p className="session-tip-subhead">Distractions</p>
          {distractions.length === 0 ? (
            <p className="session-tip-none">None. Nice focus!</p>
          ) : (
            <ul className="session-tip-list">
              {distractions.map((d) => (
                <li key={d.app_name}>
                  <span>{d.app_name}</span>
                  <span className="session-tip-secs">{minSec(d.seconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
