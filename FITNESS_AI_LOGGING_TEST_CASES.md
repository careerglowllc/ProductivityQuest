# AI Fitness Logging: Test Cases

Automated coverage is listed first; the manual cases need a browser and OpenAI credits.

## Automated

| Area | File | What it proves |
| --- | --- | --- |
| Parsing rules | `shared/fitness-log.test.ts` | kg to lb, timed sets, bodyweight, bad numbers dropped, totals recomputed, date words, Push/Pull/Legs from names (including plurals like "Pull-Ups"), add/remove/undo exactness, session summaries, nutrient clamping, meal add/remove, empty days removed |
| The open day | `shared/fitness-session.test.ts` | exercises with no sets kept while building a day, warm-up only / notes only / no sets wording, empty shells dropped when ending, a saved workout reopens exactly (and set notes do not pile up across saves), ending again replaces rows and meals (even on another date) without doubling, hand removal of exercises and foods, draft start / add / undo (message included) / limits / date change, stale-day notice, End button wording, stored drafts validated and repaired, newer-copy-from-another-device rule, plain-language change lines for workouts and food |
| Endpoint | `server/fitness-ai.test.ts` | sign-in required, 400 checks, 503 with no AI, workout and meal results, `today` window, quote break-out blocked, 422 for unreadable or empty answers, 503 vs 502 for provider errors, 30 per 10 minutes limit and reset, bad requests not counted; day building: warm-up-only first message, day so far and earlier messages sent in the prompt, date of the day kept, emptied day, food updates with server totals, unreadable or oversized day refused before the AI, `current` ignored without `session`, only the latest messages sent and cut short, quotes neutralized, empty update message |
| Client helpers | `client/src/lib/fitness-entry.test.ts` | dictation joining, server error text, voice error text, summary lines, applying an answer (new day, update, no change, wrong kind), hand removal, move day, undo, titles for today and earlier days, local today, unique ids |
| Saved open day | `client/src/lib/fitness-draft.test.ts` | saved under the synced prefixes, saved after each change and found again, removed when ended, damaged values ignored, blocked storage never throws |
| Panel markup | `client/src/components/fitness/session-panel.test.tsx` | no open day: box and explanation only; open day: title, items, auto-save note, End / Undo / Discard states; empty day cannot be ended; stale day notice and dated button; reopened day wording; date field not into the future; food total and estimates note |
| Chart data | `client/src/lib/nutrition-chart.test.ts` | day, week (Monday start) and month averages, gaps for missing nutrients, macro calories |
| Wiring | `client/src/components/fitness/fitness-ui.test.ts` | box, mic, Enter behaviour, every answer saved to the open day, failed request keeps the text, End / undo / discard / date / item removal, both pages end into the log with replace-by-id, reopen with edit buttons, newer copy picked up, charts present, synced storage prefixes, route registered |

Run: `npm run test:unit` and `npm run test:focus`.

## Manual

### FL-1: Build a workout day
1. Open Lifting. Type "Pull day. First up is lat pulldown, warm-up 60 pounds for 12." and send. **Expect:** a box "Today's pull day" with Lat Pulldown, "No sets yet", the warm-up, "In progress", "Saved automatically at ...", and a "Last entry: Added Lat Pulldown ..." line.
2. Send "120 for 8", then "120 for 7". **Expect:** the sets read "120 lb: 8 / 7" under the same exercise, with a Last entry line for each.
3. Send "Next exercise seated cable row, warm-up 80 for 10", then "100 for 10, then 100 for 9". **Expect:** a second exercise with its sets.
4. Send "the last pulldown set was actually 9 reps and my left shoulder felt tight". **Expect:** only that set and a note change.
5. **Expect throughout:** the charts do not change yet, and the box says it is not in the charts until you end the workout.

### FL-2: Auto-save
With a day open, reload the page (and, if you can, open the same account on another device). **Expect:** the summary box is back exactly as it was. Add a message on the other device, then come back to the first one after its next refresh. **Expect:** the first page shows the newer summary and typing there does not undo it.

### FL-3: End the workout
Press **End today's workout**. **Expect:** the box closes and shows the starting instructions again, a toast says how many exercises were saved with **Edit again**, the day appears under **Logged with AI**, in the progression chart and in Session Volume. Send another message. **Expect:** a brand new day starts, not an addition to the ended one.

### FL-4: Edit a saved workout
Press the pencil beside the saved day. **Expect:** the box says "Editing a saved day" and the button says **Save changes**. Send a correction, then press Save changes. **Expect:** the same day's rows are replaced (no duplicate in Logged with AI or the charts). Reopen again and press **Discard changes** after sending a message. **Expect:** the saved day is unchanged. With a day open, press a pencil. **Expect:** a message to end or discard the open day first.

### FL-5: Undo, remove, date, discard
- **Undo last entry** after two messages. **Expect:** the summary goes back one message; undoing past the first message is not offered.
- Press the x beside an exercise. **Expect:** it goes, and Undo brings it back.
- Change the Day field. **Expect:** the title and date change; a future date cannot be picked.
- **Discard this workout** asks to confirm, then the open day is gone and nothing was saved.
- An open day with only an exercise name and nothing else cannot be ended (the button is disabled).

### FL-6: Build a food day
Open Calories. Send "An everything bagel with cream cheese and a 12 ounce latte". **Expect:** "Today's food" with each item's calories and macros, "Total so far", and the estimates note. Send "a chicken burrito bowl for lunch", then "actually the latte was oat milk" (only the latte changes), then "I didn't eat the bagel after all" (the bagel goes). Press **End day**. **Expect:** today's totals in the calorie log equal the summary, the day is marked complete, "Logged with AI" lists it, and the trend, Where the Calories Come From and Nutrient Trend change.

### FL-7: Several sessions on one date, and editing a food day
After End day, start another day with "an apple as a snack" and end it. **Expect:** today's totals are the sum of both and both are listed. Reopen the first with the pencil, change the Day to yesterday, press Save changes. **Expect:** its food moved to yesterday; today keeps only the apple.

### FL-8: A day left open
Leave a day open overnight (or set the Day field to an earlier date). **Expect:** a note that the day is from that date and was never ended, and a button naming the date. It is not ended or lost by itself.

### FL-9: Nutrient trend
Pick Calcium, then Fiber; switch Day, Week and Month. **Expect:** the chart follows the chip and period. Weeks and months show averages and do not dip to zero for older days that never recorded the nutrient.

### FL-10: Voice
In Chrome or Safari press the microphone, say an entry, press it again. **Expect:** the words appear in the box (added after existing text). Deny the microphone permission. **Expect:** a message that access is blocked. In a browser without speech recognition, **Expect:** no microphone and a tip to use the keyboard's dictation.

### FL-11: Keyboard
Computer: Enter sends, Shift+Enter adds a line. Phone: Enter adds a line, send arrow sends.

### FL-12: Failure messages
- No OpenAI key: "AI logging is not set up on this server." No credits: a message that the provider reports exhausted credits. The open day is unchanged and the typed text stays in the box.
- Text with nothing to add ("hello"): a message that it did not add or change anything; the day is unchanged.
- 31 sends in 10 minutes: a "try again in a few minutes" message.
- Offline: "Could not reach the AI"; the open day and the typed text are kept.

### FL-13: Sync
End a day on one device, reload on another signed in to the same account. **Expect:** the day, its chart points, its pencil and remove buttons are there.

### FL-14: Old data
With existing entries from before this feature, open both pages. **Expect:** no errors, old rows and days look the same, and new logging works alongside them. Days logged before the day-building flow can be reopened; older rows that were not logged with AI have no pencil.
