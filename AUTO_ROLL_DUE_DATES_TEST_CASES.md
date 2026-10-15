# Move Overdue Quests to Today: Test Cases

How it works: [AUTO_ROLL_DUE_DATES.md](AUTO_ROLL_DUE_DATES.md). Run `npm run test:unit` for the automated cases.

## Automated

| Area | File | What it proves |
| --- | --- | --- |
| Days and timezones | `shared/due-date-rollover.test.ts` | the day is read in the account's timezone (Los Angeles, New York and Tokyo change days at different moments); unknown or missing zones count as UTC; a due date is midnight UTC of its day; only an earlier day is overdue; the time until midnight is right to the second (including half-hour zones), and the next midnight really is the next day in five zones |
| When to roll | `server/due-date-rollover.test.ts` | an account with the setting off is never touched; a new day rolls once and not again until the next day; each account rolls at its own midnight; a failure leaves the day unmarked so it is tried again and does not stop other accounts |
| The scheduler | `server/due-date-rollover.test.ts` | sleeps until the earliest midnight among accounts (plus a short wait), rolls them, plans the next; no timer when nobody has it on; turning it on or off replaces or cancels the wait; never waits under a minute; retries in ten minutes if the database cannot be read; catches up a missed day on start |
| Wiring | `server/due-date-rollover.test.ts` | the columns exist in the schema and the startup migration; the setting and the timezone are saved; the move is limited to the account's active quests with an earlier due date and changes only the due date; the endpoint accepts only true or false; turning it on starts with the next new day; quests are rolled before the list is read; the Settings page shows the switch; the app reloads quests on a new day |
| Wording | `client/src/lib/auto-roll-text.test.ts` | the card's description, hint and confirmations |

The database update was also run for real against two temporary accounts (created and deleted by the check): the overdue, late-in-the-day and reminder quests moved; due-today, due-tomorrow, no-date, completed, recycled and another account's quests did not; a second run the same day did nothing; the next day moved the right four.

## Manual

### AR-1: The setting
Open Settings. **Expect:** a "Move overdue quests to today" card under the nickname, with a switch that is off, a description naming your timezone, and the hint "Off. Overdue quests keep their old due date until you change it."

### AR-2: Turn it on
Switch it on. **Expect:** it changes at once, a message says it starts with the next new day, and the hint now says "On. It starts with the next new day…". Reload the page: still on. Nothing about your quests changed.

### AR-3: Per account
Sign in as a second account. **Expect:** its switch is off, whatever the first account chose. Turn it on for one and confirm the other is unaffected.

### AR-4: Turn it off
Switch it off. **Expect:** the hint returns to "Off…" and a message says overdue quests will stay as they are. Reload: still off.

### AR-5: A new day rolls overdue quests
With it on, have quests due today (and one completed quest and one deleted quest due today) before midnight in your timezone. After midnight (the app can stay open), **expect:** within a minute the open app shows the active quests with the new day's date; the completed and deleted ones are unchanged; quests due later than today are unchanged; quests with no due date are unchanged. For a quick check without waiting, ask for the quest list after midnight on a device left closed overnight: opening the app shows the new dates at once.

### AR-6: Midnight is your timezone's
Set your timezone (Settings, Calendar Settings, Timezone) to somewhere where it is already the next day and turn the setting on the day before. **Expect:** quests roll when it becomes midnight there, not in UTC and not on the server's clock.

### AR-7: Only once a day
After the roll, change a quest's due date to yesterday yourself. **Expect:** it stays on yesterday until the next new day.

### AR-8: Other dates untouched
On a quest that was rolled, check the start date and any calendar time. **Expect:** both are as before; only the due date changed.

### AR-9: Setting off means no change
With the setting off (the default), let a day pass. **Expect:** overdue quests keep their old dates, as before.

### AR-10: The server was down at midnight
Leave the setting on, and have the server restarted (or a deploy happen) just before midnight and come back after. **Expect:** the next time the app loads quests, they have the new day's dates.

### AR-11: Daylight saving
On a day when your timezone's clock changes, **expect:** quests still roll once, on the new calendar day, not twice and not skipped.

### AR-12: The manual button still works
On the Quests page, **Move Overdue to Today** still moves overdue quests when you press it, whether the setting is on or off.
