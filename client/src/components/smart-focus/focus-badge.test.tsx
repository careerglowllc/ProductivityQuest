import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { FocusBadge } from "./focus-badge";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the badge is a small labelled mark for quests already in Smart Focus", () => {
  const html = renderToStaticMarkup(<FocusBadge />);
  assert.match(html, /data-testid="smart-focus-badge"/);
  assert.match(html, /aria-label="In Smart Focus"/);
  assert.match(html, /title="In Smart Focus"/);
});

test("every card layout marks a quest that is in Smart Focus, beside its title, and never a finished one", () => {
  const card = read("../task-card.tsx");
  assert.equal(card.split("{inSmartFocus && !task.completed && <FocusBadge />}").length - 1, 3, "grid, mobile and list layouts");
  assert.equal(card.split("{task.title}\n").length - 1, 3);
  assert.equal(card.match(/\{task\.title\}\n\s*\{inSmartFocus/g)?.length, 3, "right after each title");
});

test("the Quests page marks Smart Focus quests on every view but Smart Focus itself, using the ranking it already reads", () => {
  const home = read("../../pages/home.tsx");
  assert.ok(home.includes('!!user && !tasksLoading && smartView === "on",'), "ranking is read on every view");
  assert.ok(home.includes('activeFilter === "smart" || smartView !== "on" ? new Set<number>()'));
  assert.equal(home.split("inSmartFocus={inSmartFocus.has(task.id)}").length - 1, 2, "list and grid cards outside the Smart Focus view");
});
