import assert from "node:assert/strict";
import { test } from "node:test";
import type { Task } from "../shared/schema";
import { insertTaskSchema } from "../shared/schema";
import { QUEST_TYPES } from "../shared/quest-type";
import { TASK_CSV_HEADERS, buildTasksCsv, escapeCsvField, parseTaskCsvRow } from "./tasks-csv";

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
  questType: "general", dueDate: null, completed: false, completedAt: null, createdAt: new Date("2026-10-01T00:00:00Z"),
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
  const read = (value: string | undefined) => parseTaskCsvRow({ Title: "T", ...(value === undefined ? {} : { "Quest Type": value }) }).questType;
  assert.equal(read("Reminder"), "reminder");
  assert.equal(read("deadline"), "deadline");
  assert.equal(read("General to-do"), "general");
  assert.equal(read(""), "general");
  assert.equal(read("nonsense"), "general");
  assert.equal(read(undefined), "general", "a CSV exported before the column existed still imports");
});

test("CSV round trip: export then import keeps every quest's type", () => {
  const original = QUEST_TYPES.map((questType, i) => task({ id: i + 1, title: `Quest ${questType}`, questType }));
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
