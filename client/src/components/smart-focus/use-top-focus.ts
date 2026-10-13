import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { focusFingerprint } from "./focus-fingerprint";
import { topFocus } from "./select-focus";
import { useFocusRanking, useFocusState } from "./use-smart-focus";

export type TopFocusStatus = "loading" | "ready" | "error";

// The most important quests right now, straight from the Smart Focus ranking (AI when on, rules otherwise).
export function useTopFocus(tasks: readonly any[], tasksLoading: boolean, limit = 3) {
  const { user } = useAuth();
  const state = useFocusState(!!user);
  const day = new Date().toLocaleDateString("en-CA", { timeZone: state.data?.timezone || undefined });
  const fingerprint = useMemo(
    () => focusFingerprint((user as { id?: string | number } | undefined)?.id, day, tasks),
    [tasks, user, day],
  );
  const ranking = useFocusRanking(!!user && !tasksLoading && !!state.data, fingerprint, state.data?.enabled === true);
  const status: TopFocusStatus = state.isError || ranking.isError ? "error" : ranking.data ? "ready" : "loading";
  return {
    status,
    tasks: ranking.data ? topFocus(tasks, ranking.data, limit) : [],
    reasons: ranking.data?.reasons ?? {},
  };
}
