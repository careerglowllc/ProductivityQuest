import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { acquireFocusHold, isFocusHeld, isTypingTarget, onFocusHoldChange } from "./focus-hold";
import { FOCUS_AWAY_MS, autoRefreshOnReturn } from "./focus-refresh";

test("text boxes count as typing, buttons and checkboxes do not", () => {
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "search" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  for (const type of ["checkbox", "radio", "button", "submit", "range"]) assert.equal(isTypingTarget({ tagName: "INPUT", type }), false, type);
  assert.equal(isTypingTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTypingTarget(null), false);
});

test("Smart Focus is held while any dialog holds it, and let go when the last one closes", () => {
  const changes: boolean[] = [];
  const stop = onFocusHoldChange(() => changes.push(isFocusHeld()));
  assert.equal(isFocusHeld(), false);
  const releaseDetail = acquireFocusHold();
  const releaseFeedback = acquireFocusHold();
  assert.equal(isFocusHeld(), true);
  releaseDetail();
  assert.equal(isFocusHeld(), true, "one dialog is still open");
  releaseFeedback();
  assert.equal(isFocusHeld(), false);
  assert.deepEqual(changes, [true, false], "listeners hear only about real changes");
  releaseFeedback();
  assert.equal(isFocusHeld(), false, "letting go twice is harmless");
  stop();
});

test("it re-reads quests on return only after being away a while, and never mid-edit", () => {
  const now = 50_000_000;
  const stale = now - 10 * 60_000;
  const base = { hiddenAt: now - FOCUS_AWAY_MS, now, held: false, tasksUpdatedAt: stale };
  assert.equal(autoRefreshOnReturn(base), true);
  assert.equal(autoRefreshOnReturn({ ...base, hiddenAt: now - 60_000 }), false, "a quick glance away is not an absence");
  assert.equal(autoRefreshOnReturn({ ...base, hiddenAt: now - 8 * 3600_000 }), true);
  assert.equal(autoRefreshOnReturn({ ...base, held: true }), false, "a dialog is open");
  assert.equal(autoRefreshOnReturn({ ...base, hiddenAt: undefined }), false, "never left");
  assert.equal(autoRefreshOnReturn({ ...base, tasksUpdatedAt: now - 1000 }), false, "quests were just loaded");
  assert.equal(autoRefreshOnReturn({ ...base, tasksUpdatedAt: undefined }), false, "still loading");
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const hook = read("./use-smart-focus.ts");

test("Smart Focus no longer refreshes on a timer or on every window focus", () => {
  assert.ok(!hook.includes("setInterval"));
  assert.ok(!hook.includes('addEventListener("focus"'));
  assert.ok(hook.includes('"visibilitychange"'), "returning to the app after being away still refreshes");
});

test("while a quest is being edited the list neither re-ranks nor changes, and it never falls back to another layout", () => {
  assert.ok(hook.includes("enabled: enabled && !held"), "no ranking request while held");
  assert.ok(hook.includes("placeholderData: keepPreviousData"), "the last ranking stays on screen while a new one loads");
  assert.ok(hook.includes("data: held ? frozen.current : ranking.data"), "the list shows what it showed when the edit began");
  assert.ok(hook.includes("if (!held) frozen.current = ranking.data;"));
});

test("the quest dialog and the feedback dialog hold Smart Focus while open", () => {
  assert.ok(read("../task-detail-modal.tsx").includes("useFocusHold(open);"));
  assert.ok(read("./feedback-dialog.tsx").includes("useFocusHold(open);"));
});

test("an edit still waiting on its pause is saved when the quest dialog closes", () => {
  const modal = read("../task-detail-modal.tsx");
  const closing = modal.slice(modal.indexOf("// When modal closes"), modal.indexOf("// Detect if description text is truncated"));
  assert.ok(closing.includes("clearTimeout(detailsTimeoutRef.current)") && closing.includes("updateDetailsMutation.mutate(detailsValue)"));
  assert.ok(modal.includes("detailsTimeoutRef.current = null;\n      updateDetailsMutation.mutate(value);"), "a save that already ran is not repeated on close");
});

test("the Smart Focus list has a Refresh button, since nothing refreshes it while you are on it", () => {
  const home = read("../../pages/home.tsx");
  assert.ok(home.includes('data-testid="smart-focus-refresh"') && home.includes("focusRanking.refresh.mutate()"));
});
