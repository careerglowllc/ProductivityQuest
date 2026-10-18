import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { activitiesCSV, foodCSV } from "./explore-csv";

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
const records = (text: string) => {
  const [header, ...rows] = parseCsv(text);
  return rows.map((cells) => Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""])));
};

const base = { id: "x", address: "", thoughts: "", tags: [] as string[], visitedAt: "", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z" };
const activity = (over: Record<string, unknown> = {}) => ({ ...base, name: "Urban Putt", city: "Berkeley, CA", overallRating: 4.4, stars: { fun: 4.6, atmosphere: 4.5, value: 3.8 }, ...over }) as Parameters<typeof activitiesCSV>[0][number];
const meal = (over: Record<string, unknown> = {}) => ({ ...base, name: "Oakhouse", city: "Auburn, CA", overallRating: 3.6, stars: { food: 4, ambience: 4, price: 2.8 }, ...over }) as Parameters<typeof foodCSV>[0][number];
const region = () => "Bay Area";

test("activities CSV: an empty log is just the header row, so the folder exists as a placeholder", () => {
  const rows = parseCsv(activitiesCSV([], region));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 3), ["Name", "City", "Region"]);
});

test("food CSV: an empty log is just the header row, so the folder exists as a placeholder", () => {
  const rows = parseCsv(foodCSV([], region));
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].slice(0, 3), ["Name", "City", "Region"]);
});

test("activities CSV: every field of an entry is exported", () => {
  const [row] = records(activitiesCSV([activity({
    address: "2526 Durant Ave", tags: ["Mini Golf", "Indoor"], thoughts: "Fun, quirky", visitedAt: "2026-09-01",
  })], region));
  assert.deepEqual(row, {
    Name: "Urban Putt", City: "Berkeley, CA", Region: "Bay Area", Address: "2526 Durant Ave", "Overall Rating": "4.4",
    Fun: "4.6", Atmosphere: "4.5", Value: "3.8", Tags: "Mini Golf; Indoor", Thoughts: "Fun, quirky", "Visited At": "2026-09-01",
    "Created At": "2026-10-01T00:00:00.000Z", "Updated At": "2026-10-02T00:00:00.000Z",
  });
});

test("food CSV: every field of an entry is exported", () => {
  const [row] = records(foodCSV([meal({ address: "130 Maple St", tags: ["Steakhouse", "Dinner"], thoughts: "Fancy, pricey" })], () => "Central Valley"));
  assert.deepEqual(row, {
    Name: "Oakhouse", City: "Auburn, CA", Region: "Central Valley", Address: "130 Maple St", "Overall Rating": "3.6",
    Food: "4", Ambience: "4", Price: "2.8", Tags: "Steakhouse; Dinner", Thoughts: "Fancy, pricey", "Visited At": "",
    "Created At": "2026-10-01T00:00:00.000Z", "Updated At": "2026-10-02T00:00:00.000Z",
  });
});

test("explore CSVs: entries come out grouped by city then name, and the input list is untouched", () => {
  const input = [meal({ name: "B", city: "Rocklin, CA" }), meal({ name: "Z", city: "Auburn, CA" }), meal({ name: "A", city: "Auburn, CA" })];
  const order = records(foodCSV(input, region)).map((r) => `${r.City}/${r.Name}`);
  assert.deepEqual(order, ["Auburn, CA/A", "Auburn, CA/Z", "Rocklin, CA/B"]);
  assert.deepEqual(input.map((e) => e.name), ["B", "Z", "A"]);
});

test("explore CSVs: commas, quotes and line breaks in notes don't break the row", () => {
  const csv = foodCSV([meal({ thoughts: 'Said "wow", twice\nsecond line' })], region);
  const rows = parseCsv(csv);
  assert.equal(rows[1].length, rows[0].length);
  assert.equal(records(csv)[0].Thoughts, 'Said "wow", twice\nsecond line');
});

// Guards the Settings "Export All" zip against Explore gaining a category that nobody wired up.
test("Export All covers every Explore category", () => {
  const explore = readFileSync(new URL("../pages/explore.tsx", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../pages/settings.tsx", import.meta.url), "utf8");
  const builderFor: Record<string, string> = {
    countries: "buildCountriesVisitedCSVExport",
    states: "buildStatesVisitedCSVExport",
    activities: "buildActivitiesCSVExport",
    food: "buildFoodCSVExport",
  };
  const keys = [...explore.matchAll(/^\s+key: "([a-z-]+)",$/gm)].map((m) => m[1]);
  assert.deepEqual([...keys].sort(), Object.keys(builderFor).sort(), "Explore has a category this test (and Export All) doesn't know about");
  const zipSection = settings.slice(settings.indexOf("Promise.allSettled(["));
  for (const key of keys) {
    assert.ok(new RegExp(`${builderFor[key]}\\(\\)`).test(zipSection), `Export All is missing the ${key} export`);
  }
});

// Austin is a region on both pages; the seeded entry's overall rating is computed by hand, so it must match the stars.
test("Austin region exists on Food and Activities, and Stiles Switch BBQ is seeded with a matching rating", () => {
  for (const file of ["food-in-cities.tsx", "activities-in-cities.tsx"]) {
    const source = readFileSync(new URL(`../pages/${file}`, import.meta.url), "utf8");
    assert.match(source, /id: "austin",\s+label: "Austin, TX"/, `${file}: Austin region`);
    assert.match(source, /citiesMatch: \[[^\]]*"austin"[^\]]*\]/, `${file}: Austin cities match`);
    assert.match(source, /"austin":\s+"M /, `${file}: Austin map shapes`);
  }
  const food = readFileSync(new URL("../pages/food-in-cities.tsx", import.meta.url), "utf8");
  const start = food.indexOf('id: "food-stiles-switch-bbq-austin"');
  assert.notEqual(start, -1, "Stiles Switch BBQ is seeded");
  const block = food.slice(start, food.indexOf("\n  },", start));
  assert.match(block, /address: "6610 N Lamar Blvd, Austin, TX 78752"/);
  assert.match(block, /tags: \[[^\]]*"BBQ"/);
  const stars = block.match(/stars: \{ food: ([\d.]+), ambience: ([\d.]+), price: ([\d.]+) \}/);
  assert.ok(stars, "stars are set");
  const [f, a, p] = stars.slice(1).map(Number);
  assert.deepEqual([f, a, p], [4, 4, 3.6]);
  assert.equal(Number(block.match(/overallRating: ([\d.]+)/)?.[1]), Math.round(((f + a + p) / 3) * 10) / 10);
  assert.ok(Number(food.match(/food-cities-seed-v(\d+)/)?.[1]) >= 20, "seed version bumped so existing browsers pick up the entry");
});

test("Houndstooth Coffee is one Austin entry with a matching rating and a bumped seed version", () => {
  const food = readFileSync(new URL("../pages/food-in-cities.tsx", import.meta.url), "utf8");
  const start = food.indexOf('id: "food-houndstooth-coffee-austin"');
  assert.notEqual(start, -1, "Houndstooth Coffee is seeded");
  const block = food.slice(start, food.indexOf("\n  },", start));
  assert.match(block, /city: "Austin, TX"/);
  const stars = block.match(/stars: \{ food: ([\d.]+), ambience: ([\d.]+), price: ([\d.]+) \}/);
  assert.ok(stars, "stars are set");
  const [f, a, p] = stars.slice(1).map(Number);
  assert.deepEqual([f, a, p], [3.3, 3.5, 2.5]);
  assert.equal(Number(block.match(/overallRating: ([\d.]+)/)?.[1]), Math.round(((f + a + p) / 3) * 10) / 10);
  assert.equal(food.match(/name: "Houndstooth Coffee"/g)?.length, 1, "one entry for all locations");
  assert.ok(Number(food.match(/food-cities-seed-v(\d+)/)?.[1]) >= 21, "seed version bumped");
});

test("Tacodeli is one Austin entry with a matching rating and a bumped seed version", () => {
  const food = readFileSync(new URL("../pages/food-in-cities.tsx", import.meta.url), "utf8");
  const start = food.indexOf('id: "food-tacodeli-austin"');
  assert.notEqual(start, -1, "Tacodeli is seeded");
  const block = food.slice(start, food.indexOf("\n  },", start));
  assert.match(block, /city: "Austin, TX"/);
  assert.match(block, /tags: \[[^\]]*"Tacos"/);
  const stars = block.match(/stars: \{ food: ([\d.]+), ambience: ([\d.]+), price: ([\d.]+) \}/);
  assert.ok(stars, "stars are set");
  const [f, a, p] = stars.slice(1).map(Number);
  assert.deepEqual([f, a, p], [3.4, 2, 2.7]);
  assert.equal(Number(block.match(/overallRating: ([\d.]+)/)?.[1]), Math.round(((f + a + p) / 3) * 10) / 10);
  assert.equal(food.match(/name: "Tacodeli"/g)?.length, 1, "one entry for all locations");
  assert.ok(Number(food.match(/food-cities-seed-v(\d+)/)?.[1]) >= 22, "seed version bumped");
});
