import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freshestRanking, placementOf } from "./focus-placement";
import { focusActionOptions } from "./feedback-actions";
import type { FocusRanking } from "./use-smart-focus";

const ranking = (ids: number[]): FocusRanking => ({ ids, reasons: {}, mode: "rules", message: "", day: "2026-10-14", total: ids.length, protectedCount: 0 });

test("the newest ranking is the one used, wherever it sits among the older ones kept in memory", () => {
  const before = ranking([1, 2, 3]);
  const after = ranking([1, 2, 3, 7]);
  assert.equal(freshestRanking([{ data: before, updatedAt: 1000 }, { data: after, updatedAt: 2000 }]), after);
  assert.equal(freshestRanking([{ data: after, updatedAt: 2000 }, { data: before, updatedAt: 1000 }]), after);
  assert.equal(freshestRanking([{ data: before, updatedAt: 1000 }, { updatedAt: 3000 }]), before, "one still loading has nothing to read");
  assert.equal(freshestRanking([]), undefined);
  assert.equal(freshestRanking([{ updatedAt: 0 }]), undefined);
});

test("a quest you just added is judged by the list that knows about it, so ranking it higher is allowed", () => {
  const oldList = ranking([1, 2, 3]);
  const newList = ranking([7, 1, 2, 3]);
  // Before: the first list found was the old one, which says the new quest is not in Smart Focus.
  assert.equal(placementOf(oldList, 7), false);
  const placement = placementOf(freshestRanking([{ data: oldList, updatedAt: 1000 }, { data: newList, updatedAt: 2000 }]), 7);
  assert.equal(placement, true);
  const options = Object.fromEntries(focusActionOptions(placement).map((option) => [option.action, option.disabled]));
  assert.deepEqual(options, { include: true, exclude: false, higher: false, lower: false, keep: false });
});

test("with no list loaded yet nothing is disabled, and a quest that really is out of the list can only be moved in", () => {
  assert.equal(placementOf(undefined, 7), undefined);
  assert.ok(focusActionOptions(undefined).every((option) => !option.disabled));
  const out = Object.fromEntries(focusActionOptions(false).map((option) => [option.action, option.disabled]));
  assert.deepEqual(out, { include: false, exclude: true, higher: true, lower: true, keep: false });
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const hook = read("./use-smart-focus.ts");

test("the feedback dialog reads the newest ranking and updates when a newer one arrives", () => {
  const placement = hook.slice(hook.indexOf("export function useFocusPlacement"), hook.indexOf("// Forces a new ranking"));
  assert.ok(placement.includes("useSyncExternalStore") && placement.includes("client.getQueryCache().subscribe(notify)"));
  assert.ok(hook.includes("freshestRanking(") && placement.includes("placementOf(currentRanking(client), taskId)"));
  assert.ok(!placement.includes(".find(Boolean)"), "no longer takes whichever ranking happens to be first");
});

test("when the AI has not read your latest change yet, Smart Focus asks once more after its pause, unless you are editing", () => {
  assert.ok(hook.includes("aiPending?: boolean"));
  assert.ok(hook.includes("enabled && !held && ranking.data?.aiPending === true && !ranking.isPlaceholderData"));
  assert.ok(hook.includes("client.invalidateQueries({ queryKey: rankKey }); }, FOCUS_FOLLOW_UP_MS)"));
  assert.ok(hook.includes("return () => window.clearTimeout(timer);"));
});
