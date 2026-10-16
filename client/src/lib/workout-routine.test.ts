import test from "node:test";
import assert from "node:assert/strict";
import { ROUTINE_KEY, loadRoutine, parseRoutine, saveRoutine } from "./workout-routine";
import { emptyRoutine, type Routine } from "@shared/fitness-routine";

function fakeStorage(options: { failReads?: boolean; failWrites?: boolean } = {}) {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => { if (options.failReads) throw new Error("blocked"); return data.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (options.failWrites) throw new Error("full"); data.set(k, v); },
    removeItem: (k: string) => data.delete(k),
  };
  return data;
}

const mine: Routine = {
  Push: { exercises: "Incline dumbbell press 3x8-10\nLateral raise 4x12", notes: "Presses first" },
  Pull: { exercises: "Lat pulldown 3x8", notes: "" },
  Legs: { exercises: "", notes: "Light day" },
};

test("the routine is saved under the synced workout- prefix, so it follows the account", () => {
  assert.ok(ROUTINE_KEY.startsWith("workout-"));
});

test("with nothing saved the routine is empty", () => {
  fakeStorage();
  assert.deepEqual(loadRoutine(), emptyRoutine());
});

test("a saved routine comes back exactly as typed", () => {
  const data = fakeStorage();
  saveRoutine(mine);
  assert.deepEqual(loadRoutine(), mine);
  assert.equal(data.size, 1, "one key holds all three days");
});

test("a damaged value gives an empty routine, and a damaged day leaves the others alone", () => {
  assert.deepEqual(parseRoutine("not json"), emptyRoutine());
  assert.deepEqual(parseRoutine("[]"), emptyRoutine());
  assert.deepEqual(parseRoutine("42"), emptyRoutine());
  assert.deepEqual(parseRoutine(null), emptyRoutine());
  const odd = parseRoutine(JSON.stringify({ Push: "x", Pull: { exercises: 5, notes: ["a"] }, Legs: { exercises: "Squat", notes: "n" } }));
  assert.deepEqual(odd.Push, { exercises: "", notes: "" });
  assert.deepEqual(odd.Pull, { exercises: "", notes: "" });
  assert.deepEqual(odd.Legs, { exercises: "Squat", notes: "n" });
});

test("very long text is cut to the limits the AI request accepts", () => {
  const long = parseRoutine(JSON.stringify({ Push: { exercises: "e".repeat(9000), notes: "n".repeat(2000) } }));
  assert.equal(long.Push.exercises.length, 4000);
  assert.equal(long.Push.notes.length, 600);
});

test("blocked or full storage never throws", () => {
  fakeStorage({ failWrites: true });
  assert.doesNotThrow(() => saveRoutine(mine));
  fakeStorage({ failReads: true });
  assert.deepEqual(loadRoutine(), emptyRoutine());
  delete (globalThis as any).localStorage;
  assert.deepEqual(loadRoutine(), emptyRoutine(), "no storage at all (server rendering)");
});
