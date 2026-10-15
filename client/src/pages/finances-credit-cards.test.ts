import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./finances.tsx", import.meta.url), "utf8");
const count = (text: string) => source.split(text).length - 1;

test("the Discover It Cashboard Card is on the Credit Cards tab, in the export and in the Discover account", () => {
  assert.equal(count('name: "Discover It Cashboard Card"'), 2, "card on the tab and the Credit Cards export sheet");
  const tab = source.slice(source.indexOf('<TabsContent value="credit-cards"'), source.indexOf('<TabsContent value="accounts"'));
  assert.ok(tab.includes('name: "Discover It Cashboard Card"') && tab.includes('issuer: "Discover"'));
  assert.ok(tab.slice(tab.indexOf("Discover It Cashboard Card")).includes('status: "active"'));
  assert.equal(count("Discover it® Cash Back · Discover It Cashboard Card"), 2, "listed under the Discover account on the Accounts tab and its export");
});

test("the card keeps the existing Discover card and every card has a unique name", () => {
  assert.ok(source.includes('name: "Discover it® Cash Back"'));
  const tab = source.slice(source.indexOf('<TabsContent value="credit-cards"'), source.indexOf('<TabsContent value="accounts"'));
  const names = Array.from(tab.matchAll(/^\s+name: "([^"]+)",$/gm), (m) => m[1]);
  assert.ok(names.length >= 12);
  assert.equal(new Set(names).size, names.length);
});
