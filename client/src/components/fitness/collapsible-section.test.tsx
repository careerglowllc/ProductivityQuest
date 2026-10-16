import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CollapsibleSection } from "./collapsible-section";

const render = (summary?: string) =>
  renderToStaticMarkup(createElement(CollapsibleSection, {
    testId: "full-log", title: "Full Workout Log", icon: null, summary, children: createElement("p", null, "the table"),
  }));

test("a section is closed by default: a titled button with a one-line summary, and none of its content", () => {
  const html = render("12 entries");
  assert.match(html, /<button[^>]*data-testid="full-log-toggle"[^>]*aria-expanded="false"/);
  assert.match(html, />Full Workout Log</);
  assert.match(html, /data-testid="full-log-summary"[^>]*>12 entries</);
  assert.doesNotMatch(html, /the table/, "nothing inside is built while closed");
  assert.doesNotMatch(html, /aria-controls/, "no pointer to a body that is not there");
});

test("without a summary only the title and the arrow show", () => {
  assert.doesNotMatch(render(), /full-log-summary/);
});
