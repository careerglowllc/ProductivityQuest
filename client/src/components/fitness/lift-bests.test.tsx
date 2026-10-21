import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiftBests } from "./lift-bests";
import { FitnessSessionPanel, type SessionParts } from "./session-panel";
import { localToday } from "@/lib/fitness-entry";
import { newDraft, type WorkoutDraft } from "@shared/fitness-session";
import { normalizeWorkout, workoutToLogEntries, type WorkoutLogEntry } from "@shared/fitness-log";
import { emptyRoutine, planFromRoutine } from "@shared/fitness-routine";

const today = localToday();
const now = new Date("2026-10-13T12:00:00Z");

const row = (date: string, exercise: string, setsRaw: string, metric: WorkoutLogEntry["metric"]): WorkoutLogEntry => ({ date, workoutType: "Pull", exercise, setsRaw, metric });
const history: WorkoutLogEntry[] = [
  row("2026-01-10", "Lat Pulldown", "110 lb: 8 / 8 / 7", { kind: "weight", value: 110 }),
  row("2026-01-17", "Lat Pulldown", "125 lb: 6 / 5 / 5", { kind: "weight", value: 125 }),
  row("2026-01-17", "Pull-Ups", "BW: 8 / 6 / 3", { kind: "reps", value: 8 }),
];

const workoutDraft = (list: object[], date = today, reopened = false): WorkoutDraft =>
  newDraft("lift-1", now, "pull day", normalizeWorkout({ date, workoutType: "Pull", exercises: list }, date, { keepEmpty: true }), reopened);
const pulldown = { name: "Lat Pulldown", sets: [{ weight: 120, reps: 8 }, { weight: 125, reps: 6 }, { weight: 130, reps: 5 }], warmup: "60 lb x12", notes: "felt strong" };

const alone = (entries: WorkoutLogEntry[] = history, updating = false) => renderToStaticMarkup(createElement(LiftBests, { entries, today, updating }));
const area = (draft: WorkoutDraft | null, entries: WorkoutLogEntry[] = history, plan?: ReturnType<typeof planFromRoutine>) => renderToStaticMarkup(createElement(FitnessSessionPanel, {
  kind: "workout", draft, plan, compact: true, onDraftChange: () => {}, onEnd: () => {},
  below: (parts: SessionParts | null, updating: boolean) => createElement(LiftBests, { entries, today, parts, updating }),
}));
const cardsOf = (html: string) => html.split('<li data-testid="lift-card"').slice(1);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
const button = (html: string, testId: string) => html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? "";
const widget = (html: string) => html.slice(html.indexOf('data-testid="lift-bests"'));

test("with nothing lifted today the widget is still there, with an invitation, no toggle and no controls", () => {
  const html = alone();
  assert.match(html, /data-testid="bests-title"[^>]*>Today vs your bests</);
  assert.match(html, /Nothing lifted today yet\. Send your first exercise above/);
  assert.doesNotMatch(html, /What the bars measure|end-session|undo-entry|lift-card|Day this belongs to/);
});

test("what was saved today is shown without controls or remove buttons", () => {
  const saved = workoutToLogEntries(normalizeWorkout({ date: today, workoutType: "Pull", exercises: [pulldown] }, today), "lift-0");
  const html = alone([...history, ...saved]);
  assert.equal(cardsOf(html).length, 1);
  assert.match(html, /Lat Pulldown/);
  assert.match(html, /data-testid="lift-summary"[^>]*>Top 130 lb \u00b7 New best!</);
  assert.doesNotMatch(html, /aria-label="Remove|end-session|bests-empty/);
});

test("an open day is the widget's day: its title, type, tag, Day field and saved note", () => {
  const html = area(workoutDraft([pulldown]));
  assert.match(html, /data-testid="bests-title"[^>]*>Today vs your bests</);
  assert.match(html, /Pull day/);
  assert.match(html, /In progress/);
  assert.match(html, /<input[^>]*type="date"[^>]*aria-label="Day this belongs to"/);
  assert.match(html, /Saved automatically at/);
  assert.doesNotMatch(html, /session-summary|session-title|Today&#x27;s pull day/, "no separate summary box above the text box");
  assert.ok(html.indexOf("<textarea") < html.indexOf('data-testid="lift-bests"'), "the box comes first");
});

test("each exercise is a card, with a bar for each set drawn to its weight, against the best", () => {
  const html = area(workoutDraft([pulldown]));
  const [card] = cardsOf(html);
  assert.ok(card);
  assert.match(card, /data-status="new"/);
  assert.equal(text(card.match(/<p[^>]*data-testid="lift-summary".*?<\/p>/)?.[0] ?? ""), "Top 130 lb \u00b7 New best!");
  const sets = card.match(/<li[^>]*data-testid="lift-set".*?<\/li>/g) ?? [];
  assert.equal(sets.length, 3);
  assert.deepEqual(sets.map((s) => text(s)), ["Set 1 120 lb \u00d7 8", "Set 2 125 lb \u00d7 6", "Set 3 130 lb \u00d7 5 \u2605"]);
  assert.deepEqual(sets.map((s) => /data-beats-best="(\w+)"/.exec(s)![1]), ["false", "false", "true"]);
  const width = (s: string) => /data-testid="lift-fill"[^>]*width:([\d.]+)%/.exec(s)![1];
  assert.deepEqual(sets.map(width), ["85.5", "89", "92.6"], "each bar is its set over the scale, a little more than the longest");
  for (const s of sets) {
    assert.match(s, /data-testid="lift-shadow"[^>]*width:89%/, "the faint fill runs to the best");
    assert.match(s, /data-testid="lift-best-line"[^>]*left:89%/, "and the dashed line marks it");
  }
  assert.match(sets[2], /background-color:#FBBF24/, "a set past the best is gold");
  assert.match(sets[0], /background-color:#34D399/);
  assert.match(sets[1], /aria-label="Set 2: 125 lb \u00d7 6, best 125 lb"/);
  assert.match(card, /Warm-up: 60 lb x12 \u2014 felt strong/);
});

test("the bars measure weight to begin with, and the toggle offers volume", () => {
  const html = area(workoutDraft([pulldown]));
  assert.match(html, /role="group"[^>]*aria-label="What the bars measure"/);
  assert.match(html, /aria-pressed="true"[^>]*>Weight</);
  assert.match(html, /aria-pressed="false"[^>]*>Volume</);
});

test("a lift with no earlier day is a first: bars but no dashed line or faint fill", () => {
  const html = area(workoutDraft([{ name: "Seated Cable Row", sets: [{ weight: 100, reps: 10 }] }]));
  const [card] = cardsOf(html);
  assert.match(card, /data-status="first"/);
  assert.match(text(card), /Top 100 lb \u00b7 first time logged/);
  assert.doesNotMatch(card, /lift-best-line|lift-shadow/);
  assert.match(card, /data-testid="lift-fill"[^>]*width:92\.6%/);
});

test("a lift that falls short of its best says what the best is and when it was", () => {
  const html = area(workoutDraft([{ name: "Lat Pulldown", sets: [{ weight: 100, reps: 10 }] }]));
  const [card] = cardsOf(html);
  assert.match(card, /data-status="below"/);
  assert.match(text(card), /Top 100 lb \u00b7 best 125 lb \(Jan 17\)/);
  assert.match(card, /data-testid="lift-fill"[^>]*width:74\.1%/, "100 of a 135 scale");
  assert.match(card, /left:92\.6%/, "the best line sits near the end");
  assert.doesNotMatch(card, /#FBBF24/);
});

test("an exercise with no sets yet shows its warm-up and notes, and waits for its first bar", () => {
  const html = area(workoutDraft([{ name: "Seated Row", sets: [], warmup: "80 lb x10" }]));
  const [card] = cardsOf(html);
  assert.match(card, /data-status="empty"/);
  assert.match(text(card), /Seated Row .*No sets yet/);
  assert.match(card, /Warm-up: 80 lb x10/);
  assert.doesNotMatch(card, /lift-set/);
  assert.doesNotMatch(html, /Nothing lifted today yet/, "the exercise is there, waiting for its sets");
});

test("pull-ups are drawn to reps and a hold to seconds", () => {
  const html = area(workoutDraft([{ name: "Pull-Ups", sets: [{ unit: "bw", reps: 9 }, { unit: "bw", reps: 7 }] }, { name: "Dead Hang", sets: [{ seconds: 45 }] }]));
  const [pullUps, hang] = cardsOf(html);
  assert.match(text(pullUps), /Pull-Ups .*Top 9 reps \u00b7 New best! Set 1 9 reps \u2605 Set 2 7 reps/);
  assert.match(text(hang), /Dead Hang .*Top 45 sec \u00b7 first time logged Set 1 45 sec/);
});

test("the open day's exercises each have a remove button, and the saved ones do not", () => {
  const saved = workoutToLogEntries(normalizeWorkout({ date: today, workoutType: "Pull", exercises: [{ name: "Face Pull", sets: [{ weight: 40, reps: 15 }] }] }, today), "lift-0");
  const html = area(workoutDraft([pulldown]), [...history, ...saved]);
  const [savedCard, openCard] = cardsOf(html);
  assert.match(savedCard, /Face Pull/);
  assert.doesNotMatch(savedCard, /aria-label="Remove/);
  assert.match(openCard, /aria-label="Remove Lat Pulldown"/);
});

test("End today's workout, Undo last entry and Discard this workout are in the widget, not above the box", () => {
  const draft = workoutDraft([pulldown]);
  const html = area(draft);
  const inside = widget(html);
  assert.match(inside, /<\/svg> End today&#x27;s workout<\/button>/);
  assert.match(inside, /<\/svg> Undo last entry<\/button>/);
  assert.match(inside, /<\/svg> Discard this workout<\/button>/);
  assert.match(inside, /It is not in your charts until you end the workout/);
  assert.doesNotMatch(button(inside, "end-session"), / disabled=""/);
  assert.match(button(inside, "undo-entry"), / disabled=""/, "nothing to undo after the first message");
  assert.doesNotMatch(html.slice(0, html.indexOf('data-testid="lift-bests"')), /end-session|undo-entry|discard-session/);
});

test("a day with nothing in it cannot be ended", () => {
  assert.match(button(widget(area(workoutDraft([{ name: "Seated Row", sets: [] }]))), "end-session"), / disabled=""/);
});

test("the plan check line shows when the routine is set, and the plan's progress is in the widget", () => {
  const plan = planFromRoutine({ ...emptyRoutine(), Pull: { exercises: "Lat Pulldown 3x8\nFace Pull 3x15\nSeated Row 3x10", notes: "" } });
  const html = area(workoutDraft([pulldown]), history, plan);
  assert.match(text(html.match(/<p data-testid="plan-check".*?<\/p>/)?.[0] ?? ""), /Pull plan: 1 of 3 done \u00b7 still to do: Face Pull, Seated Row/);
  assert.doesNotMatch(area(workoutDraft([pulldown])), /plan-check/);
});

test("a day that is not today is named by its date, and a day left open says so", () => {
  const draft = workoutDraft([pulldown], "2026-03-02");
  const html = area(draft);
  assert.match(html, /data-testid="bests-title"[^>]*>Mar 2 vs your bests</);
  assert.match(html, /This day is from Mar 2 and was never ended/);
  assert.match(html, /<\/svg> End Mar 2 workout<\/button>/);
  assert.match(area({ ...draft, summary: { ...draft.summary, exercises: [] } }), /Nothing in this day yet/);
});

test("a reopened saved day says so and is shown from the open copy, not twice", () => {
  const saved = workoutToLogEntries(normalizeWorkout({ date: today, workoutType: "Pull", exercises: [pulldown] }, today), "lift-1");
  const html = area(workoutDraft([{ name: "Lat Pulldown", sets: [{ weight: 100, reps: 10 }] }], today, true), [...history, ...saved]);
  assert.match(html, /Editing a saved day/);
  assert.match(html, /<\/svg> Save changes<\/button>/);
  assert.equal(cardsOf(html).length, 1);
  assert.match(html, /Top 100 lb/);
});

test("while a message is going in it says Updating, and the remove buttons are off", () => {
  const draft = workoutDraft([pulldown]);
  assert.match(alone(history, true), /data-testid="bests-updating"[^>]*>Updating\u2026</);
  assert.doesNotMatch(alone(), /bests-updating/);
  const parts: SessionParts = { draft, tag: null, meta: null, last: null, foods: null, foodCount: 1, planLine: null, locked: true, onRemove: () => {}, actions: null };
  const html = renderToStaticMarkup(createElement(LiftBests, { entries: history, today, parts, updating: true }));
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Remove Lat Pulldown"/);
});

test("the footnote explains the bars, the dashed line and the gold", () => {
  assert.match(text(area(workoutDraft([pulldown]))), /Each bar fills to that set\. The dashed line and faint fill are your best on any other day, and a set past it turns gold\. Volume is the set's weight times its reps\./);
});

const withWarmups = { name: "Lat Pulldown", kind: "weight", warmupSets: [{ weight: 60, reps: 12 }, { weight: 90, reps: 8 }], sets: [{ weight: 120, reps: 8 }, { weight: 130, reps: 5 }] };

test("warm-up sets show on the card apart from the working sets, in grey, with no best line", () => {
  const [card] = cardsOf(area(workoutDraft([withWarmups])));
  const warmups = card.match(/<li data-testid="lift-warmup".*?<\/li>/g) ?? [];
  assert.deepEqual(warmups.map((w) => text(w)), ["W1 60 lb \u00d7 12", "W2 90 lb \u00d7 8"]);
  for (const w of warmups) assert.doesNotMatch(w, /lift-best-line|lift-shadow|#FBBF24|#34D399/);
  assert.match(card, /Warm-up \u00b7 not counted toward bests/);
  assert.match(card, />Working sets</);
  assert.equal((card.match(/data-testid="lift-set"/g) ?? []).length, 2, "the working sets are still just the working sets");
  assert.ok(card.indexOf("lift-warmups") < card.indexOf('data-testid="lift-set"'), "warm-up first, as it is lifted");
  assert.doesNotMatch(text(card), /Warm-up: 60/, "no text line repeating them");
});

test("warm-up sets do not touch the card's top, its new-best flag or its summary", () => {
  const heavy = { ...withWarmups, warmupSets: [{ weight: 200, reps: 1 }] };
  const [card] = cardsOf(area(workoutDraft([heavy])));
  assert.match(card, /data-status="new"/);
  assert.equal(text(card.match(/<p[^>]*data-testid="lift-summary".*?<\/p>/)?.[0] ?? ""), "Top 130 lb \u00b7 New best!");
  assert.match(card.match(/<li[^>]*data-testid="lift-warmup".*?<\/li>/)![0], /width:100%/, "a heavy warm-up is capped at a full bar");
});

test("an exercise with only a warm-up says so, and a saved day's warm-up sets show too", () => {
  const [open] = cardsOf(area(workoutDraft([{ name: "Seated Row", kind: "weight", sets: [], warmupSets: [{ weight: 80, reps: 10 }] }])));
  assert.match(text(open), /Warm-up logged \u00b7 no working sets yet/);
  assert.match(text(open), /W1 80 lb \u00d7 10/);
  const saved = workoutToLogEntries(normalizeWorkout({ date: today, workoutType: "Pull", exercises: [withWarmups] }, today), "lift-0");
  const [card] = cardsOf(alone([...history, ...saved]));
  assert.equal((card.match(/data-testid="lift-warmup"/g) ?? []).length, 2);
});

test("an older warm-up written as text still shows as a text line", () => {
  const [card] = cardsOf(area(workoutDraft([{ name: "Lat Pulldown", kind: "weight", sets: [{ weight: 120, reps: 8 }], warmup: "usual warm-up" }])));
  assert.match(text(card), /Warm-up: usual warm-up/);
  assert.doesNotMatch(card, /data-testid="lift-warmups"/);
});

test("the card's footnote says warm-ups never count toward a best", () => {
  assert.match(text(area(workoutDraft([withWarmups]))), /Warm-up sets are shown apart, in grey, and never count toward a best\./);
});
