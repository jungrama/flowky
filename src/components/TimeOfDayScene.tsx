import { getTimeOfDay, type TimeOfDay } from "../lib/sessionStats";

const STAR_POSITIONS = [
  { left: "12%", top: "30%", delay: "0s" },
  { left: "26%", top: "55%", delay: "0.6s" },
  { left: "40%", top: "22%", delay: "1.2s" },
  { left: "58%", top: "48%", delay: "0.3s" },
  { left: "72%", top: "28%", delay: "0.9s" },
  { left: "86%", top: "58%", delay: "1.5s" },
  { left: "50%", top: "70%", delay: "0.45s" },
];

interface TimeOfDaySceneProps {
  time?: TimeOfDay;
}

export default function TimeOfDayScene({ time = getTimeOfDay() }: TimeOfDaySceneProps) {
  return (
    <div className={`tod-scene tod-scene-${time}`} aria-hidden="true">
      {time === "night" ? (
        <>
          {STAR_POSITIONS.map((s) => (
            <span
              key={s.left + s.top}
              className="tod-star"
              style={{ left: s.left, top: s.top, animationDelay: s.delay }}
            />
          ))}
          <span className="tod-shooting-star tod-shooting-star-1" />
          <span className="tod-shooting-star tod-shooting-star-2" />
          <span className="tod-cloud tod-cloud-night" />
          <div className="tod-moon">
            <span className="tod-crater tod-crater-1" />
            <span className="tod-crater tod-crater-2" />
            <span className="tod-crater tod-crater-3" />
          </div>
        </>
      ) : (
        <>
          <div className="tod-sun">
            <span className="tod-rays" />
          </div>
          {time === "afternoon" && (
            <>
              <span className="tod-cloud tod-cloud-1" />
              <span className="tod-cloud tod-cloud-2" />
              <span className="tod-cloud tod-cloud-3" />
              <span className="tod-bird tod-bird-1" />
              <span className="tod-bird tod-bird-2" />
            </>
          )}
          {time === "morning" && (
            <>
              <span className="tod-cloud tod-cloud-morning" />
              <span className="tod-bird tod-bird-1" />
              <span className="tod-bird tod-bird-2" />
              <span className="tod-bird tod-bird-3" />
            </>
          )}
        </>
      )}
    </div>
  );
}
