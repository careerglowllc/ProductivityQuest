import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feedbackLabel, feedbackPlaceholder, focusActionOptions } from "./feedback-actions";

const byAction = (inFocus: boolean | undefined) => Object.fromEntries(focusActionOptions(inFocus).map(o => [o.action, o]));

test("five choices, in order: move in, take off, rank higher, rank lower, keep", () => {
  assert.deepEqual(focusActionOptions(undefined).map(o => o.action), ["include", "exclude", "higher", "lower", "keep"]);
  assert.deepEqual(focusActionOptions(undefined).map(o => o.label), ["Move into Smart Focus", "Take off Smart Focus", "Rank higher", "Rank lower", "Keep it where it is"]);
});

test("a quest already in Smart Focus can be taken off, ranked or kept, not moved in", () => {
  const options = byAction(true);
  assert.equal(options.include.disabled, true);
  for (const action of ["exclude", "higher", "lower", "keep"]) assert.equal(options[action].disabled, false, action);
  assert.equal(options.keep.label, "Keep it in Smart Focus");
});

test("a quest outside Smart Focus can be moved in or kept out; ranking and taking off need it in the list", () => {
  const options = byAction(false);
  assert.equal(options.include.disabled, false);
  for (const action of ["exclude", "higher", "lower"]) assert.equal(options[action].disabled, true, action);
  assert.equal(options.higher.hint, "Only for quests in your Smart Focus list");
  assert.equal(options.keep.label, "Keep it out of Smart Focus");
});

test("when placement is unknown every choice is available", () => {
  assert.ok(focusActionOptions(undefined).every(o => !o.disabled));
});

test("the explanation prompt follows the choice", () => {
  assert.match(feedbackPlaceholder("include", false), /belong in Smart Focus/);
  assert.match(feedbackPlaceholder("exclude", true), /come off Smart Focus/);
  assert.match(feedbackPlaceholder("higher", true), /rank higher/);
  assert.match(feedbackPlaceholder("lower", true), /rank lower/);
  assert.equal(feedbackLabel("higher"), "Why rank it higher");
  assert.equal(feedbackLabel("lower"), "Why rank it lower");
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
