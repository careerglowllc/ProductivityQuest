import assert from "node:assert/strict";
import { test } from "node:test";
import type { Task } from "../shared/schema";
import { insertTaskSchema } from "../shared/schema";
import { QUEST_TYPES } from "../shared/quest-type";
import { TASK_CSV_HEADERS, buildTasksCsv, escapeCsvField, isCompletedCsvRow, parseTaskCsvRow } from "./tasks-csv";

// Splits CSV text into rows of fields, honouring quoted commas, doubled quotes and newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  row.push(field); rows.push(row);
  return rows;
}
const asRecords = (text: string) => {
  const [header, ...rows] = parseCsv(text);
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
};

const task = (overrides: Partial<Task>): Task => ({
  id: 1, userId: "u1", title: "Sample", description: "", details: null, duration: 30, goldValue: 45,
  importance: "Medium", kanbanStage: "To Do", recurType: "one-time", campaign: "unassigned", businessWorkFilter: "General",
  questType: "general", startDate: null, dueDate: null, completed: false, completedAt: null, createdAt: new Date("2026-10-01T00:00:00Z"),
  skillTags: [], apple: false, smartPrep: false, delegationTask: false, velin: false, assignedTo: "Alex",
  ...overrides,
} as Task);

test("CSV export: has a Quest Type column placed after Business/Work Filter", () => {
  const header = parseCsv(buildTasksCsv([]))[0];
  assert.deepEqual(header, [...TASK_CSV_HEADERS]);
  assert.equal(header.indexOf("Quest Type"), header.indexOf("Business/Work Filter") + 1);
  assert.equal(header.filter((name) => name === "Quest Type").length, 1);
});

test("CSV export: writes the readable label for each of the three quest types", () => {
  const csv = buildTasksCsv([
    task({ id: 1, title: "A", questType: "reminder" }),
    task({ id: 2, title: "B", questType: "deadline" }),
    task({ id: 3, title: "C", questType: "general" }),
  ]);
  assert.deepEqual(asRecords(csv).map((r) => r["Quest Type"]), ["Reminder", "Deadline", "General to-do"]);
});

test("CSV export: a quest with no stored type is exported as the default, not blank", () => {
  const csv = buildTasksCsv([task({ id: 9, questType: undefined as never }), task({ id: 10, questType: null as never })]);
  assert.deepEqual(asRecords(csv).map((r) => r["Quest Type"]), ["General to-do", "General to-do"]);
});

test("CSV export: every row has the same number of cells as the header, even with commas, quotes and newlines", () => {
  const csv = buildTasksCsv([task({ title: 'Buy milk, eggs', description: 'say "hi"\nsecond line', questType: "reminder" })]);
  const rows = parseCsv(csv);
  assert.equal(rows[1].length, rows[0].length);
  const [record] = asRecords(csv);
  assert.equal(record["Title"], "Buy milk, eggs");
  assert.equal(record["Description"], 'say "hi"\nsecond line');
  assert.equal(record["Quest Type"], "Reminder");
});

test("escapeCsvField quotes only when needed", () => {
  assert.equal(escapeCsvField("plain"), "plain");
  assert.equal(escapeCsvField("a,b"), '"a,b"');
  assert.equal(escapeCsvField('say "x"'), '"say ""x"""');
  assert.equal(escapeCsvField(null), "");
});

test("CSV import: reads Quest Type from labels or values and falls back to general", () => {
  // A due date is included because a Deadline can't exist without one.
  const read = (value: string | undefined) => parseTaskCsvRow({ Title: "T", "Due Date": "2026-11-01T00:00:00.000Z", ...(value === undefined ? {} : { "Quest Type": value }) }).questType;
  assert.equal(read("Reminder"), "reminder");
  assert.equal(read("deadline"), "deadline");
  assert.equal(read("General to-do"), "general");
  assert.equal(read(""), "general");
  assert.equal(read("nonsense"), "general");
  assert.equal(read(undefined), "general", "a CSV exported before the column existed still imports");
});

test("CSV round trip: export then import keeps every quest's type", () => {
  // A deadline always has a due date, so the round trip uses one.
  const original = QUEST_TYPES.map((questType, i) => task({ id: i + 1, title: `Quest ${questType}`, questType, dueDate: new Date("2026-11-01T00:00:00Z") }));
  const imported = asRecords(buildTasksCsv(original)).map(parseTaskCsvRow);
  assert.deepEqual(imported.map((t) => t.questType), ["reminder", "deadline", "general"]);
  assert.deepEqual(imported.map((t) => t.title), original.map((t) => t.title));
});

test("create schema: accepts each quest type, allows omitting it (database default), rejects anything else", () => {
  const base = { userId: "u1", title: "New quest", duration: 30, goldValue: 45 };
  for (const questType of QUEST_TYPES) assert.equal(insertTaskSchema.parse({ ...base, questType }).questType, questType);
  assert.equal(insertTaskSchema.parse(base).questType, undefined);
  for (const bad of ["urgent", "Reminder", "", null, 7]) {
    assert.equal(insertTaskSchema.safeParse({ ...base, questType: bad }).success, false, `should reject ${JSON.stringify(bad)}`);
  }
});

test("update schema: a partial update can set the quest type but cannot set an invalid one", () => {
  const update = insertTaskSchema.partial();
  assert.equal(update.parse({ questType: "deadline" }).questType, "deadline");
  assert.deepEqual(update.parse({ title: "Renamed" }), { title: "Renamed" });
  assert.equal(update.safeParse({ questType: "soon" }).success, false);
});

test("CSV export: Start Date sits right before Due Date and is blank when a quest has none", () => {
  const header = parseCsv(buildTasksCsv([]))[0];
  assert.equal(header.indexOf("Start Date"), header.indexOf("Due Date") - 1);
  const [withStart, without] = asRecords(buildTasksCsv([
    task({ id: 1, startDate: new Date("2026-10-15T00:00:00Z"), dueDate: new Date("2026-10-20T00:00:00Z") }),
    task({ id: 2 }),
  ]));
  assert.equal(withStart["Start Date"], "2026-10-15T00:00:00.000Z");
  assert.equal(without["Start Date"], "");
});

test("CSV import: reads Start Date, and a CSV exported before the column existed still imports", () => {
  assert.equal(parseTaskCsvRow({ Title: "T", "Start Date": "2026-10-15T00:00:00.000Z" }).startDate?.toISOString(), "2026-10-15T00:00:00.000Z");
  assert.equal(parseTaskCsvRow({ Title: "T" }).startDate, null);
  assert.equal(parseTaskCsvRow({ Title: "T", "Start Date": "not a date" }).startDate, null, "junk is ignored instead of failing the import");
});

test("CSV import: a start date after the due date is dropped; the same day is kept", () => {
  const read = (start: string, due: string) => parseTaskCsvRow({ Title: "T", "Start Date": start, "Due Date": due }).startDate;
  assert.equal(read("2026-10-25T00:00:00.000Z", "2026-10-20T00:00:00.000Z"), null);
  assert.ok(read("2026-10-20T07:00:00.000Z", "2026-10-20T00:00:00.000Z"));
});

test("CSV import: a Deadline with no due date can't be saved, so it imports as a general to-do", () => {
  const read = (row: Record<string, string>) => parseTaskCsvRow({ Title: "T", ...row }).questType;
  assert.equal(read({ "Quest Type": "Deadline" }), "general");
  assert.equal(read({ "Quest Type": "Deadline", "Due Date": "2026-10-20T00:00:00.000Z" }), "deadline");
  assert.equal(read({ "Quest Type": "Reminder" }), "reminder", "reminders don't need a due date");
});

test("CSV round trip: start and due dates survive export then import", () => {
  const [imported] = asRecords(buildTasksCsv([
    task({ questType: "deadline", startDate: new Date("2026-10-15T00:00:00Z"), dueDate: new Date("2026-10-20T00:00:00Z") }),
  ])).map(parseTaskCsvRow);
  assert.equal(imported.startDate?.toISOString(), "2026-10-15T00:00:00.000Z");
  assert.equal(imported.dueDate?.toISOString(), "2026-10-20T00:00:00.000Z");
});

test("CSV export: completed quests are included and marked, so Export All isn't missing history", () => {
  const csv = buildTasksCsv([
    task({ id: 1, title: "Open quest" }),
    task({ id: 2, title: "Finished quest", completed: true, completedAt: new Date("2026-10-05T12:00:00Z") }),
  ]);
  const records = asRecords(csv);
  assert.deepEqual(records.map((r) => r["Title"]), ["Open quest", "Finished quest"]);
  assert.deepEqual(records.map((r) => r["Completed"]), ["No", "Yes"]);
  assert.equal(records[1]["Completed At"], "2026-10-05T12:00:00.000Z");
});

test("CSV import: completed rows from a full export are recognised so they aren't revived as open quests", () => {
  const [open, done] = asRecords(buildTasksCsv([task({ title: "Open" }), task({ title: "Done", completed: true })]));
  assert.equal(isCompletedCsvRow(open), false);
  assert.equal(isCompletedCsvRow(done), true);
  assert.equal(isCompletedCsvRow({ Title: "Old export, no Completed column" }), false);
});

test("create and update schemas: startDate accepts a date or null and rejects anything else", () => {
  const base = { userId: "u1", title: "New quest", duration: 30, goldValue: 45 };
  assert.ok(insertTaskSchema.parse({ ...base, startDate: new Date("2026-10-15T00:00:00Z") }).startDate instanceof Date);
  assert.equal(insertTaskSchema.parse({ ...base, startDate: null }).startDate, null);
  assert.equal(insertTaskSchema.parse(base).startDate, undefined, "omitting it leaves the database default (no start date)");
  assert.equal(insertTaskSchema.safeParse({ ...base, startDate: "soon" }).success, false);
  assert.equal(insertTaskSchema.partial().parse({ startDate: null }).startDate, null);
});
