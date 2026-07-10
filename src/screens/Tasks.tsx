import { Button } from "@/components/ui/button";
import TaskList from "../components/TaskList";

interface TasksProps {
  onStartWith?: (title: string) => void;
}

export default function Tasks({ onStartWith }: TasksProps) {
  return (
    <section
      className="flex w-full max-w-sm flex-col items-stretch gap-4"
      data-screen="tasks"
    >
      <header className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-normal tracking-[-0.03em]">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Plan what to focus on. Pick one to start a session.
        </p>
      </header>

      <TaskList onPick={onStartWith} />

      {onStartWith && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onStartWith("")}
        >
          Start a blank session
        </Button>
      )}
    </section>
  );
}
