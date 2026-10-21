import test from "node:test";
import assert from "node:assert/strict";
import { bestOnOtherDays, liftCards, measureText, rowSets, setLabel, setMeasure, setsFromText } from "./fitness-bests";
import { normalizeWorkout, workoutToLogEntries, type WorkoutLogEntry } from "./fitness-log";

const row = (date: string, exercise: string, setsRaw: string, metric: WorkoutLogEntry["metric"], extra: Partial<WorkoutLogEntry> = {}): WorkoutLogEntry =>
  ({ date, workoutType: "Pull", exercise, setsRaw, metric, ...extra });

const history: WorkoutLogEntry[] = [
  row("2026-10-01", "Lat Pulldown", "110 lb: 8 / 8 / 7", { kind: "weight", value: 110 }),
  row("2026-10-08", "Lat Pulldown", "125 lb: 6 / 5 / 5", { kind: "weight", value: 125 }),
  row("2026-09-20", "Pull-Ups", "BW: 8 / 6 / 3", { kind: "reps", value: 8 }),
  row("2026-09-25", "Dead Hang", "BW: 50 sec", { kind: "time", value: 50 }),
  row("2026-10-02", "Cardio Run", "Incline 2; 7 mph; 8:47", null),
];

const DATE = "2026-10-15";
const exercises = (list: object[]) => normalizeWorkout({ date: DATE, workoutType: "Pull", exercises: list }, DATE, { keepEmpty: true }).exercises;
const pulldown = { name: "Lat Pulldown", kind: "weight", sets: [{ weight: 120, reps: 8 }, { weight: 125, reps: 6 }, { weight: 130, reps: 5 }], warmup: "60 lb x12" };
const cards = (list: object[], mode: "weight" | "volume" = "weight", entries = history) => liftCards({ entries, draft: { id: "lift-1", exercises: exercises(list) }, date: DATE, mode });

test("text rows are read into sets: weighted, bodyweight, timed, rough counts and each side", () => {
  assert.deepEqual(setsFromText("60 lb: 8 / 8 / 8"), [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 60, reps: 8 }]);
  assert.deepEqual(setsFromText("BW: 5 / 5 / 5").map((s) => [s.reps, s.bodyweight]), [[5, true], [5, true], [5, true]]);
  assert.deepEqual(setsFromText("BW: 50 sec"), [{ seconds: 50, bodyweight: true }]);
  assert.deepEqual(setsFromText("25 lb plate: 45 sec / 45 sec"), [{ seconds: 45, weight: 25 }, { seconds: 45, weight: 25 }]);
  assert.deepEqual(setsFromText("42.5 lb: ~15 / ~12").map((s) => [s.weight, s.reps, s.approx]), [[42.5, 15, true], [42.5, 12, true]]);
  assert.deepEqual(setsFromText("7.5 lb: 7 / 7 each side").map((s) => s.eachSide), [true, true]);
  assert.deepEqual(setsFromText("100 lb plates + bar: 12 / 12 / 8").map((s) => s.reps), [12, 12, 8]);
});

test("text that cannot be read gives no sets, and never breaks", () => {
  for (const text of ["", "Incline 2; 7 mph; 8:47", "70 lb DBs x5; 70 lb DBs x4; 65 lb DBs x6", "Working sets logged incompletely", "225 lb: ?"]) {
    assert.deepEqual(setsFromText(text), [], text);
  }
});

test("a row's sets are the exact ones when it was logged with AI, otherwise read from its text, otherwise its top number", () => {
  const exact = [{ weight: 100, reps: 5 }];
  assert.equal(rowSets(row("2026-10-01", "X", "999 lb: 1", null, { sets: exact })), exact);
  assert.deepEqual(rowSets(row("2026-10-01", "X", "50 lb: 10 / 9", { kind: "weight", value: 50 })).map((s) => s.reps), [10, 9]);
  assert.deepEqual(rowSets(row("2026-10-01", "X", "details unknown", { kind: "weight", value: 135 })), [{ weight: 135 }]);
  assert.deepEqual(rowSets(row("2026-10-01", "X", "details unknown", { kind: "reps", value: 12 })), [{ reps: 12, bodyweight: true }]);
  assert.deepEqual(rowSets(row("2026-10-01", "X", "details unknown", { kind: "time", value: 40 })), [{ seconds: 40, bodyweight: true }]);
  assert.deepEqual(rowSets(row("2026-10-01", "X", "details unknown", null)), []);
});

test("a bar is drawn to the weight, the set's volume, the reps or the seconds, depending on the lift", () => {
  const set = { weight: 120, reps: 8 };
  assert.equal(setMeasure(set, "weight", "weight"), 120);
  assert.equal(setMeasure(set, "weight", "volume"), 960);
  assert.equal(setMeasure({ weight: 20, reps: 10, eachSide: true }, "weight", "volume"), 400);
  assert.equal(setMeasure({ weight: 120 }, "weight", "volume"), 0, "no reps, no volume");
  assert.equal(setMeasure({ reps: 8, bodyweight: true }, "weight", "weight"), 0);
  assert.equal(setMeasure({ reps: 8, bodyweight: true }, "reps", "volume"), 8, "the mode does not change reps");
  assert.equal(setMeasure({ seconds: 45 }, "time", "volume"), 45);
});

test("each set is labelled with its numbers", () => {
  assert.equal(setLabel({ weight: 120, reps: 8 }, "weight", "weight"), "120 lb \u00d7 8");
  assert.equal(setLabel({ weight: 120, reps: 8 }, "weight", "volume"), "960 lb (120 \u00d7 8)");
  assert.equal(setLabel({ weight: 1000, reps: 10 }, "weight", "volume"), "10,000 lb (1,000 \u00d7 10)");
  assert.equal(setLabel({ weight: 120 }, "weight", "volume"), "\u2014");
  assert.equal(setLabel({ reps: 6, bodyweight: true }, "weight", "weight"), "BW \u00d7 6");
  assert.equal(setLabel({ weight: 45, reps: 10, approx: true, eachSide: true }, "weight", "weight"), "45 lb \u00d7 ~10 each side");
  assert.equal(setLabel({ reps: 8, bodyweight: true }, "reps", "weight"), "8 reps");
  assert.equal(setLabel({ reps: 1, bodyweight: true }, "reps", "weight"), "1 rep");
  assert.equal(setLabel({ seconds: 45, bodyweight: true }, "time", "weight"), "45 sec");
  assert.equal(setLabel({ seconds: 45, weight: 25 }, "time", "weight"), "25 lb \u00b7 45 sec");
  assert.equal(measureText(125, "weight"), "125 lb");
  assert.equal(measureText(1250.55, "weight"), "1,250.6 lb");
  assert.equal(measureText(9, "reps"), "9 reps");
  assert.equal(measureText(50, "time"), "50 sec");
});

test("the best is the highest on any other day, whatever the spelling of the lift, and never today's own sets", () => {
  assert.deepEqual(bestOnOtherDays(history, "Lat Pulldown", "weight", "weight", DATE), { value: 125, date: "2026-10-08" });
  assert.deepEqual(bestOnOtherDays(history, "lat pulldowns", "weight", "weight", DATE), { value: 125, date: "2026-10-08" });
  assert.deepEqual(bestOnOtherDays(history, "Lat Pulldown", "weight", "volume", DATE), { value: 880, date: "2026-10-01" }, "110 x 8 beats 125 x 6 for volume");
  const withToday = [...history, row(DATE, "Lat Pulldown", "200 lb: 5", { kind: "weight", value: 200 })];
  assert.equal(bestOnOtherDays(withToday, "Lat Pulldown", "weight", "weight", DATE)?.value, 125, "today is not another day");
  assert.equal(bestOnOtherDays(history, "Seated Row", "weight", "weight", DATE), null);
  assert.equal(bestOnOtherDays(history, "Lat Pulldown", "weight", "weight", "2026-10-08")?.value, 110, "an older day is measured against the rest, past and future");
});

test("a lift with sets today shows one bar per set against its best, with the top set and a new-best flag", () => {
  const [card] = cards([pulldown]);
  assert.equal(card.name, "Lat Pulldown");
  assert.deepEqual(card.sets.map((s) => [s.index, s.value, s.label, s.beatsBest]), [
    [1, 120, "120 lb \u00d7 8", false], [2, 125, "125 lb \u00d7 6", false], [3, 130, "130 lb \u00d7 5", true],
  ]);
  assert.deepEqual([card.best, card.bestDate, card.top, card.status], [125, "2026-10-08", 130, "new"]);
  assert.ok(Math.abs(card.scale - 130 * 1.08) < 1e-9, "a little over the longest bar so the best line is never at the very end");
  assert.equal(card.warmup, "60 lb x12");
  assert.equal(card.draftIndex, 0);
});

test("in volume mode the bars and the best are the set's weight times reps", () => {
  const [card] = cards([pulldown], "volume");
  assert.deepEqual(card.sets.map((s) => s.value), [960, 750, 650]);
  assert.deepEqual([card.best, card.bestDate, card.top, card.status], [880, "2026-10-01", 960, "new"]);
  assert.deepEqual(card.sets.map((s) => s.beatsBest), [true, false, false]);
});

test("a lift that has never been logged on another day is a first, with no best to compare with", () => {
  const [card] = cards([{ name: "Seated Cable Row", kind: "weight", sets: [{ weight: 100, reps: 10 }] }]);
  assert.deepEqual([card.best, card.bestDate, card.status], [null, null, "first"]);
  assert.equal(card.sets[0].beatsBest, false, "nothing to beat yet");
  assert.ok(Math.abs(card.scale - 100 * 1.08) < 1e-9);
});

test("a day that equals the best matches it, and one below it is below", () => {
  assert.equal(cards([{ name: "Lat Pulldown", kind: "weight", sets: [{ weight: 125, reps: 5 }] }])[0].status, "matched");
  const [below] = cards([{ name: "Lat Pulldown", kind: "weight", sets: [{ weight: 100, reps: 10 }] }]);
  assert.equal(below.status, "below");
  assert.ok(Math.abs(below.scale - 125 * 1.08) < 1e-9, "the best sets the scale when it is the longer");
});

test("an exercise with no sets yet is an empty card, kept for its warm-up and notes", () => {
  const [card] = cards([{ name: "Seated Row", sets: [], warmup: "80 lb x10", notes: "left shoulder tight" }]);
  assert.deepEqual([card.status, card.sets.length, card.top, card.scale], ["empty", 0, 0, 1]);
  assert.equal(card.warmup, "80 lb x10");
  assert.equal(card.notes, "left shoulder tight");
});

test("reps and held-for-time lifts are drawn to reps and seconds, in either mode", () => {
  const list = [{ name: "Pull-Ups", sets: [{ unit: "bw", reps: 9 }, { unit: "bw", reps: 7 }] }, { name: "Dead Hang", sets: [{ seconds: 45 }] }];
  for (const mode of ["weight", "volume"] as const) {
    const [pullUps, hang] = cards(list, mode);
    assert.deepEqual([pullUps.kind, pullUps.best, pullUps.top, pullUps.status], ["reps", 8, 9, "new"]);
    assert.deepEqual(pullUps.sets.map((s) => s.label), ["9 reps", "7 reps"]);
    assert.deepEqual([hang.kind, hang.best, hang.top, hang.status], ["time", 50, 45, "below"]);
  }
});

test("the day's saved rows come first, then the open day; a reopened day is shown from the open day alone", () => {
  const saved = workoutToLogEntries(normalizeWorkout({ date: DATE, workoutType: "Pull", exercises: [{ name: "Face Pull", sets: [{ weight: 40, reps: 15 }] }] }, DATE), "lift-0");
  const reopenedRows = workoutToLogEntries(normalizeWorkout({ date: DATE, workoutType: "Pull", exercises: [{ name: "Seated Row", sets: [{ weight: 90, reps: 10 }] }] }, DATE), "lift-1");
  const entries = [...history, ...saved, ...reopenedRows];
  const shown = liftCards({ entries, draft: { id: "lift-1", exercises: exercises([{ name: "Seated Row", sets: [{ weight: 100, reps: 10 }] }]) }, date: DATE, mode: "weight" });
  assert.deepEqual(shown.map((c) => [c.name, c.draftIndex, c.top]), [["Face Pull", null, 40], ["Seated Row", 0, 100]]);
  const none = liftCards({ entries, draft: null, date: DATE, mode: "weight" });
  assert.deepEqual(none.map((c) => [c.name, c.draftIndex]), [["Face Pull", null], ["Seated Row", null]], "with no day open, what was saved today");
  assert.deepEqual(liftCards({ entries: history, draft: null, date: DATE, mode: "weight" }), [], "nothing lifted today");
});

test("saved rows without exact sets are drawn from their text, so an older day still has bars", () => {
  const older = [...history, row("2026-10-12", "Pull-Ups", "BW: 5 / 5 / 5", { kind: "reps", value: 5 })];
  const shown = liftCards({ entries: older, draft: null, date: "2026-10-12", mode: "weight" });
  assert.deepEqual(shown.map((c) => [c.name, c.kind, c.sets.map((s) => s.value)]), [["Pull-Ups", "reps", [5, 5, 5]]]);
  assert.equal(shown[0].best, 8, "against the best of the other days");
});

const withWarmups = { name: "Lat Pulldown", kind: "weight", warmupSets: [{ weight: 60, reps: 12 }, { weight: 90, reps: 8 }], sets: [{ weight: 120, reps: 8 }, { weight: 130, reps: 5 }] };

test("warm-up sets get their own bars, apart from the working sets and in the same measure", () => {
  const [card] = cards([withWarmups]);
  assert.deepEqual(card.warmups.map((w) => [w.index, w.value, w.label]), [[1, 60, "60 lb \u00d7 12"], [2, 90, "90 lb \u00d7 8"]]);
  assert.deepEqual(card.sets.map((s) => s.value), [120, 130], "the working sets are only the working sets");
  const [volume] = cards([withWarmups], "volume");
  assert.deepEqual(volume.warmups.map((w) => w.value), [720, 720]);
  assert.equal(card.warmup, undefined, "no warm-up text beside the bars");
});

test("warm-up sets never change the top, the status or the scale, even when a warm-up is the heaviest thing lifted", () => {
  const plain = cards([{ ...withWarmups, warmupSets: [] }])[0];
  const heavy = cards([{ ...withWarmups, warmupSets: [{ weight: 200, reps: 1 }] }])[0];
  assert.deepEqual([heavy.top, heavy.status, heavy.scale, heavy.best], [plain.top, plain.status, plain.scale, plain.best]);
  assert.deepEqual(heavy.sets, plain.sets);
});

test("a best never comes from a warm-up set logged on another day", () => {
  const earlier = workoutToLogEntries(normalizeWorkout({ date: "2026-10-10", exercises: [{ name: "Lat Pulldown", kind: "weight", warmupSets: [{ weight: 300, reps: 5 }], sets: [{ weight: 100, reps: 8 }] }] }, "2026-10-10"), "lift-0");
  assert.equal(bestOnOtherDays([...history, ...earlier], "Lat Pulldown", "weight", "weight", DATE)?.value, 125);
  assert.deepEqual(bestOnOtherDays([...earlier], "Lat Pulldown", "weight", "weight", DATE), { value: 100, date: "2026-10-10" });
});

test("a saved day's card shows its warm-up sets, and an older row with only warm-up text keeps showing the text", () => {
  const saved = workoutToLogEntries(normalizeWorkout({ date: DATE, exercises: [withWarmups] }, DATE), "lift-1");
  const old = row(DATE, "Pull-Ups", "BW: 8 / 6 / 3", { kind: "reps", value: 8 }, { warmup: "BW x3 slow; BW x3 normal" });
  const [lat, pullUps] = liftCards({ entries: [...history, ...saved, old], date: DATE, mode: "weight" });
  assert.equal(lat.warmups.length, 2);
  assert.deepEqual([pullUps.warmups, pullUps.warmup], [[], "BW x3 slow; BW x3 normal"]);
});

test("an exercise with only warm-up sets is an empty card that still shows them, by weight", () => {
  const [card] = cards([{ name: "Seated Row", sets: [], warmupSets: [{ weight: 80, reps: 10 }] }]);
  assert.deepEqual([card.status, card.sets.length], ["empty", 0]);
  assert.deepEqual(card.warmups.map((w) => w.label), ["80 lb \u00d7 10"]);
});
