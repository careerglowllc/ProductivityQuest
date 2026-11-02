import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportanceLabel } from "./importance-label";
import { IMPORTANCE_COLORS, IMPORTANCE_LEVELS, importanceColor } from "@/lib/importance";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

test("importance runs from green for Low to red for High, with yellow and orange between", () => {
  assert.equal(importanceColor("Low"), "#22c55e", "green");
  assert.equal(importanceColor("Med-Low"), "#eab308", "yellow");
  assert.equal(importanceColor("Medium"), "#f97316", "orange");
  assert.equal(importanceColor("High"), "#ef4444", "red");
  assert.equal(new Set(IMPORTANCE_LEVELS.map((level) => IMPORTANCE_COLORS[level])).size, IMPORTANCE_LEVELS.length, "every level has its own colour");
  assert.equal(importanceColor("something else"), "#94a3b8", "an unknown level is a grey dot, never a question mark");
});

test("each level shows a coloured circle and its name", () => {
  for (const level of IMPORTANCE_LEVELS) {
    const html = renderToStaticMarkup(<ImportanceLabel level={level} />);
    assert.match(html, new RegExp(`data-importance-dot="${level}"`));
    assert.ok(html.includes(`background-color:${IMPORTANCE_COLORS[level]}`), `${level} dot colour`);
    assert.match(html, /rounded-full/);
    assert.ok(html.endsWith(`${level}</span>`), `${level} name`);
  }
  assert.match(renderToStaticMarkup(<ImportanceLabel level="Pareto" text="Pareto (Critical)" />), /Pareto \(Critical\)<\/span>$/);
});

test("every importance dropdown uses the dots, and none still holds a corrupted character or an emoji circle", () => {
  for (const file of ["add-task-modal.tsx", "task-detail-modal.tsx", "add-questline-modal.tsx", "edit-questline-modal.tsx", "questline-draft-tree.tsx"]) {
    const source = read(file);
    const items = source.match(/<SelectItem value="(Pareto|High|Med-High|Medium|Med-Low|Low)">[^\n]*?<\/SelectItem>/g) ?? [];
    assert.ok(items.length >= 6, `${file} lists the six levels`);
    for (const item of items) {
      assert.match(item, /<ImportanceLabel level="/, `${file}: ${item}`);
      assert.ok(!item.includes("\uFFFD") && !["🔴", "🟠", "🟡", "🟢", "⚪", "⭐"].some((emoji) => item.includes(emoji)), `${file}: ${item}`);
    }
  }
});
