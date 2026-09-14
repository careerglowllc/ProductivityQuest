import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

/**
 * Shared "what do we call this person" logic, used by the sidebar brand mark,
 * the dashboard's "Welcome back" greeting, and the sidebar's account summary
 * so they always agree. The nickname itself is only ever set from Settings;
 * defaults to the email they signed up with if they haven't set one.
 */
export function useNickname() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: widgetPrefs } = useQuery<{ dashboardNickname?: string }>({
    queryKey: ["/api/widget-preferences"],
    staleTime: Infinity,
    retry: false,
  });

  const emailFallback = String((user as any)?.email || (user as any)?.username || (user as any)?.firstName || "");
  const nickname = widgetPrefs?.dashboardNickname || emailFallback || "there";
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

/** Inline click-to-edit state helper for the nickname — used by the Settings
 *  "Set Nickname" control, the only place the nickname can be changed. */
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
