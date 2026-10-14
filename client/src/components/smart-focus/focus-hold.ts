import { useEffect, useSyncExternalStore } from "react";

// Smart Focus holds its list still while you are in the middle of something: a quest dialog is open,
// or a text box has focus. Nothing re-ranks or reshuffles until you are done.
const holds = new Set<symbol>();
const listeners = new Set<() => void>();
let typing = false;
let typingTarget: Element | null = null;
let removalWatcher: MutationObserver | null = null;
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
  document.addEventListener("focusin", (event) => setTyping(isTypingTarget(event.target as HTMLElement | null) ? (event.target as Element) : null));
  // Focus moves from one box to the next through a gap with nothing focused, so look again once it settles.
  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      setTyping(isTypingTarget(active as HTMLElement | null) ? active : null);
    }, 0);
  });
}

// A text box that is removed while focused (a dialog closing after Save) sends no focus event, so watch for that,
// or Smart Focus would stay held still until the next click.
function setTyping(target: Element | null) {
  typingTarget = target;
  typing = target !== null;
  if (target && !removalWatcher && typeof MutationObserver !== "undefined") {
    removalWatcher = new MutationObserver(() => { if (typingTarget && !typingTarget.isConnected) setTyping(null); });
    removalWatcher.observe(document.body, { childList: true, subtree: true });
  } else if (!target && removalWatcher) {
    removalWatcher.disconnect();
    removalWatcher = null;
  }
  update();
}

// Holds Smart Focus while `active` is true, such as for as long as a quest dialog is open.
export function useFocusHold(active: boolean) {
  useEffect(() => (active ? acquireFocusHold() : undefined), [active]);
}

export function useFocusHeld(): boolean {
  return useSyncExternalStore(onFocusHoldChange, isFocusHeld, () => false);
}
