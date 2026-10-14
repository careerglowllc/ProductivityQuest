import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { focusOrderShifts, type FocusAction, type FocusPreference, type FocusProfile, type FocusQuest } from "@shared/smart-focus-ai";
import { FOCUS_FOLLOW_UP_MS, FOCUS_RANK_STALE_MS, autoRefreshOnReturn, focusRefreshDue } from "./focus-refresh";
import { isFocusHeld, useFocusHeld } from "./focus-hold";
import { freshestRanking, placementOf } from "./focus-placement";
import { applyFocusAction } from "./apply-focus-action";
import { useToast } from "@/hooks/use-toast";

export interface FocusState {
  enabled: boolean;
  available: boolean;
  preferences: { id: string; taskId: number; taskTitle: string; text: string; createdAt: string; action?: FocusAction; inFocus?: boolean }[];
  signals: { taskId: number; taskTitle: string; days: number }[];
  timezone: string;
  profile?: FocusProfile | null;
}
export interface FocusRanking {
  ids: number[];
  reasons: Record<string, string>;
  mode: "ai" | "rules";
  message: string;
  day: string;
  total: number;
  protectedCount: number;
  workload?: { level: "light" | "normal" | "busy" | "heavy"; pressure: number; committedMinutes: number; questCount: number; highPriorityCount: number };
  heldBack?: number;
  aiPending?: boolean; // the AI has not read the latest changes yet, because it was asked less than a minute ago
}
const stateKey = ["/api/smart-focus/state"] as const;
const rankKey = ["/api/smart-focus/rank"] as const;
const queryOptions = { staleTime: 15 * 60 * 1000, refetchOnWindowFocus: false, retry: false } as const;

export function focusError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Could not reach Smart Focus. Please try again.";
  try {
    const body = JSON.parse(raw.slice(raw.indexOf("{")));
    return body.error || body.message || raw;
  } catch { return raw; }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, path, body);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function useFocusState(enabled = true) {
  const { user } = useAuth();
  return useQuery<FocusState>({
    queryKey: [...stateKey, (user as { id?: string } | undefined)?.id],
    queryFn: () => request("GET", "/api/smart-focus/state"),
    enabled: enabled && !!user,
    ...queryOptions,
  });
}

// Smart Focus re-reads your quests when you open it, or when you come back to the app after being away a while.
// It never does while you are on the page, and never while a quest is being edited; use the Refresh button for that.
function useFocusAutoRefresh(enabled: boolean) {
  const client = useQueryClient();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      client.invalidateQueries({ queryKey: ["/api/tasks"] });
      client.invalidateQueries({ queryKey: rankKey });
      rerender(); // the page recomputes "today", such as after midnight
    };
    if (!isFocusHeld() && focusRefreshDue(client.getQueryState(["/api/tasks"])?.dataUpdatedAt, Date.now())) refresh();
    let hiddenAt: number | undefined;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      const due = autoRefreshOnReturn({ hiddenAt, now: Date.now(), held: isFocusHeld(), tasksUpdatedAt: client.getQueryState(["/api/tasks"])?.dataUpdatedAt });
      hiddenAt = undefined;
      if (due) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, client]);
}

export function useFocusRanking(enabled: boolean, fingerprint: string, aiEnabled: boolean) {
  const client = useQueryClient();
  const queryKey = [...rankKey, fingerprint, aiEnabled];
  const held = useFocusHeld();
  useFocusAutoRefresh(enabled);
  const ranking = useQuery<FocusRanking>({
    queryKey,
    queryFn: () => request("POST", "/api/smart-focus/rank", {}),
    enabled: enabled && !held,
    ...queryOptions,
    staleTime: FOCUS_RANK_STALE_MS,
    // While a new ranking loads, keep showing the last one instead of dropping to the fallback layout.
    placeholderData: keepPreviousData,
  });
  // While you are editing, the list shows exactly what it showed when you started, even if a ranking arrives.
  const frozen = useRef<FocusRanking | undefined>(undefined);
  if (!held) frozen.current = ranking.data;
  const refresh = useMutation({
    mutationFn: () => request<FocusRanking>("POST", "/api/smart-focus/rank?refresh=1", {}),
    onSuccess: (data) => client.setQueryData(queryKey, data),
  });
  // A change you made (a new quest, an edit) was ranked by the rules alone because the AI had just been asked.
  // Ask once more when its pause is over so the AI weighs it too, unless you are in the middle of editing.
  const waitingForAi = enabled && !held && ranking.data?.aiPending === true && !ranking.isPlaceholderData;
  useEffect(() => {
    if (!waitingForAi) return;
    const timer = window.setTimeout(() => { void client.invalidateQueries({ queryKey: rankKey }); }, FOCUS_FOLLOW_UP_MS);
    return () => window.clearTimeout(timer);
  }, [waitingForAi, ranking.dataUpdatedAt, client]);
  return { ...ranking, data: held ? frozen.current : ranking.data, refresh };
}

const currentRanking = (client: QueryClient) => freshestRanking(
  client.getQueryCache().findAll({ queryKey: rankKey }).map((query) => ({ data: query.state.data as FocusRanking | undefined, updatedAt: query.state.dataUpdatedAt })),
);

// Whether the quest is in the Smart Focus list right now; undefined when no list has loaded yet. Follows the newest
// ranking and updates when a newer one arrives, so a quest you just added is judged by a list that knows about it.
export function useFocusPlacement(taskId: number): boolean | undefined {
  const client = useQueryClient();
  return useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () => placementOf(currentRanking(client), taskId),
    () => undefined,
  );
}

// Forces a new ranking from the settings page, then lets the Quests page pick up the cached result.
export function useRefreshFocus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => request<FocusRanking>("POST", "/api/smart-focus/rank?refresh=1", {}),
    onSuccess: () => client.invalidateQueries({ queryKey: rankKey }),
  });
}

export function useFocusActions() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: stateKey }),
      client.invalidateQueries({ queryKey: rankKey }),
    ]);
  };
  const feedback = useMutation({
    mutationFn: (data: { taskId: number; text: string; action?: FocusAction; inFocus?: boolean }) => request<{ message?: string }>("POST", "/api/smart-focus/feedback", data),
    onSuccess: (data, variables) => {
      // Show the change at once, in every ranking on screen; the server's re-rank then replaces it.
      if (variables.action) {
        const action = variables.action;
        const tasks = client.getQueryData<FocusQuest[]>(["/api/tasks"]) ?? [];
        const saved = client.getQueriesData<FocusState>({ queryKey: stateKey }).map(([, state]) => state).find(Boolean)?.preferences ?? [];
        const shiftBefore = focusOrderShifts({ preferences: saved as FocusPreference[] }).get(variables.taskId) ?? 0;
        client.setQueriesData<FocusRanking>({ queryKey: rankKey }, (old) => old ? applyFocusAction(old, variables.taskId, action, tasks, shiftBefore) : old);
        // The quest's card (and this dialog with it) can disappear as the list updates, so confirm in a toast too.
        toast({ title: "Smart Focus updated", description: data?.message, duration: 6000 });
      }
      void invalidate();
      // The AI can only re-read your reason once its one-minute pause is over, so look again then.
      window.setTimeout(() => { void client.invalidateQueries({ queryKey: rankKey }); }, FOCUS_FOLLOW_UP_MS);
    },
  });
  const settings = useMutation({
    mutationFn: (enabled: boolean) => request("PATCH", "/api/smart-focus/settings", { enabled }),
    onSuccess: (_data, enabled) => {
      client.setQueryData<FocusState>([...stateKey, (user as { id?: string } | undefined)?.id], (old) => old ? { ...old, enabled } : old);
      return invalidate();
    },
  });
  const forget = useMutation({
    mutationFn: (path: string) => request("DELETE", `/api/smart-focus/${path}`),
    onSuccess: invalidate,
  });
  const dismiss = useMutation({
    mutationFn: (data: { taskId: number; undo?: boolean }) => request<{ error?: string; message?: string; protected?: boolean; dismissed?: boolean }>("POST", "/api/smart-focus/dismiss", data),
    onSuccess: async (data, variables) => {
      if (data?.protected || (data?.dismissed === false && !variables.undo)) {
        throw new Error(data.message || data.error || "This task is protected because it is urgent or starting today.");
      }
      if (!variables.undo) {
        client.setQueriesData<FocusRanking>({ queryKey: rankKey }, (old) => old ? {
          ...old, ids: old.ids.filter((id) => id !== variables.taskId),
        } : old);
      }
      await invalidate();
    },
  });
  return { feedback, settings, forget, dismiss };
}
