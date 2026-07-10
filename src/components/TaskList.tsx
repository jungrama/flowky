import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTasks } from "../hooks/useTasks";

interface TaskListProps {
  /** When provided, each open task becomes tappable to pick it for a session. */
  onPick?: (title: string) => void;
}

export default function TaskList({ onPick }: TaskListProps) {
  const { tasks, loading, add, toggle, remove } = useTasks();
  const [draft, setDraft] = useState("");

  const submit = async () => {
    const value = draft.trim();
    if (!value) return;
    await add(value);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add a task…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          aria-label="New task"
        />
        <Button type="button" onClick={() => void submit()} disabled={!draft.trim()}>
          <Plus />
          Add
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {loading ? "Loading…" : "No tasks yet. Add one above."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-card-foreground shadow-sm"
            >
              <Checkbox
                checked={task.done}
                onCheckedChange={(v) => void toggle(task.id!, v === true)}
                aria-label={task.done ? "Mark not done" : "Mark done"}
              />

              {onPick && !task.done ? (
                <button
                  type="button"
                  className="flex-1 truncate text-left text-sm text-foreground"
                  onClick={() => onPick(task.title)}
                >
                  {task.title}
                </button>
              ) : (
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    task.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {task.title}
                </span>
              )}

              {onPick && !task.done && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => onPick(task.title)}
                >
                  <Check />
                  Pick
                </Button>
              )}

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground"
                onClick={() => void remove(task.id!)}
                aria-label="Delete task"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
