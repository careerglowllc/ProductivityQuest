import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./finances.tsx", import.meta.url), "utf8");
const count = (text: string) => source.split(text).length - 1;
const tab = source.slice(source.indexOf('<TabsContent value="credit-cards"'), source.indexOf('<TabsContent value="accounts"'));

// The Discover cards are listed in four places: the tab, its export sheet, and the Discover account on the Accounts tab and its export.
for (const name of ["Discover It Cashboard Card", "Discover it® Chrome"]) {
  test(`${name} is a credit card on the Credit Cards tab, in the export and in the Discover account`, () => {
    assert.equal(count(`name: "${name}"`), 2, "the tab and the Credit Cards export sheet");
    const card = tab.slice(tab.indexOf(`name: "${name}"`));
    assert.ok(card.slice(0, card.indexOf("},")).includes('issuer: "Discover"'));
    assert.match(card.slice(0, card.indexOf("},")), /type: "Credit Card/);
    assert.ok(card.slice(0, card.indexOf("},")).includes('status: "active"'));
    assert.match(source, new RegExp(`type: "Credit Card[^"]*", status: "active", notes: ""`));
    assert.equal(count(`Discover it® Cash Back · Discover It Cashboard Card · Discover it® Chrome`), 2, "listed under the Discover account and its export");
  });
}

test("the existing Discover card stays and every card on the tab has a unique name", () => {
  assert.ok(source.includes('name: "Discover it® Cash Back"'));
  const names = Array.from(tab.matchAll(/^\s+name: "([^"]+)",$/gm), (m) => m[1]);
  assert.ok(names.length >= 13);
  assert.equal(new Set(names).size, names.length);
});
