import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modal = readFileSync(new URL("./task-detail-modal.tsx", import.meta.url), "utf8");
const dueCard = modal.slice(modal.indexOf('data-testid="due-date-card"'), modal.indexOf("{/* Duration */}"));

test("Clear due date is always in the due date picker, for every quest type and even with no date set", () => {
  assert.ok(dueCard.includes('data-testid="clear-due-date"') && dueCard.includes("Clear due date"));
  const before = dueCard.slice(0, dueCard.indexOf('data-testid="clear-due-date"'));
  const lastTag = before.slice(before.lastIndexOf("{"));
  assert.ok(!/task\.dueDate\s*&&|questType\s*!==/.test(lastTag), "nothing wraps the button in a condition");
  assert.ok(dueCard.includes("disabled={!task.dueDate || updateDateMutation.isPending}"), "it greys out when there is nothing to clear");
});

test("clearing the due date of a deadline quest saves the new type in the same request, and says so", () => {
  assert.ok(dueCard.includes("questTypeAfterClearingDue(task)"));
  assert.ok(dueCard.includes("...(type ? { questType: type } : {})"));
  assert.ok(dueCard.includes("extra: Object.keys(extra).length ? extra : undefined"), "nothing extra is sent for other quests");
  assert.ok(modal.includes("JSON.stringify({ [field]: date ? date.toISOString() : null, ...extra })"));
  assert.ok(modal.includes("It was a Deadline quest, so it is now a General quest."));
});

test("clearing the date of a reminder on a date makes it an ongoing reminder in the same request, and says so", () => {
  assert.ok(dueCard.includes("reminderModeAfterClearingDue({ questType: displayedQuestType, reminderMode: displayedReminderMode })"));
  assert.ok(dueCard.includes("...(mode ? { reminderMode: mode } : {})"));
  assert.ok(modal.includes("It was a reminder on a date, so it is now an ongoing reminder."));
});
