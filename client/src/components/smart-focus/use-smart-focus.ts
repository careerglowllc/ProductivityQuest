import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { FocusAction } from "@shared/smart-focus-ai";

export interface FocusState {
  enabled: boolean;
  available: boolean;
  preferences: { id: string; taskId: number; taskTitle: string; text: string; createdAt: string; action?: FocusAction; inFocus?: boolean }[];
  signals: { taskId: number; taskTitle: string; days: number }[];
  timezone: string;
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

export function useFocusRanking(enabled: boolean, fingerprint: string, aiEnabled: boolean) {
  const client = useQueryClient();
  const queryKey = [...rankKey, fingerprint, aiEnabled];
  const ranking = useQuery<FocusRanking>({
    queryKey,
    queryFn: () => request("POST", "/api/smart-focus/rank", {}),
    enabled,
    ...queryOptions,
  });
  const refresh = useMutation({
    mutationFn: () => request<FocusRanking>("POST", "/api/smart-focus/rank?refresh=1", {}),
    onSuccess: (data) => client.setQueryData(queryKey, data),
  });
  return { ...ranking, refresh };
}

// Whether the quest is in the Smart Focus list the user last saw; undefined when no list has loaded yet.
export function useFocusPlacement(taskId: number): boolean | undefined {
  const client = useQueryClient();
  const ranking = client.getQueriesData<FocusRanking>({ queryKey: rankKey }).map(([, data]) => data).find(Boolean);
  return ranking ? ranking.ids.includes(taskId) : undefined;
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
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: stateKey }),
      client.invalidateQueries({ queryKey: rankKey }),
    ]);
  };
  const feedback = useMutation({
    mutationFn: (data: { taskId: number; text: string; action?: FocusAction; inFocus?: boolean }) => request<{ message?: string; staysInFocus?: boolean }>("POST", "/api/smart-focus/feedback", data),
    onSuccess: invalidate,
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
