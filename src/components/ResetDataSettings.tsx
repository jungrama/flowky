import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetData } from "../lib/tauri";

type State = "idle" | "working" | "done" | "error";

export default function ResetDataSettings() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const wipe = async () => {
    setState("working");
    setError(null);
    try {
      await resetData();
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium text-foreground">Reset all data</p>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Warning: this permanently deletes every focus session, interruption,
          and tracked app time on this machine. Your app &amp; site lists are
          kept. This cannot be undone.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" disabled={state === "working"}>
              {state === "working" ? "Deleting…" : "Delete everything"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes every focus session, interruption, and
                tracked app time on this machine. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void wipe()}>
                Yes, delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {state === "done" && (
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            All done. Fresh start!
          </p>
        )}
        {state === "error" && error && (
          <p className="mt-2 text-sm text-destructive" role="status">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
