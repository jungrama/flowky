import { useCallback, useState } from "react";
import {
  computeScore,
  getSessions,
  saveSession,
  suggestLength,
  type Depth,
  type InterruptionInput,
  type Session,
} from "../lib/tauri";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (days = 7) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessions(days);
      setSessions(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const persistSession = useCallback(
    async (session: Session, interruptions: InterruptionInput[] = []) => {
      setError(null);
      try {
        const id = await saveSession(session, interruptions);
        await loadSessions();
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      }
    },
    [loadSessions],
  );

  const score = useCallback(
    async (data?: Session[]) => computeScore(data ?? sessions),
    [sessions],
  );

  const suggestedLength = useCallback(
    async (depth: Depth, data?: Session[]) =>
      suggestLength(data ?? sessions, depth),
    [sessions],
  );

  return {
    sessions,
    loading,
    error,
    loadSessions,
    saveSession: persistSession,
    computeScore: score,
    suggestLength: suggestedLength,
  };
}
