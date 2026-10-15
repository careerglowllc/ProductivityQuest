import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import JournalHomePage, { BODY_LOGS } from "./journal-home";
import { JournalHero } from "@/components/journal-ui";

const html = renderToStaticMarkup(createElement(Router, { ssrPath: "/journal", children: createElement(JournalHomePage) }));

test("the journal page has button links to the lifting, calorie and weight logs", () => {
  assert.deepEqual(BODY_LOGS.map((l) => [l.label, l.path]), [
    ["Weightlifting log", "/fitness/lifting"], ["Calorie log", "/fitness/calories"], ["Weight log", "/fitness/weight"],
  ]);
  const section = html.slice(html.indexOf('aria-label="Body logs"'));
  for (const { label, path } of BODY_LOGS) {
    assert.match(section, new RegExp(`<a[^>]*href="${path}"[^>]*>(?:(?!</a>).)*${label}`), label);
  }
});

test("the log buttons sit below the journal sections and the existing destinations are unchanged", () => {
  assert.ok(html.indexOf('aria-label="Body logs"') > html.indexOf('aria-label="Journal sections"'));
  for (const path of ["/journal/essays", "/journal/daily-glew", "/journal/gratitude", "/journal/sparks", "/journal/quotes", "/journal/weekly-planning", "/reference-beliefs", "/command-center"]) {
    assert.ok(html.includes(`href="${path}"`), path);
  }
});

test("each log button goes to a page that exists", async () => {
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  for (const { path } of BODY_LOGS) assert.ok(app.includes(`<Route path="${path}"`), path);
});

test("on a phone the hero and every card are compact so all the links fit on one screen", () => {
  assert.match(html, /<h1[^>]*text-\[30px\][^>]*sm:text-\[51px\]/, "smaller title on phones, the full size from sm up");
  assert.match(html, /<nav aria-label="Journal sections" class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3"/);
  const nav = html.slice(html.indexOf('aria-label="Journal sections"'), html.indexOf('aria-label="Body logs"'));
  assert.equal((nav.match(/hidden [^"]*sm:block/g) ?? []).length, 8, "the long descriptions are hidden on phones (7 sections and the Command Center)");
  assert.equal((nav.match(/hidden [^"]*sm:inline-flex/g) ?? []).length, 8, "so are the Open links");
  assert.ok(nav.includes("col-span-2"), "the Command Center spans both columns");
  const logs = html.slice(html.indexOf('aria-label="Body logs"'));
  assert.ok(logs.includes("grid grid-cols-3"), "the three log buttons share one row");
});

test("from sm up the cards and log buttons keep the full layout", () => {
  assert.ok(html.includes("sm:flex-col sm:items-stretch sm:gap-3 sm:p-5"), "section cards");
  assert.ok(html.includes("sm:h-10 sm:w-10"), "icons");
  assert.ok(html.includes("sm:text-[22px]"), "card titles");
  assert.ok(html.includes("sm:flex sm:flex-wrap sm:gap-3"), "log buttons wrap in a row");
  assert.ok(html.includes("sm:rounded-full"), "log buttons are pills");
});

test("other journal pages keep the full-size hero", () => {
  const other = renderToStaticMarkup(createElement(JournalHero, { eyebrow: "E", title: "T", copy: "C" }));
  assert.match(other, /<h1[^>]*text-\[42px\]/);
  assert.doesNotMatch(other, /text-\[30px\]/);
});
