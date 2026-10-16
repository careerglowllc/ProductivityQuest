# AI Fitness Logging

Type or speak into a chat-style box on the **Lifting** and **Calories** pages. The first message starts the day. Every
message after it updates the same summary, which is saved after each one. When you press the End button the day goes
into the same logs the charts already read.

## Using it

| Page | First message | Then | End button |
| --- | --- | --- | --- |
| `/fitness/lifting` | "Pull day. First up is lat pulldown, warm-up 60 for 12." | "120 for 8", "120 for 7", "next exercise seated row, warm-up 80 for 10", "100 for 10 then 100 for 9", "the last pulldown set was actually 9 reps" | **End today's workout** |
| `/fitness/calories` | "An everything bagel with cream cheese and a latte" | "a chicken burrito bowl for lunch", "the latte was oat milk", "I didn't eat the bagel" | **End day** |

1. Type in the box, or tap the microphone and speak. Dictated words are added to what is already typed.
2. Press Enter (or the send arrow). Shift+Enter adds a new line where the keyboard has it; a phone keyboard shows a
   Send key.
3. A summary box appears above the text box ("Today's pull day", "Today's food"). It lists each exercise with its sets
   and warm-up, or each food with its calories and macros, and a "Last entry" line says what the message changed.
4. Keep sending. The AI is given the day so far and your earlier messages, so "120 for 8" means a set of the exercise
   you are on, "same again" repeats the last set, and "actually the latte was oat milk" corrects only the latte.
5. Every change is saved at once ("Saved automatically at ..."). Close the page and come back, or open it on another
   device, and the open day is still there.
6. Press the End button when you are done. The day is written to the charts, the summary box closes, and the next
   message starts a new day. A toast offers **Edit again**.

While a day is open it is **not in the charts yet**. The box says so.

In the summary box you can also:

- **Undo last entry** (up to five steps back, including the message that caused it).
- Remove a single exercise or food with the x beside it.
- Change the **Day** with the date field (not into the future).
- **Discard** the open day.

### Phone layout

On a phone both pages are laid out for logging first:

1. The title, kept small.
2. A very thin **Today** row: today's running totals (calories and macros with a hairline toward the 2,200 kcal
   reference; or the day's type, exercises, sets and volume for lifting), or a dashed placeholder ("Nothing logged yet",
   "No workout yet") when there is nothing. It counts the open day too, so it changes with every message, and a pulsing
   dot says the day is still open.
3. The entry box, with no heading or explanation above it.
4. A collapsible **Stats** widget, open by default: this week's tiles, a seven-day bar chart (with the goal line for
   calories), highlights (streak, best protein day and the change from last week for food; workouts, volume against
   last week, the heaviest lift and the Push / Pull / Legs split for lifting), the weekly log (today first) and an
   all-time line. While it is collapsed, one line of the week is shown instead. Tapping the header opens or collapses it.
   The choice is saved on the account (`workout-stats-open-v1`, `calories-stats-open-v1`), so it is the same after
   logging out and in, and on another device.

The big count cards that used to sit above the entry box are shown on larger screens only; their all-time numbers are
the last line of the Stats widget. Larger screens keep the layout they had.

### Your routine (Lifting page)

Under the All / Push / Pull / Legs tabs there is a **Your routine** section where you describe what each day usually holds.
It starts open until something is set, and collapsed after that.

- Pick Push, Pull or Legs (choosing a tab above shows that day here), press **Edit**, and type the exercises one per line.
  Sets are optional and read from forms like `3x8-10`, `3 x 8`, `4×12`, `3 sets of 8` or `3 sets`. A live read-out shows
  what was understood. Add notes in your own words ("heavy presses first"). **Save** keeps that day.
- It is saved on your account under `workout-routine-v1` as the text you typed, so it follows you across devices.

What it is used for:

1. **The AI.** Each workout message carries the routine as context (never as instructions). The AI is told to use the
   routine's exact exercise name and the day's type when you mention one of those lifts, even in shorthand ("incline DB"),
   and to use it to tell which kind of day it was. It must not add exercises, sets or weights you did not say.
   After the AI answers, the server also lines up each exercise with the routine (the same lift in other words, or a name
   with two or more words in common that points to only one routine exercise), so names and day types are consistent.
2. **A plan check** under the workout summary: `Pull plan: 2 of 5 done · still to do: Face Pull, Biceps Curl · not in the
   plan: Neck Raise`.
3. **The lift charts.** Once a routine has exercises, the Progression chart, Session Volume and Current Bests use only lifts
   that are in it (different spellings of one lift are one lift). Other logged exercises stay in the Full Workout Log, the
   Today row and the Stats widget, and a note under Progression says how many are left out. With no routine set, every
   logged lift is shown, as before.

### Editing a saved day

Under **Logged with AI** every saved day has a pencil button. It opens the day again in the summary box ("Editing a
saved day"); the button now says **Save changes**. The saved version stays in the charts until you save, and
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

### Voice

Voice typing uses the browser's speech recognition where it exists (Chrome, Edge, Safari). Where it does not, the microphone is hidden and the box suggests the keyboard's own dictation key. A blocked microphone or silence gives a plain message instead of failing quietly.

## What the AI is asked to do

- **Workouts:** keep names as said, use the real weight and reps, convert kg to lb (x 2.20462, rounded to 0.5), treat holds and cardio as timed sets (5:30 is 330 seconds), keep warm-ups and notes, and mark bodyweight sets. Push, Pull or Legs is taken from the AI and corrected from the exercise name when it is missing.
- **Meals:** estimate each item's calories, protein, carbs, fat and the other nutrients, with a confidence of low, medium or high. Items marked low show "(rough guess)" in the preview. Nutrition numbers are estimates, not measurements.
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
| Calorie log | `calories-daily-log-v1` | `CalorieDayLog[]`. Totals include every ended day; `meals` lists them (`id` is the draft's id, plus text, items, totals) so one can be taken out or reopened. Older days without the extra nutrients (`satFat`, `fiber`, `sugar`, `potassium`, `iron`) are fine; those are optional. |

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
| `shared/fitness-stats.ts` | The week's numbers for the Stats widget: seven days, streak, averages, volume against last week |
| `shared/fitness-session.ts` | The open day: start, add an entry, undo, change date, what a message changed, stored-draft checks, newer-copy rule, End button wording |
| `server/fitness-ai.ts` | The endpoint, prompts (including the day-update rules), rate limit |
| `client/src/lib/fitness-entry.ts` | Request, applying an answer to the day, titles, error messages |
| `client/src/lib/fitness-draft.ts` | Saving and loading the open day |
| `client/src/hooks/use-speech-to-text.ts` | Voice typing |
| `client/src/components/fitness/session-panel.tsx` | The summary box, buttons and chat-style text box |
| `client/src/components/fitness/routine-editor.tsx`, `client/src/lib/workout-routine.ts`, `client/src/hooks/use-routine.ts` | The Your routine section and saving it |
| `client/src/components/fitness/today-strip.tsx`, `stats-card.tsx` | The phone layout's Today row and Stats widget |
| `client/src/lib/stats-open.ts`, `client/src/hooks/use-stats-open.ts` | Remembering whether the Stats widget is open |
| `client/src/lib/fitness-stats-text.ts` | The wording and chart values for the Stats widget |
| `client/src/lib/nutrition-chart.ts` | Day, week and month averaging for the charts |
| `client/src/pages/fitness-lifting.tsx`, `fitness-calories.tsx` | The pages: keep the open day, end it into the log, reopen saved days |

## Tests

- `npm run test:unit` runs `shared/fitness-log.test.ts`, `shared/fitness-session.test.ts`, `client/src/lib/fitness-entry.test.ts`, `client/src/lib/fitness-draft.test.ts`, `client/src/lib/nutrition-chart.test.ts`, `client/src/components/fitness/session-panel.test.tsx`, `shared/fitness-today.test.ts`, `shared/fitness-stats.test.ts`, `shared/fitness-routine.test.ts`, `client/src/lib/workout-routine.test.ts`, `client/src/components/fitness/routine-editor.test.tsx`, `client/src/lib/stats-open.test.ts`, `client/src/lib/fitness-stats-text.test.ts`, `client/src/components/fitness/today-strip.test.tsx`, `client/src/components/fitness/stats-card.test.tsx` and `client/src/components/fitness/fitness-ui.test.ts`.
- `npm run test:focus` runs `server/fitness-ai.test.ts` (the endpoint with a fake AI).
- Manual steps: see [FITNESS_AI_LOGGING_TEST_CASES.md](FITNESS_AI_LOGGING_TEST_CASES.md).
