import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyRoutine, type Routine } from "@shared/fitness-routine";
import { RoutineDayForm, RoutineEditor } from "./routine-editor";

const routine: Routine = {
  Push: { exercises: "Incline dumbbell press 3x8-10\nLateral raise 4x12\nTriceps pushdown", notes: "Presses first" },
  Pull: { exercises: "Lat pulldown 3x8\nSeated row 3x10", notes: "" },
  Legs: { exercises: "", notes: "" },
};
const render = (props: Partial<Parameters<typeof RoutineEditor>[0]> = {}) =>
  renderToStaticMarkup(createElement(RoutineEditor, { routine, onSave: () => {}, activeType: "All", startOpen: true, ...props }));

test("the routine section shows the exercises each day holds, with a target where there is one, and the notes", () => {
  const html = render();
  assert.match(html, /data-testid="routine"/);
  assert.match(html, />Your routine</);
  assert.match(html, /Push 3 · Pull 2 · Legs 0/);
  assert.match(html, /data-testid="routine-list"/);
  assert.match(html, />Incline dumbbell press · 3 × 8-10</);
  assert.match(html, />Triceps pushdown</);
  assert.match(html, /data-testid="routine-notes">Presses first</);
  assert.match(html, /Edit Push day/);
});

test("the day follows the tab chosen above, and the buttons show how many exercises each day has", () => {
  const pull = render({ activeType: "Pull" });
  assert.match(pull, />Lat pulldown · 3 × 8</);
  assert.doesNotMatch(pull, /Incline dumbbell press/);
  assert.match(pull, /Edit Pull day/);
  assert.match(pull, /aria-pressed="true"[^>]*>Pull <span[^>]*>2</);
  assert.match(pull, /aria-pressed="false"[^>]*>Push <span[^>]*>3</);
});

test("a day with nothing set says so and offers to add it", () => {
  const html = render({ activeType: "Legs" });
  assert.match(html, /Nothing set for Legs day yet/);
  assert.match(html, /Add Legs day/);
  assert.doesNotMatch(html, /routine-list/);
});

test("before anything is set up it invites you to, and starts open; once set up it starts collapsed", () => {
  const empty = renderToStaticMarkup(createElement(RoutineEditor, { routine: emptyRoutine(), onSave: () => {}, activeType: "All" }));
  assert.match(empty, /Not set up yet\. Tell the AI what each day holds\./);
  assert.match(empty, /aria-expanded="true"/);
  const set = renderToStaticMarkup(createElement(RoutineEditor, { routine, onSave: () => {}, activeType: "All" }));
  assert.match(set, /aria-expanded="false"/);
  assert.match(set, /id="routine-body" hidden=""/);
});

test("the section explains what the routine is used for", () => {
  const html = render();
  assert.match(html, /The AI uses this to recognise your lifts and tell what kind of day it was/);
  assert.match(html, /charts below only show lifts that are in your routine/);
});

test("the form for a day has the exercises box, a note box, a live read-out of what was understood, and Save and Cancel", () => {
  const html = renderToStaticMarkup(createElement(RoutineDayForm, {
    day: "Pull", value: { exercises: "Lat pulldown 3x8-10\nFace pull — 3 sets\nrubbish 3x", notes: "Back first" }, onChange: () => {}, onSave: () => {}, onCancel: () => {}, accent: "#34D399",
  }));
  assert.match(html, /What a Pull day holds/);
  assert.match(html, /aria-label="Pull day exercises"/);
  assert.match(html, /aria-label="Pull day notes"/);
  assert.match(html, /Understood 3 exercises:/);
  assert.match(html, />Lat pulldown · 3 × 8-10</);
  assert.match(html, />Face pull · 3 sets</);
  assert.match(html, />rubbish · 3 sets</);
  assert.match(html, /Back first<\/textarea>/);
  assert.match(html, />Save Pull day</);
  assert.match(html, />Cancel</);
});

test("an empty form says nothing is understood yet, and one exercise reads in the singular", () => {
  const form = (exercises: string) => renderToStaticMarkup(createElement(RoutineDayForm, { day: "Push", value: { exercises, notes: "" }, onChange: () => {}, onSave: () => {}, onCancel: () => {}, accent: "#34D399" }));
  assert.match(form(""), /Nothing yet\./);
  assert.match(form("Bench press"), /Understood 1 exercise:/);
});
