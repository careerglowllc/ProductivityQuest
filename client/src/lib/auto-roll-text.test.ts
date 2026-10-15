import test from "node:test";
import assert from "node:assert/strict";
import { autoRollText, autoRollToast } from "./auto-roll-text";

test("the setting explains what it does, in the account's timezone", () => {
  const text = autoRollText("America/Los_Angeles", false);
  assert.equal(text.title, "Move overdue quests to today");
  assert.match(text.description, /On a new day, quests whose due date has passed get today's date automatically, just after midnight, in your timezone \(America\/Los Angeles\)\./);
  assert.match(text.description, /Finished and deleted quests are never changed\./);
  assert.doesNotMatch(autoRollText(undefined, false).description, /timezone/, "no zone to name until the settings load");
});

test("the hint says whether it is on, and that turning it on starts with the next new day", () => {
  assert.match(autoRollText("UTC", false).hint, /^Off\./);
  const on = autoRollText("UTC", true).hint;
  assert.match(on, /^On\. It starts with the next new day/);
  assert.match(on, /Move Overdue to Today on the Quests page/);
});

test("the confirmation after switching matches the new state", () => {
  assert.equal(autoRollToast(true).title, "Overdue quests will move to today");
  assert.equal(autoRollToast(true).description, "Starting with the next new day.");
  assert.equal(autoRollToast(false).title, "Overdue quests will stay as they are");
});
