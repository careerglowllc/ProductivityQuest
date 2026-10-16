import { useCallback, useEffect, useRef, useState } from "react";
import type { Routine } from "@shared/fitness-routine";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { loadRoutine, saveRoutine } from "@/lib/workout-routine";

// The routine, saved on the account and kept up to date when another device changes it.
export function useRoutine(): readonly [Routine, (next: Routine) => void] {
  const [routine, setRoutine] = useState<Routine>(() => loadRoutine());
  const lastSave = useRef(0);

  // A refresh that lands right after a save could carry the old text; the save wins.
  useEffect(() => subscribeUserDataRefresh(() => { if (Date.now() - lastSave.current > 3000) setRoutine(loadRoutine()); }), []);

  const save = useCallback((next: Routine) => {
    lastSave.current = Date.now();
    setRoutine(next);
    saveRoutine(next);
  }, []);

  return [routine, save] as const;
}
