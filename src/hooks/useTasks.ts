import { useCallback, useEffect, useState } from "react";
import {
  addTask as addTaskCmd,
  deleteTask as deleteTaskCmd,
  getTasks,
  updateTask as updateTaskCmd,
  type Task,
} from "../lib/tauri";

/** Load + mutate the local task list. Optimistic where cheap; always refetches
 *  after a write so the SQLite ordering (open first, newest first) is authoritative. */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getTasks();
      setTasks(rows);
    } catch {
      /* ignore — Tauri not available (e.g. plain browser) */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await addTaskCmd(trimmed);
      await refresh();
    },
    [refresh],
  );

  const toggle = useCallback(
    async (id: number, done: boolean) => {
      await updateTaskCmd(id, { done });
      await refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: number, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      await updateTaskCmd(id, { title: trimmed });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteTaskCmd(id);
      await refresh();
    },
    [refresh],
  );

  return { tasks, loading, refresh, add, toggle, rename, remove };
}
