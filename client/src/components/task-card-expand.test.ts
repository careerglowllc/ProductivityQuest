import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canExpandTask, hasBadgeRow, taskDescription } from "./task-card-expand";

test("the description comes from description, then details, trimmed", () => {
  assert.equal(taskDescription({ description: "  Call the clinic  ", details: "ignored" }), "Call the clinic");
  assert.equal(taskDescription({ description: "", details: "From details" }), "From details");
  assert.equal(taskDescription({}), "");
  assert.equal(taskDescription({ description: "   " }), "");
});

test("the badge row has content for importance, repeats, skills, flags and other assignees", () => {
  assert.equal(hasBadgeRow({}), false);
  assert.equal(hasBadgeRow({ importance: "High" }), true);
  assert.equal(hasBadgeRow({ recurType: "Weekly" }), true);
  assert.equal(hasBadgeRow({ recurType: "one-time" }), false);
  assert.equal(hasBadgeRow({ recurType: " One-Time " }), false);
  assert.equal(hasBadgeRow({ skillTags: ["Health"] }), true);
  assert.equal(hasBadgeRow({ skillTags: [] }), false);
  for (const flag of ["apple", "smartPrep", "delegationTask", "velin"] as const) assert.equal(hasBadgeRow({ [flag]: true }), true, flag);
  assert.equal(hasBadgeRow({ assignedTo: "Alex" }), false);
  assert.equal(hasBadgeRow({ assignedTo: "Daniela" }), true);
});

test("the expand arrow appears only when expanding shows something more", () => {
  assert.equal(canExpandTask({ description: "Long text", importance: "High" }, false), true);
  assert.equal(canExpandTask({ importance: "High" }, false), true, "desktop: the badge row is more");
  assert.equal(canExpandTask({ importance: "High" }, true), false, "phone: no description, nothing more to show");
  assert.equal(canExpandTask({ description: "Long text" }, true), true);
  assert.equal(canExpandTask({}, false), false);
});

test("the quest card starts collapsed, clamps the description, hides the badge row and has an accessible arrow", () => {
  const card = readFileSync(new URL("./task-card.tsx", import.meta.url), "utf8");
  assert.ok(card.includes("useState(false)") && card.includes("const [expanded, setExpanded]"), "collapsed by default");
  assert.ok(card.includes('!expanded && "line-clamp-2"'), "desktop shows two lines");
  assert.ok(card.includes('!expanded && "line-clamp-1"'), "phone shows one line");
  assert.ok(/\{expanded && \(\s*<div className="flex items-center flex-wrap gap-2" data-testid="quest-badges">/.test(card), "badge row only when expanded");
  assert.ok(card.includes("aria-expanded={expanded}"));
  assert.ok(card.includes('"Collapse quest" : "Expand quest"'));
  assert.ok(card.includes("e.stopPropagation(); setExpanded"), "the arrow does not select the card");
  assert.equal((card.match(/expandToggle\(/g) ?? []).length, 2, "one arrow, used by the phone and the desktop card");
});
