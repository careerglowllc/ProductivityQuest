import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncubateForm } from "./incubate-dialog";

const now = new Date(2026, 9, 20, 15, 30);
const render = (quest: object, extra: object = {}) => renderToStaticMarkup(createElement(IncubateForm, { quest, now, onConfirm: () => {}, onCancel: () => {}, ...extra }));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
const presets = (html: string) => (html.match(/<button[^>]*data-testid="incubate-preset"[^>]*>.*?<\/button>/g) ?? []);
const confirm = (html: string) => html.match(/<button[^>]*data-testid="incubate-confirm"[^>]*>.*?<\/button>/)?.[0] ?? "";

test("it offers four quick choices and a calendar, with a week out already chosen so one tap is enough", () => {
  const html = render({});
  assert.deepEqual(presets(html).map(text), ["1 week", "2 weeks", "1 month", "3 months"]);
  assert.match((presets(html)[0] ?? ""), /aria-pressed="true"/);
  assert.match((presets(html)[1] ?? ""), /aria-pressed="false"/);
  assert.match(html, /role="grid"/, "the calendar is there");
  assert.match(text(confirm(html)), /^Incubate until Oct 27, 2026$/);
  assert.doesNotMatch(confirm(html), / disabled=""/);
  assert.match(html, />Cancel</);
});

test("changing the day starts on the day it already comes back", () => {
  const html = render({ kanbanStage: "Incubate", startDate: "2026-11-19T00:00:00.000Z" });
  assert.match(text(confirm(html)), /^Incubate until Nov 19, 2026$/);
  assert.match((presets(html)[2] ?? ""), /aria-pressed="true"/, "that is the month choice");
});

test("a quest due soon can't be incubated past its due date: the later choices are off and the limit is explained", () => {
  const html = render({ dueDate: "2026-11-05T00:00:00.000Z" });
  assert.deepEqual(presets(html).map((p) => / disabled=""/.test(p)), [false, false, true, true], "a week and two weeks fit, a month does not");
  assert.match(text(html), /Due Nov 05, 2026, so it can only incubate up to then\./);
  assert.match(text(confirm(html)), /^Incubate until Oct 27, 2026$/);
});

test("a quest due within days still shows up in the list, and the form says so", () => {
  assert.match(text(render({ dueDate: "2026-10-23T00:00:00.000Z" })), /A deadline this close keeps it in your list anyway\./);
  assert.doesNotMatch(text(render({ dueDate: "2026-12-30T00:00:00.000Z" })), /keeps it in your list anyway/);
  assert.doesNotMatch(text(render({})), /Due /);
});

test("with nothing that can be picked the button waits for a day, and while saving it is off", () => {
  const overdue = render({ dueDate: "2026-10-15T00:00:00.000Z" });
  assert.match(text(confirm(overdue)), /^Pick a day$/);
  assert.match(confirm(overdue), / disabled=""/);
  assert.ok(presets(overdue).every((p) => / disabled=""/.test(p)));
  assert.match(confirm(render({}, { pending: true })), / disabled=""/);
});

test("the quest detail window asks for the day before saving Incubate, and clears a day still ahead when leaving it", () => {
  const modal = readFileSync(new URL("./task-detail-modal.tsx", import.meta.url), "utf8");
  assert.ok(modal.includes("if (value === INCUBATE_STAGE) { setIsIncubateOpen(true); return; }"), "choosing it opens the question and saves nothing");
  assert.ok(modal.includes("updateStageMutation.mutate(stagePatch(task, value, new Date()))"));
  assert.ok(modal.includes("onConfirm={(day) => updateStageMutation.mutate(incubatePatch(day))}"), "confirming saves the stage and the start date in one request");
  assert.ok(modal.includes("onOpenChange={setIsIncubateOpen}"), "closing it leaves the quest as it was");
  assert.ok(modal.includes('data-testid="incubate-status"') && modal.includes("Incubating \u2014 back in your list on"));
  const mutation = modal.slice(modal.indexOf("const updateStageMutation"), modal.indexOf("if (!task) return null;"));
  assert.ok(mutation.includes("JSON.stringify(patch)") && mutation.includes("patch.startDate === null"));
  assert.ok(!modal.includes("updateFieldMutation.mutate({ field: 'kanbanStage'"), "no path saves the stage without its start date");
});
