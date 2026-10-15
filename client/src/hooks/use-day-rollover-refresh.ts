import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { localDay, msUntilNextDay } from "@shared/due-date-rollover";

// For accounts with "Move overdue quests to today" on: when the day changes in their timezone, load the quests again,
// so the page shows the dates the server just moved without needing a reload. It waits until just after midnight,
// when the server has rolled them, and also checks when the app is brought back to the front.
export function useDayRolloverRefresh() {
  const { isAuthenticated } = useAuth();
  const client = useQueryClient();
  const { data } = useQuery<{ timezone?: string; autoRollDueDates?: boolean }>({ queryKey: ["/api/settings"], enabled: isAuthenticated });
  const enabled = data?.autoRollDueDates === true;
  const timezone = data?.timezone;

  useEffect(() => {
    if (!enabled) return;
    let day = localDay(new Date(), timezone);
    const check = () => {
      const today = localDay(new Date(), timezone);
      if (today === day) return;
      day = today;
      void client.invalidateQueries({ queryKey: ["/api/tasks"] });
    };
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => { check(); schedule(); }, Math.max(60_000, msUntilNextDay(new Date(), timezone) + 45_000));
    };
    schedule();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled, timezone, client]);
}
