import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { visibleFocusReason } from "./focus-reason";

test("the Protected note is not shown, in either form", () => {
  assert.equal(visibleFocusReason("Protected: overdue or due today."), "");
  assert.equal(visibleFocusReason("Protected: starts today."), "");
});

test("anything after the Protected note still shows", () => {
  assert.equal(visibleFocusReason("Protected: overdue or due today. Apple work counts for more on weekdays."), "Apple work counts for more on weekdays.");
  assert.equal(visibleFocusReason("Protected: starts today. You asked for this to rank higher. Apple work counts for less on weekends."), "You asked for this to rank higher. Apple work counts for less on weekends.");
});

test("other reasons are left alone, and missing ones are empty", () => {
  for (const reason of ["High-priority work ready to start.", "You moved this into Smart Focus.", "Added because your list has room: the next most important quest.", "Not a Protected: note, just mentions it"]) {
    assert.equal(visibleFocusReason(reason), reason);
  }
  assert.equal(visibleFocusReason(undefined), "");
  assert.equal(visibleFocusReason(null), "");
  assert.equal(visibleFocusReason(""), "");
});

test("both places that show a reason go through the filter", () => {
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  assert.ok(read("pages/home.tsx").includes("visibleFocusReason(focusRanking.data?.reasons[String(task.id)])"));
  assert.ok(read("pages/dashboard.tsx").includes("visibleFocusReason(topFocus.reasons[task.id])"));
});
