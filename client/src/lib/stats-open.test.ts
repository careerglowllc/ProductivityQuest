import test from "node:test";
import assert from "node:assert/strict";
import { STATS_OPEN_KEYS, loadStatsOpen, saveStatsOpen } from "./stats-open";

function fakeStorage(options: { failReads?: boolean; failWrites?: boolean } = {}) {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => { if (options.failReads) throw new Error("blocked"); return data.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (options.failWrites) throw new Error("full"); data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
  return data;
}

test("the widget choice is kept under the synced workout- and calories- prefixes, so it follows the account", () => {
  assert.ok(STATS_OPEN_KEYS.workout.startsWith("workout-"));
  assert.ok(STATS_OPEN_KEYS.meal.startsWith("calories-"));
});

test("the widget is open until it has been collapsed", () => {
  fakeStorage();
  assert.equal(loadStatsOpen("workout"), true);
  assert.equal(loadStatsOpen("meal"), true);
});

test("collapsing and opening are remembered, separately for lifting and calories", () => {
  const data = fakeStorage();
  saveStatsOpen("meal", false);
  assert.equal(loadStatsOpen("meal"), false);
  assert.equal(loadStatsOpen("workout"), true, "the other page is not affected");
  saveStatsOpen("workout", false);
  saveStatsOpen("meal", true);
  assert.equal(loadStatsOpen("meal"), true);
  assert.equal(loadStatsOpen("workout"), false);
  assert.equal(data.get(STATS_OPEN_KEYS.meal), "1");
  assert.equal(data.get(STATS_OPEN_KEYS.workout), "0");
});

test("an unreadable value means open, and blocked storage never throws", () => {
  const data = fakeStorage();
  data.set(STATS_OPEN_KEYS.meal, "banana");
  assert.equal(loadStatsOpen("meal"), true);
  fakeStorage({ failReads: true });
  assert.equal(loadStatsOpen("meal"), true);
  fakeStorage({ failWrites: true });
  assert.doesNotThrow(() => saveStatsOpen("meal", false));
});

test("with no storage at all (server rendering) the widget is open", () => {
  delete (globalThis as any).localStorage;
  assert.equal(loadStatsOpen("workout"), true);
});
