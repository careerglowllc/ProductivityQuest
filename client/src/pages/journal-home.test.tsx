import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import JournalHomePage, { BODY_LOGS } from "./journal-home";

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
