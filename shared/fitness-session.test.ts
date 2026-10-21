import test from "node:test";
import assert from "node:assert/strict";
import {
  addMealToDay, addWorkoutEntries, finishWorkout, formatSets, mealFromLogged, normalizeMeal, normalizeWorkout, rebuildMeal, removeExercise, removeFoodItem,
  removeMealEverywhere, removeWorkoutLogging, workoutFromEntries, workoutToLogEntries, type ParsedMeal, type ParsedWorkout,
} from "./fitness-log";
import {
  MAX_DRAFT_MESSAGES, adoptNewerDraft, MAX_UNDO_STEPS, addEntry, canUndo, describeMealChange, describeWorkoutChange, endButtonLabel, isMealSummary, isStaleDraft, isWorkoutSummary,
  mealHasContent, newDraft, parseDraft, recentMessages, setDraftDate, undoEntry, workoutHasContent,
} from "./fitness-session";

const TODAY = "2026-10-13";
const t = (minutes: number) => new Date(Date.UTC(2026, 9, 13, 12, minutes));

const pull = (extra: Partial<ParsedWorkout> = {}): ParsedWorkout => ({
  date: TODAY, workoutType: "Pull",
  exercises: [{ name: "Lat Pulldown", workoutType: "Pull", kind: "weight", sets: [], warmup: "60 lb x12" }], ...extra,
});
const withSets = (workout: ParsedWorkout, sets: ParsedWorkout["exercises"][number]["sets"]): ParsedWorkout =>
  ({ ...workout, exercises: [{ ...workout.exercises[0], sets }, ...workout.exercises.slice(1)] });

// ── An exercise with no sets yet ────────────────────────────────────────────
test("an exercise that has only been named, or has only a warm-up, is kept while a day is being built", () => {
  const raw = { date: TODAY, exercises: [{ name: "Lat Pulldown", kind: "weight", sets: [], warmup: "60 for 12" }, { name: "Seated Row" }] };
  assert.throws(() => normalizeWorkout(raw, TODAY), /No exercises/);
  const kept = normalizeWorkout(raw, TODAY, { keepEmpty: true });
  assert.deepEqual(kept.exercises.map((e) => [e.name, e.kind, e.sets.length, e.workoutType]), [["Lat Pulldown", "weight", 0, "Pull"], ["Seated Row", "reps", 0, "Pull"]]);
  assert.equal(kept.exercises[0].warmup, "60 for 12");
  assert.equal(kept.workoutType, "Pull");
});

test("the kind is worked out from the sets once there are some, and an empty answer is still an error", () => {
  const kept = normalizeWorkout({ date: TODAY, exercises: [{ name: "Plank", kind: "weight", sets: [{ seconds: 45 }] }] }, TODAY, { keepEmpty: true });
  assert.equal(kept.exercises[0].kind, "time");
  assert.throws(() => normalizeWorkout({ date: TODAY, exercises: [] }, TODAY, { keepEmpty: true }), /No exercises/);
  assert.throws(() => normalizeWorkout({ date: TODAY, exercises: [{ name: "  " }] }, TODAY, { keepEmpty: true }), /No exercises/);
});

test("a set-less exercise reads as warm-up only, notes only, or no sets yet", () => {
  assert.equal(formatSets({ sets: [], warmup: "60 lb x12" }), "Warm-up only");
  assert.equal(formatSets({ sets: [], warmup: "60 lb x12", notes: "felt tight" }), "Notes only");
  assert.equal(formatSets({ sets: [] }), "No sets yet");
  assert.equal(formatSets({ sets: [{ weight: 120, reps: 8 }], warmup: "x" }), "120 lb: 8");
});

test("ending a day leaves out exercises that never got a set, warm-up or note, and removing one by hand works", () => {
  const w: ParsedWorkout = { ...pull(), exercises: [...pull().exercises, { name: "Seated Row", workoutType: "Pull", kind: "reps", sets: [] }] };
  assert.deepEqual(finishWorkout(w).exercises.map((e) => e.name), ["Lat Pulldown"]);
  assert.deepEqual(removeExercise(w, 0).exercises.map((e) => e.name), ["Seated Row"]);
  assert.equal(removeExercise(w, 5).exercises.length, 2, "an index that is not there changes nothing");
  assert.equal(workoutHasContent({ ...w, exercises: [w.exercises[1]] }), false);
  assert.equal(workoutHasContent(w), true);
});

// ── Reopening a saved workout ───────────────────────────────────────────────
test("a saved workout comes back exactly as it was saved, ready to edit", () => {
  const original: ParsedWorkout = {
    date: "2026-10-09", workoutType: "Pull",
    exercises: [
      { name: "Lat Pulldown", workoutType: "Pull", kind: "weight", sets: [{ weight: 120, reps: 8 }, { weight: 120, reps: 7, note: "slow" }], warmup: "60 lb x12", notes: "felt strong" },
      { name: "Pull-Ups", workoutType: "Pull", kind: "reps", sets: [{ reps: 5, bodyweight: true }, { reps: 5, bodyweight: true }] },
      { name: "Weighted Plank", workoutType: "Pull", kind: "time", sets: [{ weight: 25, seconds: 50 }] },
    ],
  };
  const log = [{ date: "2026-10-01", workoutType: "Push" as const, exercise: "Bench", setsRaw: "x", metric: null }, ...workoutToLogEntries(original, "lift-1")];
  assert.deepEqual(workoutFromEntries(log, "lift-1"), original);
});

test("set notes are not copied into the exercise's notes when a workout is reopened and saved again", () => {
  const w: ParsedWorkout = { date: TODAY, workoutType: "Push", exercises: [{ name: "Bench", workoutType: "Push", kind: "weight", sets: [{ weight: 100, reps: 5, note: "grindy" }] }] };
  let log = workoutToLogEntries(w, "a");
  for (let i = 0; i < 3; i++) log = workoutToLogEntries(workoutFromEntries(log, "a")!, "a");
  assert.equal(log[0].notes, "grindy");
  assert.equal(workoutFromEntries(log, "a")!.exercises[0].notes, undefined);
});

test("rows that were not logged with AI cannot be reopened, and an unknown id gives nothing", () => {
  const old = { date: "2026-10-01", workoutType: "Push" as const, exercise: "Bench", setsRaw: "100 lb: 5", metric: null, logId: "x" };
  assert.equal(workoutFromEntries([old], "x"), null);
  assert.equal(workoutFromEntries([old], "nope"), null);
});

test("ending a reopened workout replaces its rows, wherever they were, and leaves other days alone", () => {
  const first = workoutToLogEntries(withSets(pull(), [{ weight: 120, reps: 8 }]), "lift-1");
  const other = workoutToLogEntries({ ...withSets(pull(), [{ weight: 100, reps: 5 }]), date: "2026-10-10" }, "lift-2");
  const log = addWorkoutEntries(addWorkoutEntries([], first), other);
  const edited = withSets(workoutFromEntries(log, "lift-1")!, [{ weight: 120, reps: 8 }, { weight: 125, reps: 6 }]);
  const next = addWorkoutEntries(removeWorkoutLogging(log, "lift-1"), workoutToLogEntries(edited, "lift-1"));
  assert.equal(next.filter((e) => e.logId === "lift-1").length, 1, "no second copy");
  assert.equal(next.find((e) => e.logId === "lift-1")!.setsRaw, "120 lb: 8; 125 lb: 6");
  assert.equal(next.filter((e) => e.logId === "lift-2").length, 1);
});

// ── Food ────────────────────────────────────────────────────────────────────
const meal = (): ParsedMeal => normalizeMeal({ date: TODAY, items: [
  { name: "egg", quantity: "2", confidence: "high", calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: "toast", confidence: "low", calories: 90, protein: 3, carbs: 17, fat: 1 },
] }, TODAY);

test("removing a food item by hand takes its numbers off, and removing the last one leaves an empty list", () => {
  const less = removeFoodItem(meal(), 0);
  assert.deepEqual(less.items.map((i) => i.name), ["toast"]);
  assert.equal(less.totals.calories, 90);
  assert.equal(less.description, "toast");
  assert.equal(less.confidence, "low");
  const none = removeFoodItem(less, 0);
  assert.equal(none.items.length, 0);
  assert.equal(none.totals.calories, 0);
  assert.equal(none.description, "");
  assert.equal(mealHasContent(none), false);
  assert.equal(mealHasContent(meal()), true);
});

test("rebuilding a meal never trusts the old totals", () => {
  const stale = { ...meal(), totals: { ...meal().totals, calories: 9999 } };
  assert.equal(rebuildMeal(stale, stale.items).totals.calories, 230);
});

test("a saved meal comes back as an editable meal, and saving it again replaces it, even on another day", () => {
  let days = addMealToDay([], { ...meal(), dayComplete: true }, "meal-1", "2026-10-13T12:00:00Z", "two eggs and toast");
  days = addMealToDay(days, rebuildMeal({ ...meal(), date: "2026-10-12" }, [meal().items[0]]), "meal-0", "2026-10-12T12:00:00Z", "eggs");
  const logged = days.find((d) => d.date === TODAY)!.meals![0];
  const editable = mealFromLogged({ date: TODAY }, logged);
  assert.equal(editable.date, TODAY);
  assert.equal(editable.totals.calories, 230);
  assert.equal(editable.items.length, 2);
  assert.notEqual(editable.items[0], logged.items[0], "editing does not touch the saved copy");

  const moved = { ...removeFoodItem(editable, 1), date: "2026-10-11" };
  const next = addMealToDay(removeMealEverywhere(days, "meal-1"), moved, "meal-1", "2026-10-13T13:00:00Z", "two eggs");
  assert.equal(next.find((d) => d.date === TODAY), undefined, "the old day is gone because it held only that meal");
  assert.equal(next.find((d) => d.date === "2026-10-11")!.calories, 140);
  assert.equal(next.find((d) => d.date === "2026-10-12")!.calories, 140, "other days are untouched");
  assert.equal(next.flatMap((d) => d.meals ?? []).filter((m) => m.id === "meal-1").length, 1);
  assert.deepEqual(removeMealEverywhere(next, "unknown"), next);
});

test("two sessions on one day add up, and ending a day again does not double count", () => {
  let days = addMealToDay([], meal(), "meal-1", "2026-10-13T08:00:00Z", "breakfast");
  days = addMealToDay(days, rebuildMeal(meal(), [meal().items[1]]), "meal-2", "2026-10-13T18:00:00Z", "toast later");
  assert.equal(days[0].calories, 320);
  days = addMealToDay(removeMealEverywhere(days, "meal-1"), meal(), "meal-1", "2026-10-13T19:00:00Z", "breakfast");
  assert.equal(days[0].calories, 320);
  assert.equal(days[0].meals!.length, 2);
});

// ── The draft ───────────────────────────────────────────────────────────────
test("a draft starts from the first message, and each message adds a step that can be undone", () => {
  const first = newDraft("lift-1", t(0), "lat pulldown, warm-up 60 for 12", pull());
  assert.deepEqual([first.id, first.date, first.messages.length, first.undo.length, first.reopened], ["lift-1", TODAY, 1, 0, undefined]);
  assert.equal(canUndo(first), false);

  const second = addEntry(first, t(1), "120 for 8", withSets(pull(), [{ weight: 120, reps: 8 }]));
  assert.equal(second.messages.length, 2);
  assert.equal(second.updatedAt, t(1).toISOString());
  assert.equal(second.startedAt, t(0).toISOString());
  assert.equal(canUndo(second), true);

  const back = undoEntry(second, t(2));
  assert.deepEqual(back.summary, first.summary);
  assert.deepEqual(back.messages, first.messages);
  assert.equal(back.undo.length, 0);
  assert.equal(undoEntry(back, t(3)), back, "nothing left to undo");
});

test("a hand edit can be undone without losing a message, and undoing a message takes it out of the history sent to the AI", () => {
  const a = newDraft("d", t(0), "first", pull());
  const b = addEntry(a, t(1), "120 for 8", withSets(pull(), [{ weight: 120, reps: 8 }]));
  const c = addEntry(b, t(2), null, removeExercise(b.summary, 0));
  assert.equal(c.messages.length, 2, "a hand edit adds no message");
  const d = undoEntry(c, t(3));
  assert.equal(d.messages.length, 2);
  assert.equal(d.summary.exercises.length, 1);
  const e = undoEntry(d, t(4));
  assert.deepEqual(e.messages, ["first"]);
});

test("the history is limited so a long day stays small", () => {
  let draft = newDraft("d", t(0), "m0", pull());
  for (let i = 1; i <= MAX_DRAFT_MESSAGES + 10; i++) draft = addEntry(draft, t(1), `m${i}`, withSets(pull(), [{ reps: i }]));
  assert.equal(draft.messages.length, MAX_DRAFT_MESSAGES);
  assert.equal(draft.messages[draft.messages.length - 1], `m${MAX_DRAFT_MESSAGES + 10}`);
  assert.equal(draft.undo.length, MAX_UNDO_STEPS);
  assert.deepEqual(recentMessages(draft, 3), [`m${MAX_DRAFT_MESSAGES + 8}`, `m${MAX_DRAFT_MESSAGES + 9}`, `m${MAX_DRAFT_MESSAGES + 10}`]);
});

test("moving a day to another date changes the draft and can be undone; a bad or same date does nothing", () => {
  const draft = newDraft("d", t(0), "x", pull());
  const moved = setDraftDate(draft, t(1), "2026-10-11");
  assert.equal(moved.date, "2026-10-11");
  assert.equal(moved.summary.date, "2026-10-11");
  assert.equal(moved.messages.length, 1, "no message is added");
  assert.equal(undoEntry(moved, t(2)).date, TODAY);
  assert.equal(setDraftDate(draft, t(1), "yesterday"), draft);
  assert.equal(setDraftDate(draft, t(1), "2026-02-30"), draft);
  assert.equal(setDraftDate(draft, t(1), TODAY), draft);
});

test("a day left open from an earlier date is noticed, but a reopened saved day is not", () => {
  const draft = newDraft("d", t(0), "x", pull({ date: "2026-10-11" }));
  assert.equal(isStaleDraft(draft, TODAY), true);
  assert.equal(isStaleDraft(newDraft("d", t(0), "x", pull()), TODAY), false);
  assert.equal(isStaleDraft(newDraft("d", t(0), null, pull({ date: "2026-10-11" }), true), TODAY), false);
  assert.equal(newDraft("d", t(0), null, pull(), true).messages.length, 0);
});

test("the end button says what it will do", () => {
  const draft = newDraft("d", t(0), "x", pull());
  assert.equal(endButtonLabel("workout", draft, TODAY, "Oct 13"), "End today's workout");
  assert.equal(endButtonLabel("meal", draft, TODAY, "Oct 13"), "End day");
  assert.equal(endButtonLabel("workout", draft, "2026-10-14", "Oct 13"), "End Oct 13 workout");
  assert.equal(endButtonLabel("meal", draft, "2026-10-14", "Oct 13"), "End Oct 13");
  assert.equal(endButtonLabel("workout", newDraft("d", t(0), null, pull(), true), TODAY, "Oct 13"), "Save changes");
});

// ── Saved drafts ────────────────────────────────────────────────────────────
test("a draft survives being saved and read back, including its undo steps", () => {
  const draft = addEntry(newDraft("lift-1", t(0), "first", pull()), t(1), "120 for 8", withSets(pull(), [{ weight: 120, reps: 8 }]));
  const back = parseDraft(JSON.stringify(draft), isWorkoutSummary)!;
  assert.deepEqual(back, draft);
  const meals = addEntry(newDraft("meal-1", t(0), "eggs", meal()), t(1), "toast", meal());
  assert.deepEqual(parseDraft(JSON.stringify(meals), isMealSummary), meals);
});

test("anything stored that is not a proper draft is ignored instead of breaking the page", () => {
  const good = JSON.parse(JSON.stringify(newDraft("lift-1", t(0), "first", pull())));
  const bad: unknown[] = [
    null, "", "not json", "[]", "42", {}, { ...good, id: "" }, { ...good, id: 7 }, { ...good, date: "yesterday" }, { ...good, summary: null },
    { ...good, summary: { date: TODAY, exercises: "x" } }, { ...good, summary: { ...good.summary, date: "2026-01-01" } }, { ...good, messages: [1] }, { ...good, messages: "x" },
  ];
  for (const value of bad) assert.equal(parseDraft(typeof value === "string" ? value : JSON.stringify(value), isWorkoutSummary), null, JSON.stringify(value));
  assert.equal(parseDraft(null, isWorkoutSummary), null);
  assert.equal(parseDraft(JSON.stringify(good), isMealSummary), null, "a workout draft is not a food draft");
});

test("a draft with damaged extras is repaired rather than dropped", () => {
  const good = JSON.parse(JSON.stringify(newDraft("lift-1", t(0), "first", pull())));
  const back = parseDraft(JSON.stringify({ ...good, undo: [{ summary: null, hadMessage: true }, { summary: good.summary, hadMessage: "yes" }, { summary: good.summary, hadMessage: false }], startedAt: 5 }), isWorkoutSummary)!;
  assert.equal(back.undo.length, 1);
  assert.equal(back.startedAt, new Date(0).toISOString());
  assert.equal(parseDraft(JSON.stringify({ ...good, undo: "x" }), isWorkoutSummary)!.undo.length, 0);
});

// ── What a message changed ──────────────────────────────────────────────────
test("a new exercise, new sets, a corrected set, a warm-up and a note are each described in plain words", () => {
  const start = pull();
  assert.deepEqual(describeWorkoutChange(null, start), ["Added Lat Pulldown: warm-up 60 lb x12"]);

  const one = withSets(start, [{ weight: 120, reps: 8 }]);
  assert.deepEqual(describeWorkoutChange(start, one), ["Lat Pulldown: added 120 lb: 8"]);

  const two = withSets(start, [{ weight: 120, reps: 8 }, { weight: 120, reps: 7 }, { weight: 115, reps: 8 }]);
  assert.deepEqual(describeWorkoutChange(one, two), ["Lat Pulldown: added 120 lb: 7; 115 lb: 8"]);

  const fixed = withSets(start, [{ weight: 120, reps: 9 }]);
  assert.deepEqual(describeWorkoutChange(one, fixed), ["Lat Pulldown: sets now 120 lb: 9"]);

  const warm = { ...one, exercises: [{ ...one.exercises[0], warmup: "50 lb x12", notes: "felt strong" }] };
  assert.deepEqual(describeWorkoutChange(one, warm), ["Lat Pulldown: warm-up 50 lb x12; note: felt strong"]);

  const next = { ...one, exercises: [...one.exercises, { name: "Seated Row", workoutType: "Pull" as const, kind: "weight" as const, sets: [], warmup: "80 lb x10" }] };
  assert.deepEqual(describeWorkoutChange(one, next), ["Added Seated Row: warm-up 80 lb x10"]);
});

test("a removed exercise, a changed day, and no change at all", () => {
  const one = withSets(pull(), [{ weight: 120, reps: 8 }]);
  assert.deepEqual(describeWorkoutChange(one, { ...one, exercises: [] }), ["Removed Lat Pulldown"]);
  assert.deepEqual(describeWorkoutChange(one, { ...one, date: "2026-10-12" }), ["Day changed to 2026-10-12"]);
  assert.deepEqual(describeWorkoutChange(one, one), []);
  assert.deepEqual(describeWorkoutChange(one, { ...one, exercises: [{ ...one.exercises[0], name: "lat pulldown" }] }), [], "the same exercise in another case is not new");
});

test("food added, re-estimated and removed is described", () => {
  const base = meal();
  assert.deepEqual(describeMealChange(null, base), ["Added 2 egg (140 kcal)", "Added toast (90 kcal)"]);
  const latte = { name: "latte", quantity: "12 oz", confidence: "high" as const, calories: 150, protein: 8, carbs: 12, fat: 8 };
  const more = rebuildMeal(base, [...base.items, { ...base.items[0], ...latte }]);
  assert.deepEqual(describeMealChange(base, more), ["Added 12 oz latte (150 kcal)"]);
  assert.deepEqual(describeMealChange(base, base), []);

  const bigger = rebuildMeal(base, [{ ...base.items[0], calories: 1400 }, base.items[1]]);
  assert.deepEqual(describeMealChange(base, bigger), ["Updated 2 egg: 140 kcal to 1,400 kcal"]);

  assert.deepEqual(describeMealChange(base, removeFoodItem(base, 1)), ["Removed toast"]);
  assert.deepEqual(describeMealChange(base, { ...base, date: "2026-10-12" }), ["Day changed to 2026-10-12"]);
});

test("two identical foods are told apart by count", () => {
  const base = meal();
  const twice = rebuildMeal(base, [...base.items, base.items[1]]);
  assert.deepEqual(describeMealChange(base, twice), ["Added toast (90 kcal)"]);
  assert.deepEqual(describeMealChange(twice, base), ["Removed toast"]);
});

test("summaries from storage are checked for the parts the page uses", () => {
  assert.equal(isWorkoutSummary(pull()), true);
  assert.equal(isWorkoutSummary({ date: TODAY, exercises: [{ name: 1, sets: [] }] }), false);
  assert.equal(isWorkoutSummary({ date: TODAY, exercises: [{ name: "x" }] }), false);
  assert.equal(isWorkoutSummary(null), false);
  assert.equal(isMealSummary(meal()), true);
  assert.equal(isMealSummary({ ...meal(), totals: null }), false);
  assert.equal(isMealSummary({ ...meal(), items: [null] }), false);
  assert.equal(isMealSummary("x"), false);
});

test("a newer copy of the open day from another device is taken, but never an older or different one, and never one that was just ended", () => {
  const mine = addEntry(newDraft("lift-1", t(0), "first", pull()), t(5), "120 for 8", withSets(pull(), [{ weight: 120, reps: 8 }]));
  const phone = addEntry(mine, t(9), "120 for 7", withSets(pull(), [{ weight: 120, reps: 8 }, { weight: 120, reps: 7 }]));
  assert.equal(adoptNewerDraft(mine, phone), phone);
  assert.equal(adoptNewerDraft(phone, mine), phone, "an older copy arriving late changes nothing");
  assert.equal(adoptNewerDraft(mine, mine), mine);
  assert.equal(adoptNewerDraft(mine, { ...phone, id: "lift-2" }), mine, "another day is not swapped in");
  assert.equal(adoptNewerDraft(null, phone), null, "a day that was just ended does not come back");
  assert.equal(adoptNewerDraft(mine, null), mine);
});

test("a warm-up set added later is described by itself, and a draft with a damaged warm-up list is ignored", () => {
  const one: ParsedWorkout = { ...pull(), exercises: [{ ...pull().exercises[0], warmupSets: [{ weight: 60, reps: 12 }], warmup: "60 lb x12" }] };
  const two: ParsedWorkout = { ...one, exercises: [{ ...one.exercises[0], warmupSets: [{ weight: 60, reps: 12 }, { weight: 90, reps: 8 }], warmup: "60 lb x12; 90 lb x8" }] };
  assert.deepEqual(describeWorkoutChange(one, two), ["Lat Pulldown: added warm-up 90 lb x8"]);
  const fixed: ParsedWorkout = { ...one, exercises: [{ ...one.exercises[0], warmupSets: [{ weight: 50, reps: 12 }], warmup: "50 lb x12" }] };
  assert.deepEqual(describeWorkoutChange(one, fixed), ["Lat Pulldown: warm-up 50 lb x12"]);
  assert.deepEqual(describeWorkoutChange(null, one), ["Added Lat Pulldown: warm-up 60 lb x12"]);
  assert.equal(isWorkoutSummary(one), true);
  assert.equal(isWorkoutSummary({ ...one, exercises: [{ ...one.exercises[0], warmupSets: "x" }] }), false);
});
