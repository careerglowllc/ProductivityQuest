import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTouchInput } from "./emoji-picker";

const source = readFileSync(new URL("./emoji-picker.tsx", import.meta.url), "utf8");
const picker = source.slice(source.indexOf("export function EmojiPicker"));

function withWindow(matchMedia: unknown, run: () => void) {
  const g = globalThis as { window?: unknown };
  const before = g.window;
  g.window = matchMedia === undefined ? {} : { matchMedia };
  try { run(); } finally { if (before === undefined) delete g.window; else g.window = before; }
}

test("a touch screen is told apart from a mouse by its coarse pointer", () => {
  withWindow((query: string) => ({ matches: query === "(pointer: coarse)" }), () => assert.equal(isTouchInput(), true));
  withWindow(() => ({ matches: false }), () => assert.equal(isTouchInput(), false));
  withWindow(undefined, () => assert.equal(isTouchInput(), false), );
  assert.equal(isTouchInput(), false, "no window at all (server rendering)");
});

test("the search box is not focused on open on a touch screen, so the keyboard does not cover the emoji list", () => {
  assert.ok(picker.includes("autoFocus={!isTouchInput()}"));
  assert.ok(!/\bautoFocus\s*\n/.test(picker), "no unconditional autofocus");
});

test("scrolling never closes the picker: no page-scroll or swipe handlers remain", () => {
  assert.ok(!picker.includes('addEventListener("scroll"'));
  assert.ok(!picker.includes("onTouchMove"));
  assert.ok(!picker.includes("handleTouchMove"));
  assert.ok(!picker.includes("setOpen(false);\n      touchStartY"));
  assert.ok(!source.includes("useEffect"), "nothing in the picker reacts to scrolling");
});

test("the emoji list scrolls by touch on its own without dragging the page, and the picker fits a narrow screen", () => {
  assert.ok(picker.includes("h-[200px] overflow-y-auto overscroll-contain"));
  assert.ok(picker.includes('touchAction: "pan-y"'));
  assert.ok(picker.includes("max-w-[calc(100vw-1rem)]"));
  assert.ok(picker.includes("collisionPadding={8}"));
});

test("choosing an emoji still closes the picker and clears the search", () => {
  const select = picker.slice(picker.indexOf("const handleSelect"), picker.indexOf("// Keyword-based search"));
  assert.ok(select.includes("onChange(emoji)") && select.includes("setOpen(false)") && select.includes('setSearch("")'));
});
