import test from "node:test";
import assert from "node:assert/strict";
import { buildAccomplishmentsCSVExport } from "./accomplishments";

const csv = () => buildAccomplishmentsCSVExport().content;

test("the 2026 repair-and-rent real estate cycle is in the accomplishments export", () => {
  const row = csv().split("\n").find(line => line.includes("Full Real Estate Cycle"));
  assert.ok(row, "entry is present");
  assert.ok(row.startsWith('"2026"'));
  assert.ok(row.includes('"financial"'));
  assert.ok(row.includes("general contractor"));
  assert.ok(row.includes("fully rented"));
});

test("the export keeps its header and one row per accomplishment", () => {
  const lines = csv().split("\n");
  assert.ok(lines[0].startsWith('"Year","Year End","Title"'));
  assert.ok(lines.length > 50);
});

test("the 2026 health fix entry notes it was around December 2026", () => {
  const row = csv().split("\n").find(line => line.includes("Solved ED"));
  assert.ok(row, "entry is present");
  assert.ok(row.includes("(Around December 2026.)"));
});
