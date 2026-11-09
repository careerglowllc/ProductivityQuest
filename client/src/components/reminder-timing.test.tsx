import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { REMINDER_MODE_COPY, ReminderTimingPicker } from "./reminder-timing";
import { TodaysReminders } from "./todays-reminders";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const pressed = (html: string, mode: string) => new RegExp(`data-reminder-mode="${mode}" aria-pressed="true"`).test(html);

test("the timing picker offers Ongoing and On a date, and says what each does to the date", () => {
  const html = renderToStaticMarkup(<ReminderTimingPicker value="on-date" onChange={() => {}} />);
  assert.match(html, /role="group" aria-label="Reminder timing"/);
  assert.ok(html.includes(">Ongoing<") && html.includes(">On a date<"));
  assert.ok(pressed(html, "on-date") && !pressed(html, "always"));
  assert.ok(html.includes(REMINDER_MODE_COPY["on-date"].dateRule), "explains it keeps its date");
  assert.match(REMINDER_MODE_COPY["on-date"].dateRule, /never moved to today/);
  assert.match(REMINDER_MODE_COPY.always.dateRule, /moves to today/);
});

test("blank or unknown timing reads as Ongoing, which is what every existing reminder is", () => {
  for (const value of [null, undefined, "", "birthday"]) {
    const html = renderToStaticMarkup(<ReminderTimingPicker value={value} onChange={() => {}} />);
    assert.ok(pressed(html, "always") && !pressed(html, "on-date"), String(value));
    assert.ok(html.includes(REMINDER_MODE_COPY.always.dateRule));
  }
});

test("the dashboard's reminders: a reminder on a date only the day before and on the day, labelled, and first", () => {
  const now = new Date(2026, 10, 9, 9, 0); // Nov 9, 9 AM local
  const stored = (day: number) => new Date(Date.UTC(2026, 10, day)).toISOString();
  const html = renderToStaticMarkup(
    <Router ssrPath="/">
      <TodaysReminders now={now} tasks={[
        { id: 1, title: "Good Posture", questType: "reminder" },
        { id: 2, title: "Call Mom (birthday)", questType: "reminder", reminderMode: "on-date", dueDate: stored(10) },
        { id: 3, title: "Anniversary", questType: "reminder", reminderMode: "on-date", dueDate: stored(20) },
        { id: 4, title: "Dentist", questType: "reminder", reminderMode: "on-date", dueDate: stored(9) },
      ]} />
    </Router>,
  );
  assert.ok(!html.includes("Anniversary"), "not until the day before");
  assert.ok(html.indexOf("Dentist") < html.indexOf("Call Mom") && html.indexOf("Call Mom") < html.indexOf("Good Posture"), "today, then tomorrow, then ongoing");
  assert.match(html, /Dentist<\/span><span data-testid="reminder-day-label"[^>]*>Today</);
  assert.match(html, /Call Mom \(birthday\)<\/span><span data-testid="reminder-day-label"[^>]*>Tomorrow</);
  assert.equal((html.match(/data-testid="reminder-day-label"/g) ?? []).length, 2, "no label on an ongoing reminder");
});

test("creating a reminder: choose the timing, and on a date the date is required, the start date goes, and a yearly repeat is one tap", () => {
  const create = read("./add-task-modal.tsx");
  assert.ok(create.includes('{questType === "reminder" && (') && create.includes("<ReminderTimingPicker value={reminderMode} onChange={setReminderMode} />"));
  assert.ok(create.includes('const dateReminder = questType === "reminder" && reminderMode === "on-date";'));
  assert.ok(create.includes("{!dateReminder && (\n            <QuestDateField\n              testId=\"start-date-field\""), "no start date for a reminder on a date");
  assert.ok(create.includes('label={dateReminder ? "Date" : "Due Date"}') && create.includes('required={questType === "deadline" || dateReminder}'));
  assert.ok(create.includes('data-testid="repeat-every-year"') && create.includes('onClick={() => setRecurType("yearly")}'));
  assert.ok(create.includes("reminderMode: savedReminderMode,") && create.includes('const savedReminderMode = questType === "reminder" ? reminderMode : null;'), "other quests save none");
  assert.ok(create.includes("dueDate: dueDate ? (dateReminder ? storedDay(dueDate) : dueDate.toISOString()) : null,"), "stored as the calendar day picked");
  assert.ok(create.includes("setReminderMode(DEFAULT_REMINDER_MODE);"), "reset for the next quest");
  assert.ok(create.includes("A reminder on a date needs that date, like the birthday it is for."));
});

test("editing a reminder: change the timing, which needs the date first, and see the two days it shows", () => {
  const modal = read("./task-detail-modal.tsx");
  assert.ok(modal.includes("{displayedQuestType === 'reminder' && (") && modal.includes('data-testid="reminder-timing-card"'));
  assert.ok(modal.includes("if (mode === 'on-date' && !task.dueDate) {") && modal.includes('title: "Set the date first"'));
  assert.ok(modal.includes("body: JSON.stringify({ reminderMode: mode, ...(mode === 'on-date' && task.startDate ? { startDate: null } : {}) })"), "a start date it had goes in the same save");
  assert.ok(modal.includes("{!dateReminder && (\n            <div className={`bg-slate-800/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'} border border-yellow-600/20`} data-testid=\"start-date-card\">"));
  assert.ok(modal.includes("{dateReminder ? 'Date' : 'Due Date'}"));
  assert.ok(modal.includes('data-testid="date-reminder-shows"') && modal.includes("dateReminderShowRange(task.dueDate)"));
});

test("the Smart Focus strip uses the same rule and label, and Overdue to Today leaves a reminder on a date alone", () => {
  const home = read("../pages/home.tsx");
  assert.ok(home.includes("reminderShowsToday(task, reminderNow)") && home.includes("), reminderNow)\n    : [];"), "filtered and sorted by the window");
  assert.ok(home.includes("{dateReminderLabel(task, reminderNow) && ("));
  assert.ok(home.includes("if (t.completed || t.recycled || !t.dueDate || isDateReminder(t)) return false;"));
});
