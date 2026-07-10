import { useState } from "react";
import type { SessionContext } from "../types/navigation";
import { getEnabledInterruptCategories } from "../lib/interruptCategories";

interface InterruptLogProps {
  session: SessionContext;
  initialType?: string;
  onSelectType: (type: string) => void;
  onResume: () => void;
  onEnd: () => void;
}

export default function InterruptLog({
  session,
  initialType,
  onSelectType,
  onResume,
  onEnd,
}: InterruptLogProps) {
  const [selected, setSelected] = useState<string | null>(initialType ?? null);
  const options = getEnabledInterruptCategories();

  const handleSelect = (type: string) => {
    if (selected === null) {
      onSelectType(type);
    }
    setSelected(type);
  };

  return (
    <section className="screen screen-overlay interrupt-log" data-screen="interruptLog">
      <div className="interrupt-log-panel">
        <h2>What broke your focus?</h2>
        <p className="screen-subtitle">
          Logging for &ldquo;{session.task}&rdquo;
          {session.interrupts > 0 &&
            ` · ${session.interrupts} logged so far`}
        </p>

        <div className="interrupt-options" role="group" aria-label="Interruption type">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`interrupt-option${selected === option.key ? " interrupt-option-selected" : ""}`}
              onClick={() => handleSelect(option.key)}
              aria-pressed={selected === option.key}
            >
              <span className="interrupt-option-icon" aria-hidden>
                {option.icon}
              </span>
              <span className="interrupt-option-label">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="screen-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onResume}
            disabled={selected === null}
          >
            Resume
          </button>
          <button type="button" className="btn btn-ghost" onClick={onEnd}>
            End session
          </button>
        </div>
      </div>
    </section>
  );
}
