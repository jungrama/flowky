import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
    <section
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-6"
      data-screen="interruptLog"
    >
      <Card className="w-full max-w-sm gap-0 p-8 text-center">
        <h2 className="text-2xl font-normal tracking-[-0.03em]">
          What broke your focus?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logging for &ldquo;{session.task}&rdquo;
          {session.interrupts > 0 && ` · ${session.interrupts} logged so far`}
        </p>

        <div
          className="my-4 grid grid-cols-2 gap-2"
          role="group"
          aria-label="Interruption type"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border bg-muted p-4 text-foreground transition-colors hover:border-primary",
                selected === option.key &&
                  "border-primary bg-primary/[0.08]",
              )}
              onClick={() => handleSelect(option.key)}
              aria-pressed={selected === option.key}
            >
              <span className="text-xl" aria-hidden>
                {option.icon}
              </span>
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onResume} disabled={selected === null}>
            Resume
          </Button>
          <Button type="button" variant="ghost" onClick={onEnd}>
            End session
          </Button>
        </div>
      </Card>
    </section>
  );
}
