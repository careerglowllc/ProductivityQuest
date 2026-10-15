# Move Overdue Quests to Today

An optional, per-account setting. When it is on, then at midnight in the account's timezone, every active quest whose due date has passed gets today's date. For example, quests due October 15 become due October 16 when the clock passes midnight on the 16th. When it is off (the default), overdue quests keep their old due date, as before.

## Using it

1. Open **Settings**. Under the nickname there is a card called **Move overdue quests to today** with a switch.
2. Turn it on. It starts with the next new day: turning it on does not move anything right away. To move today's overdue quests immediately, use **Move Overdue to Today** on the Quests page, which is a separate, manual button.
3. Turn it off at any time. Nothing is changed back, and no more quests move.

The card names your timezone (for example America/Los Angeles). Midnight is that timezone's midnight, and you change the timezone in Settings, then Calendar Settings, then Timezone. If you change the timezone, the next midnight is worked out again.

## What it changes

| Quest | What happens |
| --- | --- |
| Active, due on an earlier day than today | Due date becomes today |
| Due today or later, or no due date | Unchanged |
| Completed, or in the recycling bin | Unchanged |
| Another account's quests | Never touched |

- Every quest type is included (reminder, deadline, general), as is every importance level.
- Only the due date changes. The start date, any calendar time slot, and any Google Calendar event stay as they were. (This is the same as the manual Move Overdue to Today button.)
- It runs once per local day. A due date you set yourself later the same day, even one in the past, is left alone until the next new day.
- "Today" for a due date means its calendar day as the app shows it (a due date is stored as midnight UTC of that day).

## How it works

- **The setting** is two columns on the account (`users.auto_roll_due_dates`, off by default, and `users.last_due_roll_day`, the last local day it ran). They are added by the startup migration, so deploying is enough.
- **The server sleeps until midnight.** `server/due-date-rollover.ts` works out the next midnight among the accounts that have it on, sleeps until just after it, rolls them, and plans the next one. It reads the database only at start, at those midnights, and when a setting changes, never on a short timer, so an idle database can still go to sleep.
- **Catching up.** When the server starts it rolls any account that missed a day while it was down. Also, whenever the quest list is loaded (`GET /api/tasks`), an account that has not rolled yet today is rolled first, so the list always shows the right dates even if the timer did not fire.
- **The open app updates itself.** For accounts with the setting on, the app reloads the quest list just after midnight in the account's timezone (and when you bring the app back to the front on a new day), so you see the new dates without reloading the page.
- **The move itself** is one database update (`server/due-date-rollover-store.ts`) limited to that account's active quests with a due date before today.
- **Failures are safe.** If the update fails, the day is not marked as done, so it is tried again. Rolling twice does no harm.

## API

- `GET /api/settings` includes `autoRollDueDates` (true or false).
- `POST /api/settings/auto-roll-due-dates` with `{ "enabled": true | false }` (signed in; anything else is a 400).
- `POST /api/settings/timezone` now saves the timezone for real (the code that saved settings used to skip it) and makes the server re-plan its next midnight.

## Code

| File | Role |
| --- | --- |
| `shared/due-date-rollover.ts` | The day in a timezone, due-date helpers, time until midnight |
| `server/due-date-rollover.ts` | When to roll, and the midnight scheduler |
| `server/due-date-rollover-store.ts` | The database update and the setting reads |
| `server/routes.ts` | The setting endpoint, the catch-up on loading quests |
| `client/src/components/auto-roll-setting.tsx` | The switch on the Settings page |
| `client/src/hooks/use-day-rollover-refresh.ts` | Reloads quests when the day changes |

## Tests

`npm run test:unit` runs `shared/due-date-rollover.test.ts`, `server/due-date-rollover.test.ts` and `client/src/lib/auto-roll-text.test.ts`. Manual steps: [AUTO_ROLL_DUE_DATES_TEST_CASES.md](AUTO_ROLL_DUE_DATES_TEST_CASES.md).
