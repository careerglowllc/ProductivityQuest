import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_QUEST_TYPE, QUEST_TYPES, compareByDueDateThenImportance, QUEST_TYPE_LABELS, isQuestType, parseQuestType, questTypeLabel } from "./quest-type";

test("quest types: exactly reminder, deadline and general, each with a label", () => {
  assert.deepEqual([...QUEST_TYPES], ["reminder", "deadline", "general"]);
  assert.deepEqual(QUEST_TYPE_LABELS, { reminder: "Reminder", deadline: "Deadline", general: "General to-do" });
  assert.equal(DEFAULT_QUEST_TYPE, "general");
});

test("isQuestType accepts only the three stored values", () => {
  for (const type of QUEST_TYPES) assert.equal(isQuestType(type), true);
  for (const bad of ["Reminder", "urgent", "", null, undefined, 3, {}]) assert.equal(isQuestType(bad), false);
});

test("questTypeLabel gives the display label and defaults for missing or unknown values", () => {
  assert.equal(questTypeLabel("reminder"), "Reminder");
  assert.equal(questTypeLabel("deadline"), "Deadline");
  assert.equal(questTypeLabel("general"), "General to-do");
  for (const missing of [null, undefined, "", "bogus"]) assert.equal(questTypeLabel(missing), "General to-do");
});

test("parseQuestType reads stored values, CSV labels, case and surrounding whitespace", () => {
  assert.equal(parseQuestType("reminder"), "reminder");
  assert.equal(parseQuestType("Deadline"), "deadline");
  assert.equal(parseQuestType("  DEADLINE  "), "deadline");
  assert.equal(parseQuestType("General to-do"), "general");
  assert.equal(parseQuestType("general TO-DO"), "general");
});

test("parseQuestType falls back to general instead of failing on blank or unknown input", () => {
  for (const bad of ["", "   ", "someday", "to-do", null, undefined]) assert.equal(parseQuestType(bad), "general");
});

test("every label round-trips through parseQuestType", () => {
  for (const type of QUEST_TYPES) assert.equal(parseQuestType(QUEST_TYPE_LABELS[type]), type);
});

test("compareByDueDateThenImportance: due date first, then importance, undated last", () => {
  const quests = [
    { id: "undated-high", dueDate: null, importance: "High" },
    { id: "later-pareto", dueDate: "2026-10-20T00:00:00.000Z", importance: "Pareto" },
    { id: "soon-low", dueDate: "2026-10-10T00:00:00.000Z", importance: "Low" },
    { id: "soon-high", dueDate: "2026-10-10T00:00:00.000Z", importance: "High" },
    { id: "soon-unranked", dueDate: "2026-10-10T00:00:00.000Z", importance: null },
    { id: "undated-low", dueDate: null, importance: "Low" },
  ];
  const order = [...quests].sort(compareByDueDateThenImportance).map((q) => q.id);
  assert.deepEqual(order, ["soon-high", "soon-low", "soon-unranked", "later-pareto", "undated-high", "undated-low"]);
});
