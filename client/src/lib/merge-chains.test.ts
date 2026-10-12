import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { duplicateNames, mergeChainEntries } from "./merge-chains";

const entry = (id: string, name = id) => ({ id, name });
const merges = [{ into: "chain", from: ["chain-a", "chain-b"] }];
const seeds = [entry("chain", "Chain (all locations)"), entry("other")];
const ids = (list: { id: string }[]) => list.map((e) => e.id).sort();

test("merge: per-location entries are replaced by the single merged entry", () => {
  const result = mergeChainEntries([entry("chain-a"), entry("chain-b"), entry("keep")], seeds, merges);
  assert.deepEqual(ids(result), ["chain", "keep"]);
  assert.equal(result.find((e) => e.id === "chain")?.name, "Chain (all locations)");
});

test("merge: works when only one of the old entries is stored", () => {
  assert.deepEqual(ids(mergeChainEntries([entry("chain-b"), entry("keep")], seeds, merges)), ["chain", "keep"]);
});

test("merge: unrelated entries are never touched or reordered", () => {
  const stored = [entry("x"), entry("y"), entry("z")];
  assert.deepEqual(mergeChainEntries(stored, seeds, merges).map((e) => e.id), ["x", "y", "z"]);
});

test("merge: running it twice changes nothing more", () => {
  const once = mergeChainEntries([entry("chain-a"), entry("chain-b")], seeds, merges);
  assert.deepEqual(mergeChainEntries(once, seeds, merges), once);
});

test("merge: an already merged entry isn't duplicated or overwritten", () => {
  const edited = { id: "chain", name: "My own edit" };
  const result = mergeChainEntries([edited, entry("chain-a")], seeds, merges);
  assert.deepEqual(result, [edited]);
});

test("merge: nothing is added when no old entry was stored (e.g. the entry was deleted on purpose)", () => {
  assert.deepEqual(mergeChainEntries([entry("keep")], seeds, merges), [entry("keep")]);
});

test("merge: the input list is not modified", () => {
  const stored = [entry("chain-a"), entry("keep")];
  const copy = [...stored];
  mergeChainEntries(stored, seeds, merges);
  assert.deepEqual(stored, copy);
});

test("duplicate names: finds repeated names regardless of case or spacing", () => {
  assert.deepEqual(duplicateNames(["Nirvana Soul Coffee", "Cattlemens", " nirvana soul coffee "]), ["nirvana soul coffee"]);
  assert.deepEqual(duplicateNames(["A", "B", "C"]), []);
});

// Guards the rule that a chain is one entry listing every location.
test("seeded Food and Activities entries have no repeated names", () => {
  for (const file of ["food-in-cities.tsx", "activities-in-cities.tsx"]) {
    const source = readFileSync(new URL(`../pages/${file}`, import.meta.url), "utf8");
    const start = source.indexOf("const SEED_ENTRIES");
    const block = source.slice(start, source.indexOf("\n];", start));
    const names = [...block.matchAll(/^\s+name: "(.+)",$/gm)].map((m) => m[1]);
    assert.ok(names.length > 10, `${file}: found the seeded entries`);
    assert.deepEqual(duplicateNames(names), [], `${file}: combine repeated names into one entry with every location`);
  }
});
