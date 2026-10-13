import test from "node:test";
import assert from "node:assert/strict";
import { allExpanded, readPanelOpen, setAllExpanded, toggleAll, writePanelOpen } from "./questline-panel";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

test("the panel is open by default", () => {
  assert.equal(readPanelOpen(memory()), true);
  assert.equal(readPanelOpen(null), true);
});

test("a collapsed panel stays collapsed, and reopening is remembered", () => {
  const storage = memory();
  writePanelOpen(false, storage);
  assert.equal(readPanelOpen(storage), false);
  writePanelOpen(true, storage);
  assert.equal(readPanelOpen(storage), true);
});

test("broken storage never throws", () => {
  const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  assert.equal(readPanelOpen(broken), true);
  assert.doesNotThrow(() => writePanelOpen(false, broken));
});

test("expand all and collapse all cover every questline", () => {
  const ids = [1, "2", 3];
  assert.deepEqual(setAllExpanded(ids, true), { 1: true, 2: true, 3: true });
  assert.deepEqual(setAllExpanded(ids, false), { 1: false, 2: false, 3: false });
});

test("allExpanded is true only when every questline is open", () => {
  assert.equal(allExpanded([1, 2], { 1: true, 2: true }), true);
  assert.equal(allExpanded([1, 2], { 1: true }), false);
  assert.equal(allExpanded([], {}), false);
});

test("collapse all folds every questline and the whole panel into one row", () => {
  const next = toggleAll([1, 2], true);
  assert.equal(next.panelOpen, false);
  assert.deepEqual(next.expanded, { 1: false, 2: false });
});

test("expand all opens the panel and every questline", () => {
  const next = toggleAll([1, 2], false);
  assert.equal(next.panelOpen, true);
  assert.deepEqual(next.expanded, { 1: true, 2: true });
});
