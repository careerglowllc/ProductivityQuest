import type { FocusAction } from "@shared/smart-focus-ai";

export type FocusActionOption = { action: FocusAction; label: string; hint: string; disabled: boolean };

// The three choices in the feedback dialog. A move that would change nothing is disabled once placement is known.
export function focusActionOptions(inFocus: boolean | undefined): FocusActionOption[] {
  return [
    { action: "include", label: "Move into Smart Focus", disabled: inFocus === true,
      hint: inFocus === true ? "Already in Smart Focus" : "Add this quest to your Smart Focus list" },
    { action: "exclude", label: "Take off Smart Focus", disabled: inFocus === false,
      hint: inFocus === false ? "Not in Smart Focus right now" : "Remove this quest from your Smart Focus list" },
    { action: "keep", disabled: false,
      label: inFocus === true ? "Keep it in Smart Focus" : inFocus === false ? "Keep it out of Smart Focus" : "Keep it where it is",
      hint: "Tell Smart Focus it got this one right" },
  ];
}

const GENERIC = "For example: I prefer short admin quests after lunch, but this client deadline matters most this week.";
export function feedbackPlaceholder(action: FocusAction | null, inFocus: boolean | undefined): string {
  if (action === "include") return "Why does this belong in Smart Focus?";
  if (action === "exclude") return "Why should this come off Smart Focus?";
  if (action === "keep") return inFocus === true ? "Why is Smart Focus right to include this?" : inFocus === false ? "Why is it right that this stays out?" : "Why is it right where it is?";
  return GENERIC;
}

export function feedbackLabel(action: FocusAction | null): string {
  return action === "include" ? "Why move it in" : action === "exclude" ? "Why take it off" : action === "keep" ? "Why keep it here" : "Your preference";
}
