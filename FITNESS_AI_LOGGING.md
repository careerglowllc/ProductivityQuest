# AI Fitness Logging

Type or speak into a chat-style box on the **Lifting** and **Calories** pages. The first message starts the day. Every
message after it updates the same summary, which is saved after each one. When you press the End button the day goes
into the same logs the charts already read.

## Using it

| Page | First message | Then | End button |
| --- | --- | --- | --- |
| `/fitness/lifting` | "Pull day. First up is lat pulldown, warm-up 60 for 12." | "120 for 8", "120 for 7", "next exercise seated row, warm-up 80 for 10", "100 for 10 then 100 for 9", "the last pulldown set was actually 9 reps" | **End today's workout** |
| `/fitness/calories` | "An everything bagel with cream cheese and a latte" | "a chicken burrito bowl for lunch", "the latte was oat milk", "I didn't eat the bagel" | **End day** |

1. Type in the box. It is written text only; there is no microphone button.
2. Press Enter (or the send arrow). Shift+Enter adds a new line where the keyboard has it; a phone keyboard shows a
   Send key. The message is shown as sent at once and the box empties, ready for the next one (see "Sending while
   earlier messages are still going in" below).
3. The day so far appears. On Lifting, **Today vs your bests**, right under the text box, shows every exercise with a
   bar for each set against your personal best. On Calories, **Today vs your goals**, right under the text box, shows
   bars that move with every message and a fold-away **Foods logged** list that shows each
   food with calories, protein, carbs, fat, calcium, sugar and fiber. There is no separate summary box above the text
   box on either page. A "Last entry" line says what the message changed.
4. Keep sending. The AI is given the day so far and your earlier messages, so "120 for 8" means a set of the exercise
   you are on, "same again" repeats the last set, and "actually the latte was oat milk" corrects only the latte.
5. Every change is saved at once ("Saved automatically at ..."). Close the page and come back, or open it on another
   device, and the open day is still there.
6. Press the End button when you are done. The day is written to the charts, the open day closes (its controls go
   away), and the next
   message starts a new day. A toast offers **Edit again**.

While a day is open it is **not in the charts yet**. The box says so.

In Today vs your bests (Lifting) or Today vs your goals (Calories) you can also:

- **Undo last entry** (up to five steps back, including the message that caused it).
- Remove a single exercise or food with the x beside it.
- Change the **Day** with the date field (not into the future).
- **Discard** the open day.

### Sending while earlier messages are still going in

Pressing Enter sends at once. The box empties and can be typed in again straight away, and the message appears under
the box as "Adding it now…". Anything sent while it is still working waits its turn ("Waiting its turn"). The AI is asked
about one message at a time, in the order typed, because each answer is the whole updated day and the next message has
to build on it. When a message finishes, the day is saved and the bars, foods and charts update; Today vs your goals (and
the Lifting widget) say "Updating…" while anything is still going in.

- While a message is going in, **Undo**, **End**, **Discard**, the Day field and the remove buttons are switched off, so
  the day cannot be changed underneath it.
- A message that fails (no connection, the AI found nothing to add, a busy server, or the day was changed on another
  device while it was thinking) stays in the list with the reason. The messages behind it wait, so nothing goes in out of
  order. Use the arrow to try again, the pencil to put the text back in the box to edit it, or the x to drop it; the rest
  then carry on.
- At most 10 messages wait at once; the send arrow is off until some have gone in.
- The waiting list lives in the page. Reloading or closing it with messages still waiting asks first, because the ones
  that are not in the day yet would be lost.

### Page layout

**Calories, on a phone**, is laid out for logging first:

1. The title, kept small.
2. A very thin **Today** row: today's running totals (calories and macros with a hairline toward the 2,400 kcal
   goal), or a dashed placeholder ("Nothing logged yet") when there is nothing. It counts the open day too, so it
   changes with every message, and a pulsing dot says the day is still open.
3. The entry box, with no heading or explanation above it.
4. **Today vs your goals** (below), right under the entry box. It is always there, and the open day's controls live in it.
5. A collapsible **Stats** widget, open by default: this week's tiles, a seven-day bar chart with the goal line,
   highlights (streak, best protein day and the change from last week), the weekly log (today first) and an all-time
   line. While it is collapsed, one line of the week is shown instead. Tapping the header opens or collapses it.
   The choice is saved on the account (`workout-stats-open-v1`, `calories-stats-open-v1`), so it is the same after
   logging out and in, and on another device.

The big count cards that used to sit above the entry box are shown on larger screens only; their all-time numbers are
the last line of the Stats widget. On larger screens the order is the count cards, the entry box, Today vs your goals,
Logged with AI, then the charts.

### Today vs your goals (Calories page)

Right under the entry box, always there, one bar for each of the day's calories, protein, carbs, fat, fiber, calcium and
vitamins A, C and D. Each bar shows the percent of its goal and the amounts, for example "Protein 55%" over "82 of 150 g ·
68 to go". It is the live summary of the day being logged: it counts the food still being logged, so it moves with every
message, and there is no separate "Today's food" box. With nothing logged the bars are empty and a line invites the first
meal. Sugar has no goal, so it is one line under the bars.

While a day is open the same card also holds that day's controls:

- a tag (**In progress**, or **Editing a saved day**), the **Day** field and "Saved automatically at ...", and the
  notice for a day left open from an earlier date;
- the "Last entry" line, and **Foods logged (n)**, folded away until tapped, with each food's calories, protein, carbs,
  fat, calcium, sugar and fiber and an x to remove it;
- **End day**, **Undo last entry** and **Discard this day** (**Save changes** and **Discard changes** on a reopened
  day), with the note that the day is not in the charts until it is ended.

If the open day is not today (it was moved, or left open), the title names that date and the bars are for that day.

| Nutrient | Goal | Why |
| --- | --- | --- |
| Calories | 2,400 kcal | Your target. Also the dashed goal line and the Today row's hairline (it was 2,200). |
| Protein | 150 g | 25% of the calories |
| Carbs | 270 g | 45% of the calories |
| Fat | 80 g | 30% of the calories |
| Fiber | 28 g | FDA daily value |
| Calcium | 1,300 mg | FDA daily value |
| Vitamin A | 900 mcg | FDA daily value (RAE) |
| Vitamin C | 90 mg | FDA daily value |
| Vitamin D | 20 mcg | FDA daily value (800 IU) |

Calories, carbs and fat are budgets: past the goal the bar turns amber and says how far over. The others are minimums:
at 100% the bar is full with a check mark and "goal reached", and going past is fine. A bar never grows past full, but
the percent keeps counting (156%). The goals live in one list, `DAILY_GOALS` in `shared/fitness-goals.ts`.
Older days (and food saved before fiber, sugar and vitamin D were tracked) read 0 for what they never recorded.

**Lifting**, on a phone and on larger screens, runs in this order:

1. The title.
2. The entry box, with **Today vs your bests** right under it (below).
3. The **Stats** widget, open by default, with the same saved open or closed choice: this week's tiles, the seven-day
   bar chart, then a **Today** block with the day's type, exercises, sets and volume and every exercise done today with
   its sets (or "No workout yet"), then highlights, the weekly log and the all-time line. The Today block counts the
   open day, so it changes with every message, and a pulsing dot says the day is still open.
4. The **Progression** chart, always shown in full.
5. **Logged with AI**: the saved days, each with edit and remove.
6. **Your routine** (below).
7. **Session Volume**, **Current Bests** and the **Full Workout Log**. Each starts closed, shows a one-line summary
   ("4 sessions", "12 lifts", "60 entries") and opens when its header is tapped. They are closed again on the next visit.

There are no Push / Pull / Legs tabs, no separate thin Today row and no count cards on this page; the Today block and the
all-time line of the Stats widget cover them. Bests are grouped under Push, Pull and Legs headings, and the Full Workout
Log lists every logged exercise.

### Today vs your bests (Lifting page)

Right under the entry box, always there, one card for each exercise of the day being logged and one bar for each working
set, so you can see at a glance how every set compares with your personal best. It is the live summary of the day, so
there is no separate summary box, and it moves with every message.

- **A card** has the exercise name, its type (Push, Pull or Legs), and one line of words: "Top 130 lb · New best!", "Top
  120 lb · matches your best", "Top 100 lb · best 125 lb (Jan 17)", "Top 100 lb · first time logged", or "No sets yet".
  Warm-ups and notes sit under the bars.
- **A bar** fills to that set: its weight ("120 lb × 8"), or for pull-ups and other rep lifts its reps, and for
  holds its seconds. The **faint fill** behind the bar and the **dashed vertical line** mark your best on any other day.
  A set that goes past it turns **gold** with a star. Each card has its own scale, a little longer than the longer of
  your best and your top set, so the dashed line is never at the very edge.
- **Weight / Volume** switch: Volume draws each set's volume instead (weight times reps, doubled for sets
  done each side), against your best single-set volume. It only changes lifts done for weight.
- **Your best** is the highest number on any other day in the whole log, not only the routine's lifts, and the same lift
  written differently ("Incline DB Press", "incline dumbbell presses") counts as one. Older rows that were not logged
  with AI are read from their text ("225 lb: 5 / 5 / 5"); a row that cannot be read counts as one set at its top number.
  Today's own sets are never part of the best they are compared with.
- While a day is open the card also holds that day's controls, as Today vs your goals does: the tag, the **Day** field
  and saved note, the plan check (if you have a routine), the "Last entry" line, an x on each exercise of the open day
  to remove it, and **End today's workout**, **Undo last entry** and **Discard this workout** (**Save changes** and
  **Discard changes** on a reopened day).
- If the open day is not today the title names that date. With no day open it shows what was saved today, without
  controls, and an invitation when nothing was lifted.

### Your routine (Lifting page)

Below the Logged with AI list there is a **Your routine** section where you describe what each day usually holds.
It starts open until something is set, and collapsed after that.

- Pick Push, Pull or Legs, press **Edit**, and type the exercises one per line.
  Sets are optional and read from forms like `3x8-10`, `3 x 8`, `4×12`, `3 sets of 8` or `3 sets`. A live read-out shows
  what was understood. Add notes in your own words ("heavy presses first"). **Save** keeps that day.
- It is saved on your account under `workout-routine-v1` as the text you typed, so it follows you across devices.

What it is used for:

1. **The AI.** Each workout message carries the routine as context (never as instructions). The AI is told to use the
   routine's exact exercise name and the day's type when you mention one of those lifts, even in shorthand ("incline DB"),
   and to use it to tell which kind of day it was. It must not add exercises, sets or weights you did not say.
   After the AI answers, the server also lines up each exercise with the routine (the same lift in other words, or a name
   with two or more words in common that points to only one routine exercise), so names and day types are consistent.
2. **A plan check** in Today vs your bests, under the exercises: `Pull plan: 2 of 5 done · still to do: Face Pull, Biceps Curl · not in the
   plan: Neck Raise`.
3. **The lift charts.** Once a routine has exercises, the Progression chart, Session Volume and Current Bests use only lifts
   that are in it (different spellings of one lift are one lift). Other logged exercises stay in the Full Workout Log, the
   Today block and the Stats widget, and a note under Progression says how many are left out. With no routine set, every
   logged lift is shown, as before.

### Editing a saved day

Under **Logged with AI** every saved day has a pencil button. It opens the day again in Today vs your bests (Lifting) or Today vs your goals (Calories), tagged "Editing a
saved day"; the button now says **Save changes**. The saved version stays in the charts until you save, and
**Discard changes** leaves it exactly as it was. Saving replaces the earlier version (same id), so there is never a second
copy. Only one day can be open at a time; opening another asks you to end or discard the open one first.

### Calories specifics

- Pressing **End day** marks the day as "explicitly complete" in the calorie log (it means "this is everything I ate").
- Several days' sessions on the same date add up: end the day at lunch, start again in the evening, and the date's
  totals are the sum of both.
- Moving a reopened day to another date takes its food off the old date and puts it on the new one.

### A day left open

If the open day is from an earlier date, the box says so ("This day is from Oct 12 and was never ended") and the button
names that date ("End Oct 12 workout"). Nothing ends a day by itself.

Words like "today", "yesterday", "Monday" or "last Friday" are worked out from the date on your device (the server accepts it when it is within two days of its own date).

## What the AI is asked to do

- **Workouts:** keep names as said, use the real weight and reps, convert kg to lb (x 2.20462, rounded to 0.5), treat holds and cardio as timed sets (5:30 is 330 seconds), keep warm-ups and notes, and mark bodyweight sets. Push, Pull or Legs is taken from the AI and corrected from the exercise name when it is missing.
- **Meals:** estimate each item's calories, protein, carbs, fat, fiber, sugar, calcium, vitamins A, C and D and the other nutrients, with a confidence of low, medium or high. Items marked low show "(rough guess)" in the preview. Nutrition numbers are estimates, not measurements.
- **Updating a day:** the AI gets the day so far as JSON and returns the *complete* updated day. It is told to keep
  everything already there unless corrected, to add new exercises (with `sets: []` until sets are given) or foods, to
  attach bare weights and reps to the latest exercise, and to apply corrections and removals only to what was named.
- **Totals are never trusted from the AI.** The server adds up the items itself, clamps absurd values and drops anything that is not a number.

## Data

| Data | localStorage key | Shape |
| --- | --- | --- |
| The open workout day | `workout-session-v1` | `SessionDraft<ParsedWorkout>`: `id`, `date`, `messages`, `summary`, `undo` steps, `reopened`. Removed when the day ends or is discarded. |
| The open food day | `calories-session-v1` | `SessionDraft<ParsedMeal>`, the same shape. |
| Your routine | `workout-routine-v1` | `{ Push, Pull, Legs: { exercises: string, notes: string } }`, the text as typed. |
| Stats widget open or collapsed | `workout-stats-open-v1`, `calories-stats-open-v1` | `"1"` or `"0"`; open when missing. |
| Lifting log | `workout-ppl-log-v1` | `WorkoutLogEntry[]`. Entries logged with AI carry `logId` (the draft's id, so ending again replaces them) and `sets` (exact sets, which is also what lets a saved day be reopened). |
| Calorie log | `calories-daily-log-v1` | `CalorieDayLog[]`. Totals include every ended day; `meals` lists them (`id` is the draft's id, plus text, items, totals) so one can be taken out or reopened. Older days without the extra nutrients (`satFat`, `fiber`, `sugar`, `potassium`, `iron`, `vitaminD`) are fine; those are optional. |

All four keys use the `workout-` and `calories-` prefixes, so they already sync to the server and across devices. A page
that is open when another device adds to the same open day takes the newer copy (same id, newer `updatedAt`); an older
copy arriving late never overwrites what was just typed. The open day is small (the day, the last 60 messages and five
undo steps), well under the per-key sync size limit. Ended days live only in the logs, not in a second store.

Two days logged on the same date are two sets of rows, not a merge, so removing one never touches the other. Charts show
the best result per exercise per day.

## Charts

**Lifting page**
- Progression chart: weight, reps or time per exercise. Same-day rows collapse to the day's best.
- Session Volume (new): bar per day of total lb x reps, with the exercise and set counts shown on hover.

**Calories page**
- The calories and protein trend and the daily table now include meals logged with AI.
- Where the Calories Come From (new): stacked bars of calories from protein and carbs (4 per gram) and fat (9 per gram).
- Nutrient Trend (new): pick a nutrient chip (calories, protein, fiber, calcium, and so on) and view by day, week or month. Weeks and months are averages over the days logged; days that never recorded a nutrient leave a gap rather than counting as zero.

## Endpoint

`POST /api/fitness/parse` (signed-in only)

Request: `{ "kind": "workout" | "meal", "text": string (2 to 4000 characters), "today"?: "YYYY-MM-DD", "session"?: boolean, "current"?: the day so far, "recent"?: string[] (the messages before this one, at most 20, the last 8 are used), "routine"?: { Push?, Pull?, Legs?: { exercises: { name (max 80), sets? (1 to 30), reps? (max 20) }[] (max 40), notes? (max 600) } } }`

`routine` is used for workouts only (a meal request ignores it); a routine that is not shaped like this is a 400.

With `session: true` the notes are read as one more message of a day being built: `current` is the summary so far, checked the
same way as an answer (400 if it is not a workout or food list, or is over 40,000 characters), and the answer is the
complete updated day. The date of `current` is kept whatever the AI says. A day whose list was emptied by hand counts as
not started but keeps its date. An exercise with a name and no sets yet is kept in a session. Without `session` the
request behaves as before.

Response: `{ kind: "workout", workout }` or `{ kind: "meal", meal }`, already cleaned and with totals added up.

| Status | Meaning |
| --- | --- |
| 400 | Bad request: missing kind, text too short or too long, or a day so far that cannot be read or is too large |
| 401 | Not signed in |
| 422 | The AI answer could not be read, or held no exercises or foods (when updating a day the message says what to try) |
| 429 | More than 30 requests in 10 minutes for the account (bad requests do not count) |
| 502 | AI provider trouble (details are not shown to the user) |
| 503 | AI is not set up, or the account is out of OpenAI credits |

The model is the one configured in `server/openai-model.ts` (gpt-6-luna, falling back to gpt-4o-mini). The new text and the earlier messages are placed in quoted blocks with any triple quotes removed, so a note cannot rewrite the instructions.

## Needs OpenAI credits

Every message is one OpenAI call. When the account has no credits the box shows a message that the AI provider reports exhausted credits and nothing is logged. Add billing at the OpenAI dashboard and it works without any other change.

## Code map

| File | Role |
| --- | --- |
| `shared/fitness-log.ts` | Shared pure logic: validation, unit conversion, totals, add/remove, session summaries, finishing a workout, rebuilding a saved day for editing |
| `shared/fitness-routine.ts` | The routine: reading the typed text, matching exercises to it, lining up an AI answer, the plan check, and which logged rows the lift charts use |
| `shared/fitness-today.ts` | Today's running totals with the open day included, and the words in the thin Today row |
| `shared/fitness-goals.ts` | The daily goals, and how far a day's totals are from them (percent, bar length, to go or over, wording) |
| `shared/fitness-bests.ts` | Today's lifts against your bests: reading sets from older rows, the number each bar is drawn to, the best on other days, one card per exercise |
| `shared/fitness-stats.ts` | The week's numbers for the Stats widget: seven days, streak, averages, volume against last week |
| `shared/fitness-session.ts` | The open day: start, add an entry, undo, change date, what a message changed, stored-draft checks, newer-copy rule, End button wording |
| `server/fitness-ai.ts` | The endpoint, prompts (including the day-update rules), rate limit |
| `client/src/lib/fitness-entry.ts` | Request, applying an answer to the day, titles, error messages |
| `client/src/lib/fitness-queue.ts`, `client/src/components/fitness/pending-messages.tsx` | The waiting messages: the queue rules, running one message into the day, and the list under the box |
| `client/src/lib/fitness-draft.ts` | Saving and loading the open day |
| `client/src/components/fitness/session-panel.tsx` | The chat-style text box, and the open day's controls (food or workout) handed to the widget under it |
| `client/src/components/fitness/routine-editor.tsx`, `client/src/lib/workout-routine.ts`, `client/src/hooks/use-routine.ts` | The Your routine section and saving it |
| `client/src/components/fitness/today-strip.tsx`, `stats-card.tsx` | The Calories page's Today row, and the Stats widget (with the Lifting page's Today block) |
| `client/src/components/fitness/collapsible-section.tsx` | The closed-until-tapped cards for Session Volume, Current Bests and the Full Workout Log |
| `client/src/components/fitness/daily-goals.tsx`, `nutrient-chips.tsx` | The Today vs your goals bars and the open food day's controls, and the calories / protein / carbs / fat / calcium / sugar / fiber tiles for each food |
| `client/src/components/fitness/lift-bests.tsx` | The Today vs your bests cards and set bars, and the open workout's controls |
| `client/src/lib/stats-open.ts`, `client/src/hooks/use-stats-open.ts` | Remembering whether the Stats widget is open |
| `client/src/lib/fitness-stats-text.ts` | The wording and chart values for the Stats widget |
| `client/src/lib/nutrition-chart.ts` | Day, week and month averaging for the charts |
| `client/src/pages/fitness-lifting.tsx`, `fitness-calories.tsx` | The pages: keep the open day, end it into the log, reopen saved days |

## Tests

- `npm run test:unit` runs `shared/fitness-log.test.ts`, `shared/fitness-session.test.ts`, `client/src/lib/fitness-entry.test.ts`, `client/src/lib/fitness-draft.test.ts`, `client/src/lib/nutrition-chart.test.ts`, `client/src/components/fitness/session-panel.test.tsx`, `shared/fitness-today.test.ts`, `shared/fitness-stats.test.ts`, `shared/fitness-routine.test.ts`, `shared/fitness-goals.test.ts`, `shared/fitness-bests.test.ts`, `client/src/lib/workout-routine.test.ts`, `client/src/components/fitness/routine-editor.test.tsx`, `client/src/components/fitness/collapsible-section.test.tsx`, `client/src/components/fitness/daily-goals.test.tsx`, `client/src/components/fitness/lift-bests.test.tsx`, `client/src/components/fitness/nutrient-chips.test.tsx`, `client/src/lib/stats-open.test.ts`, `client/src/lib/fitness-stats-text.test.ts`, `client/src/components/fitness/today-strip.test.tsx`, `client/src/components/fitness/stats-card.test.tsx` and `client/src/components/fitness/fitness-ui.test.ts`.
- `npm run test:focus` runs `server/fitness-ai.test.ts` (the endpoint with a fake AI).
- Manual steps: see [FITNESS_AI_LOGGING_TEST_CASES.md](FITNESS_AI_LOGGING_TEST_CASES.md).
