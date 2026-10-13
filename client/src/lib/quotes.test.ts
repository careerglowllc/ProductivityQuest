import test from "node:test";
import assert from "node:assert/strict";
import { NO_REPEAT_DAYS, QUOTES_KEY, QUOTE_HISTORY_KEY, SEED_QUOTES, buildQuotesCSVExport, dayRandom, loadQuoteHistory, loadQuotes, localDay, pickQuoteOfTheDay, shiftDay, type Quote, type QuoteHistory } from "./quotes";

const memory = (data: Record<string, string>) => ({ getItem: (key: string) => data[key] ?? null });
const make = (count: number): Quote[] => Array.from({ length: count }, (_, i) => ({ id: `q${i}`, text: `Quote ${i}`, author: "A", createdAt: "" }));

// Plays out consecutive days the way the dashboard does: pick, remember, move on.
function simulate(quotes: Quote[], start: string, days: number) {
  let history: QuoteHistory = {};
  const shown: string[] = [];
  for (let i = 0; i < days; i++) {
    const result = pickQuoteOfTheDay(quotes, shiftDay(start, i), history);
    history = result.history;
    shown.push(result.quote!.id);
  }
  return shown;
}

test("the starter list holds ten Stoic quotes from several philosophers, each with an author and source", () => {
  assert.equal(SEED_QUOTES.length, 10);
  assert.deepEqual(Array.from(new Set(SEED_QUOTES.map((q) => q.author))).sort(), ["Epictetus", "Marcus Aurelius", "Musonius Rufus", "Seneca"]);
  for (const q of SEED_QUOTES) assert.ok(q.text.length > 20 && q.author && q.source && q.id.startsWith("seed-stoic-"));
  assert.equal(new Set(SEED_QUOTES.map((q) => q.id)).size, 10);
});

test("the starter quotes show until the list is saved once; an emptied list stays empty", () => {
  assert.equal(loadQuotes(memory({})), SEED_QUOTES);
  assert.equal(loadQuotes(null), SEED_QUOTES);
  assert.deepEqual(loadQuotes(memory({ [QUOTES_KEY]: "[]" })), []);
  assert.equal(loadQuotes(memory({ [QUOTES_KEY]: "not json" })), SEED_QUOTES);
  const saved = [{ id: "x", text: "Mine", author: "Me", createdAt: "" }, { id: "y", text: "  ", author: "Blank", createdAt: "" }, { nope: true }];
  assert.deepEqual(loadQuotes(memory({ [QUOTES_KEY]: JSON.stringify(saved) })).map((q) => q.id), ["x"]);
});

test("a quote is picked every day and the same day always gives the same quote", () => {
  const first = pickQuoteOfTheDay(SEED_QUOTES, "2026-10-13", {});
  assert.ok(first.quote);
  assert.deepEqual(pickQuoteOfTheDay(SEED_QUOTES, "2026-10-13", {}).quote, first.quote);
  assert.deepEqual(pickQuoteOfTheDay(SEED_QUOTES, "2026-10-13", first.history), { quote: first.quote, history: first.history });
  assert.equal(first.history["2026-10-13"], first.quote!.id);
});

test("no quote repeats within 7 days, over a long run with ten quotes", () => {
  const shown = simulate(SEED_QUOTES, "2026-01-01", 200);
  for (let i = 0; i < shown.length; i++) {
    for (let j = Math.max(0, i - NO_REPEAT_DAYS); j < i; j++) assert.notEqual(shown[i], shown[j], `day ${i} repeats day ${j}`);
  }
});

test("the picks are random, not a fixed rotation, and use the whole list", () => {
  const shown = simulate(SEED_QUOTES, "2026-01-01", 120);
  assert.equal(new Set(shown).size, 10);
  const order = (run: string[]) => run.slice(0, 10).join();
  assert.notEqual(order(shown), order(simulate(SEED_QUOTES, "2026-06-01", 120)));
  assert.notEqual(shown.slice(0, 10).join(), shown.slice(10, 20).join());
});

test("with 7 or fewer quotes it still never shows the same quote two days running", () => {
  for (const count of [1, 2, 3, 5, 7, 8]) {
    const shown = simulate(make(count), "2026-03-01", 60);
    assert.equal(shown.length, 60);
    if (count > 1) for (let i = 1; i < shown.length; i++) assert.notEqual(shown[i], shown[i - 1], `${count} quotes, day ${i}`);
  }
});

test("an empty list shows nothing, and a deleted quote is replaced the same day", () => {
  assert.deepEqual(pickQuoteOfTheDay([], "2026-10-13", {}), { quote: null, history: {} });
  const quotes = make(5);
  const first = pickQuoteOfTheDay(quotes, "2026-10-13", {});
  const without = quotes.filter((q) => q.id !== first.quote!.id);
  const again = pickQuoteOfTheDay(without, "2026-10-13", first.history);
  assert.ok(again.quote && again.quote.id !== first.quote!.id);
  assert.equal(again.history["2026-10-13"], again.quote!.id);
});

test("old history is dropped so it does not grow forever", () => {
  const history: QuoteHistory = { "2026-01-01": "q0", "2026-10-12": "q1" };
  const result = pickQuoteOfTheDay(make(5), "2026-10-13", history);
  assert.deepEqual(Object.keys(result.history).sort(), ["2026-10-12", "2026-10-13"]);
});

test("day helpers: local calendar day, shifting across month and year ends, and a stable 0 to 1 random", () => {
  assert.equal(localDay(new Date(2026, 9, 3, 23, 59)), "2026-10-03");
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDay("2026-01-02", -7), "2025-12-26");
  for (const day of ["2026-10-13", "2026-10-14", "2027-02-29"]) { const r = dayRandom(day); assert.ok(r >= 0 && r < 1); assert.equal(r, dayRandom(day)); }
  assert.notEqual(dayRandom("2026-10-13"), dayRandom("2026-10-14"));
});

test("broken history storage reads as empty; the export lists every quote with author and source", () => {
  assert.deepEqual(loadQuoteHistory(memory({ [QUOTE_HISTORY_KEY]: "[1,2]" })), {});
  assert.deepEqual(loadQuoteHistory(memory({ [QUOTE_HISTORY_KEY]: "oops" })), {});
  assert.deepEqual(loadQuoteHistory(memory({ [QUOTE_HISTORY_KEY]: '{"2026-10-13":"q1"}' })), { "2026-10-13": "q1" });
  const lines = buildQuotesCSVExport(memory({})).content.split("\n");
  assert.equal(lines.length, 11);
  assert.ok(lines[0].includes("Quote") && lines[0].includes("Author"));
  assert.ok(lines.some((l) => l.includes("Marcus Aurelius") && l.includes("Meditations 6.6")));
});
