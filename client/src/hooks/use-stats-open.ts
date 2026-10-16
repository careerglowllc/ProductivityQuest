import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadStatsOpen, saveStatsOpen, type StatsKind } from "@/lib/stats-open";

// Whether the Stats widget is open, remembered on the account (see stats-open.ts) and kept up to date across devices.
export function useStatsOpen(kind: StatsKind): readonly [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => loadStatsOpen(kind));
  const lastTap = useRef(0);

  // A refresh that lands right after a tap could carry the old value; the tap wins.
  useEffect(() => subscribeUserDataRefresh(() => { if (Date.now() - lastTap.current > 3000) setOpen(loadStatsOpen(kind)); }), [kind]);

  const set = useCallback((next: boolean) => {
    lastTap.current = Date.now();
    setOpen(next);
    saveStatsOpen(kind, next);
  }, [kind]);

  return [open, set] as const;
}
