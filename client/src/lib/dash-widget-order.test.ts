import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moveWidget } from "./dash-widget-order";

const order = ["skills", "schedule", "tasks", "finance"];

test("moving a widget puts it in the new place and shifts the others", () => {
  assert.deepEqual(moveWidget(order, 0, 1), ["schedule", "skills", "tasks", "finance"]);
  assert.deepEqual(moveWidget(order, 3, 2), ["skills", "schedule", "finance", "tasks"]);
  assert.deepEqual(moveWidget(order, 0, 3), ["schedule", "tasks", "finance", "skills"]);
  assert.deepEqual(moveWidget(order, 3, 0), ["finance", "skills", "schedule", "tasks"]);
});

test("a move that goes nowhere or off the list leaves the order alone, and the original is never changed", () => {
  for (const [from, to] of [[1, 1], [0, -1], [3, 4], [-1, 2], [9, 0]]) assert.deepEqual(moveWidget(order, from, to), order);
  assert.notEqual(moveWidget(order, 1, 1), order);
  assert.deepEqual(order, ["skills", "schedule", "tasks", "finance"]);
});

const dashboard = readFileSync(new URL("../pages/dashboard.tsx", import.meta.url), "utf8");

test("on a phone the widgets are reordered with up and down buttons, not by dragging", () => {
  assert.ok(dashboard.includes("draggable={!isMobile}"), "touch drag is off so scrolling and taps are not hijacked");
  assert.ok(dashboard.includes("const dragHandleBar = isMobile ? null"), "no grip handle on a phone");
  assert.ok(dashboard.includes('data-testid="reorder-widgets-toggle"') && dashboard.includes('"Done" : "Reorder widgets"'));
  assert.ok(dashboard.includes("aria-label={`Move ${DASH_WIDGET_LABELS[key]} ${name}`}"));
  assert.ok(dashboard.includes("disabled={i + delta < 0 || i + delta >= dashWidgetOrder.length}"), "the first cannot go up and the last cannot go down");
  assert.ok(dashboard.includes("h-11 w-11"), "buttons are 44px touch targets");
});

test("a button move and a desktop drop save the order the same way, and the moved widget is scrolled into view", () => {
  const fn = dashboard.slice(dashboard.indexOf("function moveDashWidget"), dashboard.indexOf("const nudgeDashWidget"));
  assert.ok(fn.includes("moveWidget(dashWidgetOrder, from, to)"));
  assert.ok(fn.includes('localStorage.setItem("dash-widget-order"') && fn.includes("saveDashWidgetPrefs(next)"));
  assert.ok(dashboard.includes("moveDashWidget(dashDragSrcIdx.current, idx)"), "desktop drop uses the same move");
  assert.ok(dashboard.includes("data-dash-widget={key}") && dashboard.includes("scrollIntoView"));
});
