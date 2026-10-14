import { useEffect, useSyncExternalStore } from "react";

// Smart Focus holds its list still while you are in the middle of something: a quest dialog is open,
// or a text box has focus. Nothing re-ranks or reshuffles until you are done.
const holds = new Set<symbol>();
const listeners = new Set<() => void>();
let typing = false;
let watching = false;
let held = false;

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "range", "submit", "reset", "file", "image", "color"]);

export function isTypingTarget(target: { tagName?: string; type?: string; isContentEditable?: boolean } | null | undefined): boolean {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") return !NON_TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  return target.isContentEditable === true;
}

function update() {
  const next = holds.size > 0 || typing;
  if (next === held) return;
  held = next;
  listeners.forEach((listener) => listener());
}

// Holds until the returned function is called. Several holds can overlap.
export function acquireFocusHold(): () => void {
  const id = Symbol("focus-hold");
  holds.add(id);
  update();
  return () => { holds.delete(id); update(); };
}

export const isFocusHeld = () => held;

export function onFocusHoldChange(listener: () => void): () => void {
  watchTyping();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function watchTyping() {
  if (watching || typeof document === "undefined") return;
  watching = true;
  document.addEventListener("focusin", (event) => { typing = isTypingTarget(event.target as HTMLElement | null); update(); });
  // Focus moves from one box to the next through a gap with nothing focused, so look again once it settles.
  document.addEventListener("focusout", () => {
    window.setTimeout(() => { typing = isTypingTarget(document.activeElement as HTMLElement | null); update(); }, 0);
  });
}

// Holds Smart Focus while `active` is true, such as for as long as a quest dialog is open.
export function useFocusHold(active: boolean) {
  useEffect(() => (active ? acquireFocusHold() : undefined), [active]);
}

export function useFocusHeld(): boolean {
  return useSyncExternalStore(onFocusHoldChange, isFocusHeld, () => false);
}
