import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

/**
 * Shared "what do we call this person" logic, used by both the sidebar brand
 * mark and the dashboard's "Welcome back" greeting so they always agree.
 * Defaults to the email/username-derived name; overridden by a custom
 * nickname the user can set (persisted server-side, per-account).
 */
export function useNickname() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: widgetPrefs } = useQuery<{ dashboardNickname?: string }>({
    queryKey: ["/api/widget-preferences"],
    staleTime: Infinity,
    retry: false,
  });

  const emailDerivedName = String((user as any)?.firstName || (user as any)?.username || (user as any)?.email || "")
    .split(/[@\s]/)[0];
  const nickname = widgetPrefs?.dashboardNickname || emailDerivedName || "there";
  const initials = (nickname.slice(0, 2) || "?").toUpperCase();

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/widget-preferences", { dashboardNickname: value });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/widget-preferences"], data);
    },
  });

  return { nickname, initials, setNickname: saveMutation.mutate };
}

/** Inline click-to-edit state helper for the nickname — used wherever the
 *  nickname is rendered as editable text (dashboard greeting, sidebar brand). */
export function useEditableNickname() {
  const { nickname, initials, setNickname } = useNickname();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);

  const startEditing = () => {
    setDraft(nickname);
    setEditing(true);
  };
  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== nickname) setNickname(trimmed);
  };
  const cancel = () => setEditing(false);

  return { nickname, initials, editing, draft, setDraft, startEditing, commit, cancel };
}
