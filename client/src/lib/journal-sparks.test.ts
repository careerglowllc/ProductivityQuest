import test from "node:test";
import assert from "node:assert/strict";
import { buildSparks, buildSparksCSVExport, countSparks, filterSparks, loadExcitements, loadGlewExciteds, loadThoughts, EXCITEMENT_KEY, GLEW_KEY, THOUGHTS_KEY } from "./journal-sparks";

const storage = (data: Record<string, unknown>) => ({ getItem: (key: string) => (key in data ? (typeof data[key] === "string" ? (data[key] as string) : JSON.stringify(data[key])) : null) });

const excitements = [
  { id: "e1", text: "Austin is going to be great", createdAt: "2026-09-09T12:00:00.000Z", emoji: "🌟" },
  { id: "e2", text: "29 will be the best year", createdAt: "2026-10-13T12:00:00.000Z" },
];
const thoughts = [{ id: "t1", title: "I figure things out", description: "Evidence: the house", createdAt: "2026-09-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" }];
const glewDays = [
  { date: "2026-10-12", gratitudes: ["x"], wins: [], exciteds: [{ text: "Moving day" }, "Old string line", { text: "   " }], sadnesses: [], updatedAt: "" },
  { date: "2026-10-05", gratitudes: [], wins: [], exciteds: [], sadnesses: [], updatedAt: "" },
];
const all = storage({ [EXCITEMENT_KEY]: excitements, [THOUGHTS_KEY]: thoughts, [GLEW_KEY]: glewDays });
const sparks = () => buildSparks({ excitements: loadExcitements(all), thoughts: loadThoughts(all), glew: loadGlewExciteds(all) });

test("existing excitement entries and empowering thoughts both appear", () => {
  const kinds = sparks().map(s => `${s.kind}:${s.id}`);
  assert.ok(kinds.includes("excitement:e1") && kinds.includes("excitement:e2"));
  assert.ok(kinds.includes("thought:t1"));
});

test("Daily GLEW exciteds appear automatically, old string lines included, blanks and other categories left out", () => {
  const glew = sparks().filter(s => s.kind === "glew");
  assert.deepEqual(glew.map(s => s.text), ["Moving day", "Old string line"]);
  assert.ok(glew.every(s => s.glewDate === "2026-10-12"));
  assert.ok(!sparks().some(s => s.text === "x"), "gratitudes are not pulled in");
});

test("newest first across all three sources", () => {
  assert.deepEqual(sparks().map(s => s.key), ["excitement:e2", "glew:2026-10-12:0", "glew:2026-10-12:1", "thought:t1", "excitement:e1"]);
});

test("the filters show one kind, and search covers titles and text", () => {
  assert.deepEqual(filterSparks(sparks(), "thought", "").map(s => s.id), ["t1"]);
  assert.equal(filterSparks(sparks(), "glew", "").length, 2);
  assert.deepEqual(filterSparks(sparks(), "all", "FIGURE").map(s => s.id), ["t1"]);
  assert.deepEqual(filterSparks(sparks(), "all", "evidence").map(s => s.id), ["t1"]);
  assert.deepEqual(filterSparks(sparks(), "excitement", "moving").map(s => s.id), []);
  assert.deepEqual(countSparks(sparks()), { all: 5, excitement: 2, thought: 1, glew: 2 });
});

test("missing, broken or non-list storage gives an empty collection instead of an error", () => {
  for (const bad of [storage({}), storage({ [EXCITEMENT_KEY]: "not json", [THOUGHTS_KEY]: "{}", [GLEW_KEY]: "null" }), null]) {
    assert.deepEqual([loadExcitements(bad), loadThoughts(bad), loadGlewExciteds(bad)], [[], [], []]);
  }
  assert.deepEqual(loadGlewExciteds(storage({ [GLEW_KEY]: [{ exciteds: ["no date"] }, { date: "2026-10-01" }] })), []);
});

test("the Sparks export names the source of every row", () => {
  const csv = buildSparksCSVExport(sparks()).content.split("\n");
  assert.ok(csv[0].includes("Type") && csv[0].includes("Title"));
  assert.equal(csv.length, 6);
  assert.ok(csv.some(line => line.includes("From Daily GLEW") && line.includes("Moving day")));
  assert.ok(csv.some(line => line.includes("Empowering thought") && line.includes("I figure things out")));
});
