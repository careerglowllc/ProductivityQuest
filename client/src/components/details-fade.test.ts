import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detailsFadeClass } from "./details-fade";

test("light mode fades the details box to white, with no slate stops that the light theme turns into a dark band", () => {
  const light = detailsFadeClass(false);
  assert.match(light, /\bfrom-white\b/);
  assert.match(light, /\bto-transparent\b/);
  assert.doesNotMatch(light, /slate/);
});

test("dark mode keeps the slate fade", () => {
  assert.match(detailsFadeClass(true), /from-slate-800\/95 via-slate-800\/80 to-transparent/);
});

test("the quest details box uses the theme-aware fade", () => {
  const modal = readFileSync(new URL("./task-detail-modal.tsx", import.meta.url), "utf8");
  assert.ok(modal.includes("detailsFadeClass(isDark)"));
  assert.ok(!modal.includes("from-slate-800/95"), "no hard-coded dark fade left in the modal");
});
