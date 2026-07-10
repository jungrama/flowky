import { useEffect, useState } from "react";
import { useSessions } from "../hooks/useSessions";
import type { Depth } from "../lib/tauri";

interface TaskSetupProps {
  onStart: (session: {
    task: string;
    depth: Depth;
    plannedSeconds: number;
  }) => void;
  onBack: () => void;
}

const DEPTH_OPTIONS: { value: Depth; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Quick tasks, email, warm-ups" },
  { value: "deep", label: "Deep", hint: "Hard focus, no interruptions" },
  { value: "creative", label: "Creative", hint: "Writing, design, big ideas" },
];

const PRESET_MINUTES = [25, 60] as const;
const MIN_CUSTOM_MINUTES = 5;
const MAX_CUSTOM_MINUTES = 180;
const DEFAULT_CUSTOM_MINUTES = 45;

type DurationMode = "suggested" | (typeof PRESET_MINUTES)[number] | "custom";

function parseCustomMinutes(value: string): number | null {
  const minutes = Number.parseInt(value, 10);
  if (!Number.isFinite(minutes)) {
    return null;
  }
  if (minutes < MIN_CUSTOM_MINUTES || minutes > MAX_CUSTOM_MINUTES) {
    return null;
  }
  return minutes;
}

export default function TaskSetup({ onStart, onBack }: TaskSetupProps) {
  const { loadSessions, suggestLength } = useSessions();
  const [task, setTask] = useState("");
  const [depth, setDepth] = useState<Depth>("deep");
  const [durationMode, setDurationMode] = useState<DurationMode>("suggested");
  const [customMinutes, setCustomMinutes] = useState(
    String(DEFAULT_CUSTOM_MINUTES),
  );
  const [suggestedMinutes, setSuggestedMinutes] = useState(25);
  const [suggestionExplanation, setSuggestionExplanation] = useState(
    "Start with 25 min — we'll learn your rhythm as you go.",
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const sessions = await loadSessions(14);
      const suggestion = await suggestLength(depth, sessions);
      if (cancelled) {
        return;
      }
      setSuggestedMinutes(suggestion.minutes);
      setSuggestionExplanation(suggestion.explanation);
    })();

    return () => {
      cancelled = true;
    };
  }, [depth, loadSessions, suggestLength]);

  const activeMinutes =
    durationMode === "custom"
      ? parseCustomMinutes(customMinutes)
      : durationMode === "suggested"
        ? suggestedMinutes
        : durationMode;
  const canStart = task.trim().length > 0 && activeMinutes !== null;

  return (
    <section className="screen screen-task-setup" data-screen="taskSetup">
      <h2>Set up your session</h2>

      <div className="form-group">
        <label className="form-label" htmlFor="task-name">
          What are you working on?
        </label>
        <input
          id="task-name"
          className="input"
          type="text"
          placeholder="e.g. Write API docs"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <span className="form-label">Depth</span>
        <div className="depth-selector" role="group" aria-label="Depth level">
          {DEPTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`depth-option${depth === option.value ? " depth-option-active" : ""}`}
              onClick={() => setDepth(option.value)}
              aria-pressed={depth === option.value}
            >
              <span className="depth-option-label">{option.label}</span>
              <span className="depth-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">Session length</span>
        <p className="suggestion-explanation">{suggestionExplanation}</p>
        <div className="duration-options" role="group" aria-label="Session length">
          <button
            type="button"
            className={`duration-option${durationMode === "suggested" ? " duration-option-active" : ""}`}
            onClick={() => setDurationMode("suggested")}
            aria-pressed={durationMode === "suggested"}
          >
            <span className="duration-option-minutes">
              Recommended · {suggestedMinutes} min
            </span>
          </button>
          {PRESET_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`duration-option${durationMode === minutes ? " duration-option-active" : ""}`}
              onClick={() => setDurationMode(minutes)}
              aria-pressed={durationMode === minutes}
            >
              <span className="duration-option-minutes">{minutes} min</span>
            </button>
          ))}
          <button
            type="button"
            className={`duration-option${durationMode === "custom" ? " duration-option-active" : ""}`}
            onClick={() => setDurationMode("custom")}
            aria-pressed={durationMode === "custom"}
          >
            <span className="duration-option-minutes">Your call</span>
          </button>
        </div>
        {durationMode === "custom" && (
          <div className="duration-custom">
            <label className="form-label" htmlFor="custom-duration">
              Minutes
            </label>
            <input
              id="custom-duration"
              className="input duration-custom-input"
              type="number"
              min={MIN_CUSTOM_MINUTES}
              max={MAX_CUSTOM_MINUTES}
              step={1}
              inputMode="numeric"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
            />
            <p className="duration-custom-hint">
              {MIN_CUSTOM_MINUTES}–{MAX_CUSTOM_MINUTES} minutes
            </p>
          </div>
        )}
      </div>

      <div className="screen-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canStart}
          onClick={() => {
            if (activeMinutes === null) {
              return;
            }
            onStart({
              task: task.trim(),
              depth,
              plannedSeconds: activeMinutes * 60,
            });
          }}
        >
          Start — {activeMinutes ?? "—"} min
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Not yet
        </button>
      </div>
    </section>
  );
}
