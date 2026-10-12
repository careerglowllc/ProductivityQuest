import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { QUEST_TYPES, QUEST_TYPE_LABELS } from "./quest-type";
import { COMING_UP_DAYS, SMART_FOCUS_CAP, THIS_WEEK_DAYS, URGENT_WINDOW_DAYS } from "./quest-schedule";

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const readme = read("QUEST_SYSTEM_README.md");
const cases = read("QUEST_SYSTEM_TEST_CASES.md");

test("quest docs: every quest type and label from the code is described", () => {
  for (const type of QUEST_TYPES) {
    assert.ok(readme.includes(`\`${type}\``), `README mentions the stored value ${type}`);
    assert.ok(readme.includes(`**${QUEST_TYPE_LABELS[type]}**`), `README describes ${QUEST_TYPE_LABELS[type]}`);
  }
});

test("quest docs: the tuning table matches the constants in the code", () => {
  const constants = { SMART_FOCUS_CAP, COMING_UP_DAYS, URGENT_WINDOW_DAYS, THIS_WEEK_DAYS };
  for (const [name, value] of Object.entries(constants)) {
    assert.match(readme, new RegExp(`\`${name}\` \\| ${value} \\|`), `${name} should be documented as ${value}`);
  }
});

test("quest docs: the prose states the same cap and window as the code", () => {
  assert.ok(readme.includes(`capped at **${SMART_FOCUS_CAP}**`), "Smart Focus cap in the intro");
  assert.ok(readme.includes(`At most **${SMART_FOCUS_CAP}** quests`), "Smart Focus cap in the cap section");
  assert.ok(readme.includes(`next **${COMING_UP_DAYS} days**`), "coming-up window");
});

test("quest docs: the README explains smart focus, reminders, deadlines and start dates", () => {
  for (const heading of ["## 1. The three quest types", "## 2. Due date vs start date", "## 3. Smart Focus", "## 4. Reminders strip", "## 6. Recurring quests", "## 7. CSV import and export"]) {
    assert.ok(readme.includes(heading), `missing section: ${heading}`);
  }
});

test("quest test cases: ids are unique and run in order from TC-QS-001", () => {
  const ids = [...cases.matchAll(/^### (TC-QS-\d{3}):/gm)].map((m) => m[1]);
  assert.ok(ids.length > 0);
  assert.deepEqual(ids, ids.map((_, i) => `TC-QS-${String(i + 1).padStart(3, "0")}`));
});

test("quest test cases: the stated total and the per-section counts add up to the real number of cases", () => {
  const actual = [...cases.matchAll(/^### TC-QS-\d{3}:/gm)].length;
  const stated = Number(cases.match(/\*\*Total Test Cases:\*\* (\d+)/)?.[1]);
  assert.equal(stated, actual, "update the Total Test Cases line");
  const tocCounts = [...cases.matchAll(/^\d+\. \[[^\]]+\(\d+\)\]/gm)].map((m) => Number(m[0].match(/\((\d+)\)\]/)![1]));
  assert.equal(tocCounts.reduce((a, b) => a + b, 0), actual, "table of contents counts should add up");
});

test("quest docs: every test file they list exists", () => {
  const files = new Set([...(readme + cases).matchAll(/`((?:shared|server|client)\/[\w./-]+\.test\.tsx?)`/g)].map((m) => m[1]));
  assert.ok(files.size >= 5);
  for (const file of files) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} is referenced but missing`);
});

test("quest docs: the main README points at both quest system docs", () => {
  const main = read("README.md");
  assert.ok(main.includes("QUEST_SYSTEM_README.md"));
  assert.ok(main.includes("QUEST_SYSTEM_TEST_CASES.md"));
});
