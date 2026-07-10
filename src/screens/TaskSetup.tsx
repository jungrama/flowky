import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

const FORM_GROUP_CLASS = "flex w-full flex-col gap-2";
const FORM_LABEL_CLASS = "text-sm font-medium text-muted-foreground";
const INPUT_CLASS =
  "h-auto rounded-lg border-border bg-card px-4 py-2 text-base shadow-none md:text-base focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
const OPTION_CLASS =
  "flex cursor-pointer flex-col gap-[2px] rounded-lg border bg-card text-foreground";
const OPTION_ACTIVE_CLASS = "border-primary bg-primary/12";

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
    <section
      className="flex w-full max-w-md flex-col items-stretch gap-4 text-left"
      data-screen="taskSetup"
    >
      <h2 className="text-2xl font-normal leading-[1.2] tracking-[-0.03em]">
        Set up your session
      </h2>

      <div className={FORM_GROUP_CLASS}>
        <Label
          className={`${FORM_LABEL_CLASS} leading-normal`}
          htmlFor="task-name"
        >
          What are you working on?
        </Label>
        <Input
          id="task-name"
          className={INPUT_CLASS}
          type="text"
          placeholder="e.g. Write API docs"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          autoFocus
        />
      </div>

      <div className={FORM_GROUP_CLASS}>
        <span className={FORM_LABEL_CLASS}>Depth</span>
        <div className="flex flex-col gap-1" role="group" aria-label="Depth level">
          {DEPTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                OPTION_CLASS,
                "items-start px-4 py-2 text-left",
                depth === option.value && OPTION_ACTIVE_CLASS,
              )}
              onClick={() => setDepth(option.value)}
              aria-pressed={depth === option.value}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={FORM_GROUP_CLASS}>
        <span className={FORM_LABEL_CLASS}>Session length</span>
        <p className="mb-2 text-sm leading-[1.45] text-muted-foreground">
          {suggestionExplanation}
        </p>
        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Session length"
        >
          <button
            type="button"
            className={cn(
              OPTION_CLASS,
              "items-center px-2 py-4",
              durationMode === "suggested" && OPTION_ACTIVE_CLASS,
            )}
            onClick={() => setDurationMode("suggested")}
            aria-pressed={durationMode === "suggested"}
          >
            <span className="font-semibold tabular-nums">
              Recommended · {suggestedMinutes} min
            </span>
          </button>
          {PRESET_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={cn(
                OPTION_CLASS,
                "items-center px-2 py-4",
                durationMode === minutes && OPTION_ACTIVE_CLASS,
              )}
              onClick={() => setDurationMode(minutes)}
              aria-pressed={durationMode === minutes}
            >
              <span className="font-semibold tabular-nums">{minutes} min</span>
            </button>
          ))}
          <button
            type="button"
            className={cn(
              OPTION_CLASS,
              "items-center px-2 py-4",
              durationMode === "custom" && OPTION_ACTIVE_CLASS,
            )}
            onClick={() => setDurationMode("custom")}
            aria-pressed={durationMode === "custom"}
          >
            <span className="font-semibold tabular-nums">Your call</span>
          </button>
        </div>
        {durationMode === "custom" && (
          <div className="flex flex-col gap-1">
            <Label
              className={`${FORM_LABEL_CLASS} leading-normal`}
              htmlFor="custom-duration"
            >
              Minutes
            </Label>
            <Input
              id="custom-duration"
              className={`${INPUT_CLASS} max-w-32`}
              type="number"
              min={MIN_CUSTOM_MINUTES}
              max={MAX_CUSTOM_MINUTES}
              step={1}
              inputMode="numeric"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {MIN_CUSTOM_MINUTES}–{MAX_CUSTOM_MINUTES} minutes
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex w-full flex-col gap-2">
        <Button
          type="button"
          className="h-auto w-full rounded-lg border border-primary px-4 py-2 text-base font-medium hover:border-[#333333] hover:bg-[#333333] disabled:opacity-45"
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
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full rounded-lg px-4 py-2 text-base font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={onBack}
        >
          Not yet
        </Button>
      </div>
    </section>
  );
}
