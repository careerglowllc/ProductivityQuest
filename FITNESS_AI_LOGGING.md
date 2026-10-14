# AI Fitness Logging

Type or speak a plain-language note into a chat-style box on the **Lifting** and **Calories** pages. The AI turns it into structured data, you check it, and it is saved into the same logs the charts already read.

## Using it

| Page | What to write | Where it goes |
| --- | --- | --- |
| `/fitness/lifting` | "Yesterday: incline dumbbell press 70 for 5, 5, 4. Pull-ups bodyweight x8, x7. Plank 2:30." | One row per exercise for that day in the lifting log (weight, reps, date, notes). The day's rows together are that day's session. |
| `/fitness/calories` | "Two eggs, two toast with butter and a flat white, 7am on Monday." | Added to that day's totals in the calorie log (calories, protein, carbs, fat, fiber, sugar, sodium, calcium, magnesium, potassium, iron, vitamins A and C). |

1. Type in the box, or tap the microphone and speak. Dictated words are added to what is already typed.
2. Press the send arrow (Enter on a computer, Shift+Enter for a new line; on a phone Enter is a new line, or use Ctrl/Cmd+Enter).
3. Read the **Check before saving** preview. Change the day with the date field if the AI guessed wrong.
4. Press **Save to log**, or **Edit my text** to go back. Nothing is saved before this step.
5. A toast offers **Undo**. Anything logged with AI also appears under **Logged with AI** with a remove button.

Words like "today", "yesterday", "Monday" or "last Friday" are worked out from the date on your device (the server accepts it when it is within two days of its own date).

### Voice

Voice typing uses the browser's speech recognition where it exists (Chrome, Edge, Safari). Where it does not, the microphone is hidden and the box suggests the keyboard's own dictation key. A blocked microphone or silence gives a plain message instead of failing quietly.

## What the AI is asked to do

- **Workouts:** keep names as said, use the real weight and reps, convert kg to lb (x 2.20462, rounded to 0.5), treat holds and cardio as timed sets (5:30 is 330 seconds), keep warm-ups and notes, and mark bodyweight sets. Push, Pull or Legs is taken from the AI and corrected from the exercise name when it is missing.
- **Meals:** estimate each item's calories, protein, carbs, fat and the other nutrients, with a confidence of low, medium or high. Items marked low show "(rough guess)" in the preview. Nutrition numbers are estimates, not measurements.
- **Totals are never trusted from the AI.** The server adds up the items itself, clamps absurd values and drops anything that is not a number.

## Data

Nothing new is stored on the server beyond the existing log syncing; both logs already sync automatically.

| Log | localStorage key | Shape |
| --- | --- | --- |
| Lifting | `workout-ppl-log-v1` | `WorkoutLogEntry[]`. Entries logged with AI also carry `logId` (one logging, so it can be removed or undone exactly) and `sets` (exact sets). |
| Calories | `calories-daily-log-v1` | `CalorieDayLog[]`. Totals include every meal logged with AI; `meals` lists those meals (text, items, totals) so one can be taken out again. Older days without the extra nutrients (`satFat`, `fiber`, `sugar`, `potassium`, `iron`) are fine; those are optional. |

A workout logged twice on the same day is two sets of rows, not a merge, so removing one never touches the other. Charts show the best result per exercise per day.

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

Request: `{ "kind": "workout" | "meal", "text": string (2 to 4000 characters), "today"?: "YYYY-MM-DD" }`

Response: `{ kind: "workout", workout }` or `{ kind: "meal", meal }`, already cleaned and with totals added up.

| Status | Meaning |
| --- | --- |
| 400 | Bad request: missing kind, text too short or too long |
| 401 | Not signed in |
| 422 | The AI answer could not be read, or held no exercises or foods |
| 429 | More than 30 requests in 10 minutes for the account (bad requests do not count) |
| 502 | AI provider trouble (details are not shown to the user) |
| 503 | AI is not set up, or the account is out of OpenAI credits |

The model is the one configured in `server/openai-model.ts` (gpt-6-luna, falling back to gpt-4o-mini). The text is placed in a quoted block with any triple quotes removed, so a note cannot rewrite the instructions.

## Needs OpenAI credits

Every parse is one OpenAI call. When the account has no credits the box shows a message that the AI provider reports exhausted credits and nothing is logged. Add billing at the OpenAI dashboard and it works without any other change.

## Code map

| File | Role |
| --- | --- |
| `shared/fitness-log.ts` | Shared pure logic: validation, unit conversion, totals, add/remove, session summaries |
| `server/fitness-ai.ts` | The endpoint, prompts, rate limit |
| `client/src/lib/fitness-entry.ts` | Request, error messages, preview text |
| `client/src/hooks/use-speech-to-text.ts` | Voice typing |
| `client/src/components/fitness/log-entry-box.tsx` | The chat-style box and preview |
| `client/src/lib/nutrition-chart.ts` | Day, week and month averaging for the charts |
| `client/src/pages/fitness-lifting.tsx`, `fitness-calories.tsx` | The pages |

## Tests

- `npm run test:unit` runs `shared/fitness-log.test.ts`, `client/src/lib/fitness-entry.test.ts`, `client/src/lib/nutrition-chart.test.ts` and `client/src/components/fitness/fitness-ui.test.ts`.
- `npm run test:focus` runs `server/fitness-ai.test.ts` (the endpoint with a fake AI).
- Manual steps: see [FITNESS_AI_LOGGING_TEST_CASES.md](FITNESS_AI_LOGGING_TEST_CASES.md).
