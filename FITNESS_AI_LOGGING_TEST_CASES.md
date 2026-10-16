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
| Today row and Stats (logic) | `shared/fitness-today.test.ts`, `shared/fitness-stats.test.ts` | today's totals include the open day (new messages, hand edits, undo, a reopened day replacing its saved copy, a day moved to another date), empty and other-day drafts add nothing, the saved log is never changed, strip wording and placeholders; the seven-day week across month ends, averages over days logged only, streak from today or yesterday, comparison with last week, days under goal, volume change, heaviest lift, Push / Pull / Legs split, all-time numbers |
| Today row and Stats (screen) | `client/src/components/fitness/today-strip.test.tsx`, `stats-card.test.tsx`, `client/src/lib/stats-open.test.ts`, `client/src/lib/fitness-stats-text.test.ts` | thin row, dashed placeholder, in-progress dot, clamped progress hairline; widget open by default, collapsed state and its one-line summary, tiles, seven bars with today marked, goal line only for calories, highlights, weekly log, empty-week placeholders; the choice saved under the synced prefixes, separately per page, never throws; chart and highlight wording |
| Collapsed sections | `client/src/components/fitness/collapsible-section.test.tsx`, `fitness-ui.test.ts` | closed by default with a one-line summary and none of the content built; Session Volume, Current Bests and the Full Workout Log use it and Progression does not; the Lifting page order |
| Daily goals and nutrient tiles | `shared/fitness-goals.test.ts`, `client/src/components/fitness/daily-goals.test.tsx`, `nutrient-chips.test.tsx`, `session-panel.test.tsx`, `fitness-ui.test.ts`, `server/fitness-ai.test.ts`, `shared/fitness-log.test.ts` | the goals (2,400 kcal; protein, carbs and fat as 25 / 45 / 30% of it; the daily values for fiber, calcium and vitamins A, C and D); order of the rows; percent, bar length (full at 100%, never longer), to go / over / goal reached; calories, carbs and fat go amber when passed while the others only read reached; nothing logged, and older days missing fiber or vitamin D, read 0; the seven tiles (calories, protein, carbs, fat, calcium, sugar, fiber) for each food and for the total, with units and thousands separators; the widget sits under the entry box on both layouts and counts the open day; the AI is asked for fiber, sugar and vitamin D and the server adds vitamin D up; a meal saved before vitamin D existed can be removed without breaking the day |
| Routine | `shared/fitness-routine.test.ts`, `client/src/lib/workout-routine.test.ts`, `client/src/components/fitness/routine-editor.test.tsx`, `server/fitness-ai.test.ts` | the typed lines read as exercises with sets and reps (`3x8-10`, `3 sets of 8`, `3x60s`, bullets, duplicates, limits); shorthand, plurals and word order do not change an exercise; a name matches the routine only when it is the same lift or points to exactly one routine exercise; an AI answer takes the routine's names and day types; the plan check; chart rows limited to the routine, with spellings merged, and the left-out lifts listed; stored routine read back, damaged values tolerated; the section's view, day tabs, form and read-out; the routine goes to the AI only for workouts, in a quoted block, and bad shapes are refused |
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
Enter sends on a computer and on a phone (the phone keyboard's return key says Send); Shift+Enter adds a line where available. The send arrow sends too.

### FL-12: Failure messages
- No OpenAI key: "AI logging is not set up on this server." No credits: a message that the provider reports exhausted credits. The open day is unchanged and the typed text stays in the box.
- Text with nothing to add ("hello"): a message that it did not add or change anything; the day is unchanged.
- 31 sends in 10 minutes: a "try again in a few minutes" message.
- Offline: "Could not reach the AI"; the open day and the typed text are kept.

### FL-13: Sync
End a day on one device, reload on another signed in to the same account. **Expect:** the day, its chart points, its pencil and remove buttons are there.

### FL-14: Old data
With existing entries from before this feature, open both pages. **Expect:** no errors, old rows and days look the same, and new logging works alongside them. Days logged before the day-building flow can be reopened; older rows that were not logged with AI have no pencil.

### FL-15: Page layout
On a phone (or a window under 768 px wide) open Calories. **Expect:** the title, then a thin Today row, then the entry box, then Today vs your goals, then the Stats widget, then everything else (Logged with AI, charts, tables). There is no long subtitle and no big count cards. On a larger screen **Expect:** the count cards, the entry box, Today vs your goals, then the Logged with AI list and the charts, with no Today row or Stats widget.
Open Lifting, on a phone and on a wide screen. **Expect:** the same order both times: the title, the entry box, the Stats widget, the Progression chart, Logged with AI, Your routine, then Session Volume, Current Bests and Full Workout Log. There are no Push / Pull / Legs tabs, no thin Today row and no count cards.

### FL-15b: Collapsed sections
On Lifting, **Expect:** Progression is fully open; Session Volume, Current Bests and Full Workout Log are each one closed bar with a short summary (for example "4 sessions", "4 lifts", "6 entries") and an arrow. Tap Session Volume. **Expect:** the chart appears, the summary goes, and the others stay closed. Tap Current Bests. **Expect:** the tables appear grouped under Push, Pull and Legs (a type with no lifts is not shown). Tap Full Workout Log. **Expect:** every logged exercise, newest first. Tap a header again. **Expect:** it closes. Reload. **Expect:** all three are closed again.

### FL-16: Today row
On Lifting the same information is the **Today** block inside the Stats widget, under the bar chart; on Calories it is the thin row. With nothing logged today **Expect:** a dashed row or block saying "Nothing logged yet" / "No workout yet" with a hint ("Log your first exercise above" on Lifting). Log two exercises. **Expect:** the Lifting block lists each exercise with its sets under the day's totals, and nothing from other days. Send a message. **Expect:** the row fills in (kcal and macros, or type, exercises, sets and volume), a dot pulses while the day is open, and each further message, undo, removal or date change updates it. End the day. **Expect:** the same totals, no dot. Reopen the day and remove an item. **Expect:** the total drops (the saved copy is not counted twice). Move the open day to yesterday. **Expect:** today's row empties.

### FL-17: Stats widget
**Expect:** open by default with this week's tiles, a seven-day bar chart (today in the strongest colour; the dashed goal line on Calories only), highlights, the weekly log with today first, and the all-time line. Tap the header. **Expect:** it collapses to one line summarizing the week. Tap again. **Expect:** it opens. With an empty week **Expect:** placeholders and an invitation, not zeros or errors.

### FL-18: Stats widget memory
Collapse it on Calories and leave it open on Lifting. Reload; sign out and back in; open the app on another device with the same account. **Expect:** Calories is collapsed and Lifting is open each time. Open Calories on the second device and collapse or open it; after the next refresh **Expect:** the first device follows.

### FL-19: Set up the routine
On Lifting, open **Your routine** (below Logged with AI), choose Pull, press **Edit** and type "Lat pulldown 3x8-10", "Seated cable row 3x10", "Face pull 3x15", "Pull-ups 3x6" on separate lines, with a note. **Expect:** a read-out "Understood 4 exercises" with their targets. Press **Save Pull day**. **Expect:** the day lists the four exercises and the note, the heading says "Push 0 · Pull 4 · Legs 0", and the section is collapsed on the next visit. Reload and open it on another device. **Expect:** the same routine.

### FL-20: Charts only use the routine
Before any routine is set, **Expect:** a hint under Progression to set one up, and every logged lift in the exercise list. After setting Pull, **Expect:** the list holds only Pull routine lifts that have been logged (a lift logged as "Seated Row" appears under "Seated Cable Row"), Session Volume says "Counts only lifts in your routine", Current Bests lists only routine lifts, and a note says how many logged exercises are left out. The Full Workout Log still lists everything. Set up Push and Legs. **Expect:** their lifts appear and the note shrinks.

### FL-21: The AI knows the days
With the routine set, log "pull day, lat pulldown 120 for 8, cable row 100 for 10, neck raises 15". **Expect:** the exercises are named "Lat Pulldown" and "Seated Cable Row" (the routine's names), the day is Pull, Neck Raises keeps the name as said, and a line under the summary reads "Pull plan: 2 of 4 done · still to do: Face Pull, Pull-Ups · not in the plan: Neck Raises". Say "incline DB press 70 for 5" on a Push day. **Expect:** it is logged as Incline Dumbbell Press if that is in the Push routine. With no routine, **Expect:** no plan line and the names as the AI wrote them.

### FL-22: The food summary shows the numbers clearly
Open Calories and send "an everything bagel with cream cheese, a 12 ounce oat milk latte and 6 ounces of grilled salmon". **Expect:** each food in the summary box is its own small card with its name and, under it, seven tiles in one row: kcal, protein, carbs, fat, calcium, sugar and fiber, with units (g, mg) and colours that match from food to food. Under the list, **Total so far** shows the same seven as bigger tiles in two rows, with calories twice as wide. Remove one food with its x. **Expect:** the total drops. On a 390 px wide phone **Expect:** nothing is cut off and the page does not scroll sideways. Reopen a day saved before this change. **Expect:** sugar and fiber read 0 where they were never recorded, with no errors.

### FL-23: Today vs your goals
With nothing logged today, open Calories. **Expect:** directly under the entry box a card "Today vs your goals" with nine empty bars (Calories, Protein, Carbs, Fat, then Fiber, Calcium, Vitamin A, Vitamin C, Vitamin D), each "0% · 0 of ... · ... to go", and a line inviting a first meal. Send "a chicken burrito bowl and a protein shake". **Expect:** the bars fill in at once, before you press End day, and a note says it includes the food still being logged. Check one bar by hand, for example protein 82 g is 55% of 150 g with "68 to go". Keep eating past 2,400 kcal. **Expect:** the calories bar is full and amber, the percent is over 100 and it says how far over. Reach 28 g of fiber. **Expect:** the bar is full with a check mark and "goal reached", and more fiber keeps it that way. Remove foods. **Expect:** the bars go back down. On a wide screen **Expect:** two columns, calories and macros on the left, fiber, calcium and vitamins on the right. The dashed goal on the Calorie Trend chart and the thin Today row's hairline now use 2,400.

### FL-24: Vitamin D
Send "6 ounces of salmon and a glass of milk". **Expect:** the Vitamin D bar moves (salmon is a good source), and the Nutrient Trend chips include Vitamin D. With a day that was open before this change, add a message. **Expect:** it works as before and vitamin D simply starts counting from the new foods.
