import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feedbackLabel, feedbackPlaceholder, focusActionOptions } from "./feedback-actions";

const byAction = (inFocus: boolean | undefined) => Object.fromEntries(focusActionOptions(inFocus).map(o => [o.action, o]));

test("three choices, in order: move in, take off, keep", () => {
  assert.deepEqual(focusActionOptions(undefined).map(o => o.action), ["include", "exclude", "keep"]);
  assert.deepEqual(focusActionOptions(undefined).map(o => o.label), ["Move into Smart Focus", "Take off Smart Focus", "Keep it where it is"]);
});

test("a quest already in Smart Focus can be taken off or kept, not moved in", () => {
  const options = byAction(true);
  assert.equal(options.include.disabled, true);
  assert.equal(options.exclude.disabled, false);
  assert.equal(options.keep.disabled, false);
  assert.equal(options.keep.label, "Keep it in Smart Focus");
});

test("a quest outside Smart Focus can be moved in or kept out, not taken off", () => {
  const options = byAction(false);
  assert.equal(options.include.disabled, false);
  assert.equal(options.exclude.disabled, true);
  assert.equal(options.keep.label, "Keep it out of Smart Focus");
});

test("when placement is unknown every choice is available", () => {
  assert.ok(focusActionOptions(undefined).every(o => !o.disabled));
});

test("the explanation prompt follows the choice", () => {
  assert.match(feedbackPlaceholder("include", false), /belong in Smart Focus/);
  assert.match(feedbackPlaceholder("exclude", true), /come off Smart Focus/);
  assert.match(feedbackPlaceholder("keep", true), /right to include/);
  assert.match(feedbackPlaceholder("keep", false), /stays out/);
  assert.match(feedbackPlaceholder("keep", undefined), /right where it is/);
  assert.match(feedbackPlaceholder(null, undefined), /For example/);
  assert.equal(feedbackLabel(null), "Your preference");
  assert.equal(feedbackLabel("include"), "Why move it in");
});

test("the feedback dialog shows the choices under the explanation, highlights the selected one and has a Submit button", () => {
  const dialog = readFileSync(new URL("./feedback-dialog.tsx", import.meta.url), "utf8");
  assert.ok(dialog.indexOf("<Textarea") < dialog.indexOf('data-testid="focus-actions"'), "choices come right after the textarea");
  assert.ok(dialog.includes("aria-pressed={selected}"));
  assert.ok(dialog.includes("data-focus-action={option.action}"));
  assert.ok(dialog.includes("setAction(selected ? null : option.action)"), "clicking again unselects");
  assert.ok(dialog.includes('"Submit"'));
  assert.match(dialog, /feedback\.mutate\(\{ taskId, text: text\.trim\(\), \.\.\.\(action/);
});
