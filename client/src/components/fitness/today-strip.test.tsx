import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { liftStripText, mealStripText } from "@shared/fitness-today";
import { TodayStrip } from "./today-strip";

const render = (props: Parameters<typeof TodayStrip>[0]) => renderToStaticMarkup(createElement(TodayStrip, props));

test("the thin row shows today's running totals", () => {
  const html = render({ kind: "meal", text: mealStripText({ hasAny: true, calories: 1240, protein: 82, carbs: 120, fat: 40 }), accent: "#F87171", progress: 1240 / 2200, inProgress: false });
  assert.match(html, /data-testid="today-strip-meal"/);
  assert.match(html, />Today</);
  assert.match(html, />1,240 kcal</);
  assert.match(html, /P 82g · C 120g · F 40g/);
  assert.doesNotMatch(html, /border-dashed/);
  assert.match(html, /data-testid="today-progress" style="width:56%/);
});

test("with nothing yet it shows a dashed placeholder that says what to do", () => {
  const html = render({ kind: "meal", text: mealStripText({ hasAny: false, calories: 0, protein: 0, carbs: 0, fat: 0 }), accent: "#F87171", progress: 0, inProgress: false });
  assert.match(html, /border-dashed/);
  assert.match(html, />Nothing logged yet</);
  assert.match(html, /Tell me what you ate below/);
  assert.match(html, /width:0%/);
});

test("the workout row has no progress line, and shows type, exercises, sets and volume", () => {
  const html = render({ kind: "workout", text: liftStripText({ hasAny: true, exercises: 4, sets: 12, volume: 8400, types: ["Pull"] }), accent: "#34D399", inProgress: false });
  assert.match(html, /data-testid="today-strip-workout"/);
  assert.match(html, />Pull</);
  assert.match(html, /4 exercises · 12 sets · 8,400 lb/);
  assert.doesNotMatch(html, /today-progress/);
  assert.match(render({ kind: "workout", text: liftStripText({ hasAny: false, exercises: 0, sets: 0, volume: 0, types: [] }), accent: "#34D399", inProgress: false }), /Log your first exercise below/);
});

test("a dot shows while today's log is still open", () => {
  const text = mealStripText({ hasAny: true, calories: 300, protein: 10, carbs: 30, fat: 5 });
  assert.match(render({ kind: "meal", text, accent: "#F87171", inProgress: true }), /data-testid="today-in-progress"/);
  assert.doesNotMatch(render({ kind: "meal", text, accent: "#F87171", inProgress: false }), /today-in-progress/);
});

test("the progress line never goes past full or below empty", () => {
  const text = mealStripText({ hasAny: true, calories: 3000, protein: 0, carbs: 0, fat: 0 });
  assert.match(render({ kind: "meal", text, accent: "#F87171", progress: 1.4, inProgress: false }), /width:100%/);
  assert.match(render({ kind: "meal", text, accent: "#F87171", progress: -1, inProgress: false }), /width:0%/);
});

test("the row is one thin line: no wrapping text and a small height", () => {
  const html = render({ kind: "meal", text: mealStripText({ hasAny: true, calories: 1, protein: 1, carbs: 1, fat: 1 }), accent: "#F87171", inProgress: false });
  assert.match(html, /py-1\.5 text-\[12px\]/);
  assert.match(html, /truncate/);
});
