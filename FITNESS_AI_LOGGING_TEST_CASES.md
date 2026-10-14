# AI Fitness Logging: Test Cases

Automated coverage is listed first; the manual cases need a browser and OpenAI credits.

## Automated

| Area | File | What it proves |
| --- | --- | --- |
| Parsing rules | `shared/fitness-log.test.ts` | kg to lb, timed sets, bodyweight, bad numbers dropped, totals recomputed, date words, Push/Pull/Legs from names (including plurals like "Pull-Ups"), add/remove/undo exactness, session summaries, nutrient clamping, meal add/remove, empty days removed |
| Endpoint | `server/fitness-ai.test.ts` | sign-in required, 400 checks, 503 with no AI, workout and meal results, `today` window, quote break-out blocked, 422 for unreadable or empty answers, 503 vs 502 for provider errors, 30 per 10 minutes limit and reset, bad requests not counted |
| Client helpers | `client/src/lib/fitness-entry.test.ts` | dictation joining, server error text, voice error text, preview lines, date correction, local today, unique ids |
| Chart data | `client/src/lib/nutrition-chart.test.ts` | day, week (Monday start) and month averages, gaps for missing nutrients, macro calories |
| Wiring | `client/src/components/fitness/fitness-ui.test.ts` | box, mic, preview, Enter behaviour, nothing saved before confirm, both pages save/undo/remove, charts present, synced storage prefixes, route registered |

Run: `npm run test:unit` and `npm run test:focus`.

## Manual

### FL-1: Log a workout by typing
1. Open Lifting. Type: "Yesterday incline dumbbell press 70 for 5, 5, 4 and pull-ups bodyweight 8, 7".
2. Press send. **Expect:** a preview with yesterday's date, two exercises, sets shown as "70 lb: 5 / 5 / 4" and "BW: 8 / 7".
3. Press **Save to log**. **Expect:** toast with Undo, entry under "Logged with AI", the day appears in the Session Volume chart, and the exercises appear in the progression chart.

### FL-2: Correct the day
Do FL-1 but change the date in the preview before saving. **Expect:** the rows are saved on the corrected day.

### FL-3: Undo and remove
After saving, press Undo in the toast. **Expect:** the rows disappear. Log again, then press the remove button in "Logged with AI". **Expect:** only that logging's rows go; other rows for the same day stay.

### FL-4: Edit my text
Send a note, then press **Edit my text**. **Expect:** back to the box with the text intact and nothing saved.

### FL-5: Log a meal
Open Calories. Type "Two eggs, two toast with butter and a flat white yesterday". **Expect:** a preview with items, calories and macros, a note that the numbers are estimates, and yesterday's date. After saving, yesterday's totals grow by the meal, "Logged with AI" lists it, and the calories trend, Where the Calories Come From and Nutrient Trend change.

### FL-6: Second meal on the same day
Log a second meal for the same day. **Expect:** totals are the sum of both. Removing one takes only its share off; removing the last meal of a day created by AI removes the day.

### FL-7: Nutrient trend
Pick Calcium, then Fiber; switch Day, Week and Month. **Expect:** the chart follows the chip and period. Weeks and months show averages and do not dip to zero for older days that never recorded the nutrient.

### FL-8: Voice
In Chrome or Safari press the microphone, say an entry, press it again. **Expect:** the words appear in the box (added after existing text). Deny the microphone permission. **Expect:** a message that access is blocked. In a browser without speech recognition, **Expect:** no microphone and a tip to use the keyboard's dictation.

### FL-9: Keyboard
Computer: Enter sends, Shift+Enter adds a line. Phone: Enter adds a line, send arrow sends.

### FL-10: Failure messages
- No OpenAI key: "AI logging is not set up on this server." No credits: a message that the provider reports exhausted credits. Nothing is saved either way.
- Text with no exercises or foods ("hello"): a message that nothing could be found; nothing saved.
- 31 sends in 10 minutes: a "try again in a few minutes" message.
- Offline: "Could not reach the AI".

### FL-11: Sync
Log on one device, reload on another signed in to the same account. **Expect:** the logging, its chart points and its remove button are there.

### FL-12: Old data
With existing entries from before this feature, open both pages. **Expect:** no errors, old rows and days look the same, and new logging works alongside them.
