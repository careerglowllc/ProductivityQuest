import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canExpandTask, compactDueDate, descriptionMayBeClamped, hasBadgeRow, taskDescription } from "./task-card-expand";

const card = readFileSync(new URL("./task-card.tsx", import.meta.url), "utf8");
const desktop = card.slice(card.indexOf("Desktop: Full list view version"));

test("the description comes from description, then details, trimmed", () => {
  assert.equal(taskDescription({ description: "  Call the clinic  ", details: "ignored" }), "Call the clinic");
  assert.equal(taskDescription({ description: "", details: "From details" }), "From details");
  assert.equal(taskDescription({}), "");
  assert.equal(taskDescription({ description: "   " }), "");
});

test("the named badge row has content for skills, flags and other assignees only", () => {
  assert.equal(hasBadgeRow({}), false);
  assert.equal(hasBadgeRow({ skillTags: ["Health"] }), true);
  assert.equal(hasBadgeRow({ skillTags: [] }), false);
  for (const flag of ["apple", "smartPrep", "delegationTask", "velin"] as const) assert.equal(hasBadgeRow({ [flag]: true }), true, flag);
  assert.equal(hasBadgeRow({ assignedTo: "Alex" }), false);
  assert.equal(hasBadgeRow({ assignedTo: "Daniela" }), true);
});

test("a short description is never clamped, so it gets no arrow on its own", () => {
  assert.equal(descriptionMayBeClamped("Emailed them 9/29", false), false);
  assert.equal(descriptionMayBeClamped("x".repeat(130), false), false);
  assert.equal(descriptionMayBeClamped("x".repeat(131), false), true);
  assert.equal(descriptionMayBeClamped("short", true), false);
  assert.equal(descriptionMayBeClamped("x".repeat(49), true), true);
  assert.equal(descriptionMayBeClamped("two\nlines", true), true, "a phone keeps line breaks");
  assert.equal(descriptionMayBeClamped("two\nlines", false), false, "desktop flows them together");
});

test("the expand arrow appears only when expanding shows something more", () => {
  const long = "x".repeat(300);
  assert.equal(canExpandTask({ description: long }, false), true);
  assert.equal(canExpandTask({ description: long }, true), true);
  assert.equal(canExpandTask({ description: "Emailed them 9/29" }, false), false);
  assert.equal(canExpandTask({ description: "Emailed them 9/29", skillTags: ["Health"] }, false), true, "desktop: named badges are more");
  assert.equal(canExpandTask({ skillTags: ["Health"] }, true), false, "phone: skills already show as icons");
  assert.equal(canExpandTask({}, false), false);
});

test("due dates are short: no year this year, a year otherwise, read in UTC, and a clear fallback", () => {
  const now = new Date(2026, 9, 13);
  assert.equal(compactDueDate("2026-10-13T00:00:00.000Z", now), "Oct 13");
  assert.equal(compactDueDate("2027-01-05T00:00:00.000Z", now), "Jan 5, 2027");
  assert.equal(compactDueDate("2025-12-31T00:00:00.000Z", now), "Dec 31, 2025");
  assert.equal(compactDueDate(null, now), "No due date");
  assert.equal(compactDueDate("nonsense", now), "No due date");
});

test("the desktop card is two dense rows: title with its actions, then one line of details", () => {
  assert.ok(desktop.includes('<CardContent className="px-4 py-3">'), "tight padding");
  const row1 = desktop.indexOf("Row 1:"), row2 = desktop.indexOf("Row 2:");
  assert.ok(row1 > 0 && row2 > row1);
  const titleRow = desktop.slice(row1, row2);
  for (const part of ["{task.goldValue}", "View Full", "expandToggle(", "<TaskFocusMenu"]) assert.ok(titleRow.includes(part), `${part} sits on the title row`);
  const details = desktop.slice(row2, desktop.indexOf("{description && ("));
  for (const part of ["formatDuration(task.duration)", "compactDueDate(task.dueDate)", "upcomingStartLabel(task.startDate)", "task.importance", "task.recurType", "{focusReason}", "quest-tags-compact"]) {
    assert.ok(details.includes(part), `${part} is on the details line`);
  }
  assert.ok(!desktop.includes("flex flex-col items-end gap-2"), "no tall right-hand column");
});

test("collapsed, the description clamps to two lines and the skills and flags show as small icons; expanded they get names", () => {
  assert.ok(desktop.includes('!expanded && "line-clamp-2"'));
  assert.ok(desktop.includes("{!expanded && ("), "compact icons only while collapsed");
  assert.ok(/\{expanded && hasBadgeRow\(task\) && \(/.test(desktop), "named badges only when expanded");
});

test("the arrow is accessible, does not select the card, and the phone card clamps to one line", () => {
  assert.ok(card.includes("aria-expanded={expanded}"));
  assert.ok(card.includes('"Collapse quest" : "Expand quest"'));
  assert.ok(card.includes("e.stopPropagation(); setExpanded"));
  assert.ok(card.includes('!expanded && "line-clamp-1"'));
  assert.equal((card.match(/expandToggle\(/g) ?? []).length, 2, "one arrow, used by the phone and the desktop card");
});

test("importance shows as a colored dot, never a stray replacement character", () => {
  assert.ok(!card.includes("\uFFFD"));
  assert.ok(desktop.includes("getImportanceDotColor(task.importance)"));
});
