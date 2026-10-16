import test from "node:test";
import assert from "node:assert/strict";
import { NEW_QUOTES, mergeQuotes } from "../add-quotes-hat-and-falling-apart";
import { QUOTES_KEY, SEED_QUOTES, loadQuotes, pickQuoteOfTheDay, type Quote } from "../client/src/lib/quotes";

const memory = (value: string | null) => ({ getItem: (key: string) => (key === QUOTES_KEY ? value : null) });

test("the hat-of-problems quote is reworded but keeps its idea: everyone has problems, written down and mixed, would you draw", () => {
  const hat = NEW_QUOTES.find((q) => q.id === "quote-hat-of-problems")!;
  assert.match(hat.text, /^Everyone carries problems\./);
  assert.match(hat.text, /whole world/);
  assert.match(hat.text, /wrote theirs/);
  assert.match(hat.text, /hat/);
  assert.match(hat.text, /shook them together|mixed/);
  assert.match(hat.text, /Would you reach in and trade yours for another\?$/);
  assert.notEqual(hat.text, "Everyone has problems. Imagine everyone in the world wrote down their problems and put them in a hat and mixed it up. Would you choose to draw from them?");
});

test("the second quote is kept exactly as given", () => {
  assert.equal(NEW_QUOTES.find((q) => q.id === "quote-everything-falling-apart")!.text, "Everything is falling apart. Your new life will cost you your old one.");
});

test("both are well-formed quotes with unique ids that the app's list accepts", () => {
  assert.equal(NEW_QUOTES.length, 2);
  assert.equal(new Set(NEW_QUOTES.map((q) => q.id)).size, 2);
  for (const q of NEW_QUOTES) assert.ok(q.id && q.text.trim() && typeof q.author === "string" && !Number.isNaN(Date.parse(q.createdAt)));
  const loaded = loadQuotes(memory(JSON.stringify(NEW_QUOTES)));
  assert.equal(loaded.length, 2, "none is filtered out as invalid");
});

test("with no saved list the starter quotes are kept and the two new ones go first", () => {
  const merged = mergeQuotes(null);
  assert.equal(merged.length, SEED_QUOTES.length + 2);
  assert.deepEqual(merged.slice(0, 2).map((q) => q.id), ["quote-hat-of-problems", "quote-everything-falling-apart"]);
  assert.deepEqual(merged.slice(2), SEED_QUOTES);
});

test("a saved list keeps everything in it, including quotes the person added or edited, or an emptied list", () => {
  const mine: Quote[] = [{ id: "mine-1", text: "Be water.", author: "Bruce Lee", createdAt: "2026-10-14T00:00:00.000Z" }, { ...SEED_QUOTES[0], text: "my edit" }];
  const merged = mergeQuotes(mine);
  assert.deepEqual(merged.slice(2), mine);
  assert.equal(merged.length, 4);
  assert.equal(mergeQuotes([]).length, 2, "an emptied list gets just the two new quotes");
});

test("running it again adds nothing twice", () => {
  const once = mergeQuotes(null);
  const twice = mergeQuotes(once);
  assert.deepEqual(twice, once);
  assert.equal(new Set(twice.map((q) => q.id)).size, twice.length);
});

test("the quotes show in the list the app loads, and can be picked as the quote of the day", () => {
  const loaded = loadQuotes(memory(JSON.stringify(mergeQuotes(null))));
  assert.equal(loaded.length, SEED_QUOTES.length + 2);
  const picked = new Set<string>();
  let history = {};
  for (let i = 0; i < 40; i++) {
    const day = `2026-11-${String(1 + (i % 28)).padStart(2, "0")}`;
    const result = pickQuoteOfTheDay(loaded, `${i < 28 ? day : "2026-12-" + String(i - 27).padStart(2, "0")}`, history);
    history = result.history;
    picked.add(result.quote!.id);
  }
  assert.ok(picked.has("quote-hat-of-problems") && picked.has("quote-everything-falling-apart"));
});
