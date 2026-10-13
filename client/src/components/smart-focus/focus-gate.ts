export const SMART_FOCUS_SETTINGS_PATH = "/settings/smart-focus";

export type FocusView = "loading" | "error" | "off" | "on";

// What the Smart Focus tab should do: list quests only when Smart Focus is on in settings.
export function focusView(state: { isError: boolean; data?: { enabled: boolean } | null }): FocusView {
  if (state.data) return state.data.enabled ? "on" : "off";
  return state.isError ? "error" : "loading";
}

// Smart Focus orders its own list, so the due date / importance sort control is hidden there.
export const showsSortControl = (filter: string): boolean => filter !== "smart";
