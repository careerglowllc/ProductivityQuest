# Personalized AI Smart Focus

Smart Focus uses OpenAI's `gpt-6-luna` (about $0.10 in / $0.50 out per million tokens, well under half a cent per ranking) plus deterministic safeguards. If the API refuses a parameter, the request is retried with relaxed settings and finally with `gpt-4o-mini`; billing and rate-limit errors are never retried. Set `OPENAI_MODEL` to choose another model. Skill auto-classification uses the same model setting. It is **not a separately trained model** and does not use a person's ChatGPT account. One server-side `OPENAI_API_KEY` serves the application; preference memory is private to each authenticated app account.

## Using it

1. Open **Settings → Smart Focus** and **Enable** it. The consent notice explains that relevant quest content and saved feedback will be sent to OpenAI. While Smart Focus is disabled, the Smart Focus tab on the Quests page lists no quests and shows "Go to the Smart Focus page in settings to adjust" with a link to that page; while enabled, the tab just works and has no explanation panel.
2. Select a quest and click **AI feedback** in the existing selected-task action bar (desktop or mobile). With one selected quest the paragraph form opens directly; with several, first choose which quest the feedback concerns. It never broadcasts feedback to all selected quests. The card/detail menus also retain AI feedback. Enter a paragraph explaining priority, exclusions, missing work, or broader working preferences. It can be saved with AI off and survives restarts.
3. **Refresh now** (Settings → Smart Focus) reranks the list and shows whether the result is personalized AI or rules-based, with the reason if the provider failed. Reasons appear on recommended quests. Missing tasks can be added by the AI even without due dates.
4. **Not today** sets a non-protected quest aside until the next account-local day. Undo is offered in the confirmation toast; individual dismissal history can also be forgotten in Private preferences (Settings → Smart Focus).
5. Review or forget individual written preferences and signals in **Private preferences** on the Smart Focus settings page, or confirm clearing all memory. Disabling Smart Focus retains memory but stops provider calls and implicit demotion.

Saving feedback does not edit a quest's importance field, dates, completion state, reminders, or other properties. It changes recommendation context. A saved preference can affect multiple tasks when its wording is general; task-specific negative feedback can exclude its non-protected target. The model's advice is never permission to hide protected work.

## Hard safeguards

- Account timezone determines “today,” including daylight-saving boundaries.
- Overdue/due-today work and quests starting today are protected. AI and Not today cannot remove them.
- All protected quests are shown even when there are more than ten. Otherwise the target list size is ten.
- Completed/recycled quests and standing **reminder-type quests** stay out of the work queue. Reminders keep their separate strip.
- Future-start quests cannot enter unless already due/overdue. Missing dates do not block high-priority work.
- High-priority ready work, reached start dates, and important near-term deadlines qualify under server rules. Default order: due or overdue today, then starting today, then the rest; within each, earliest due date (undated last), then importance (Pareto, High, Med-High, Medium, Med-Low, Low). Only quests tied on both are ordered by the model score, with deadline type as a small extra tie-break weight.
- An explicit dismissal lasts only for that day. Repeating it several times on one day counts once.
- Implicit learning requires at least **three distinct dismissal days within 30 days**. It applies only a small, reversible penalty to that exact quest, and only while AI is enabled. It never creates a category-wide preference or permanently excludes a task.
- Completion, filtering/search, changing dates, and ignoring a task are **not** treated as dislike signals.
- Zero false positives cannot be guaranteed. Users can inspect and clear signals.

## Feedback with an action

Under the paragraph box in **AI feedback** there are five buttons. Pick one, explain why, then **Submit**:

| Choice | What it does |
|--------|--------------|
| **Move into Smart Focus** | Lists the quest even if nothing else would qualify it, ranks it above other optional work, and keeps it through busy-day trimming. The model cannot veto it, and neither can a future start date, an earlier "Not today", or the list size. Completed, recycled and reminder quests still cannot be brought in. |
| **Take off Smart Focus** | Removes the quest, even high-priority work and even if the model says include. This also applies to quests that are overdue, due today or starting today, because the choice is the user's own; the model and plain-text feedback still cannot hide them. Moving the quest back in, or Forget in Settings, restores it. |
| **Rank higher** / **Rank lower** | For a quest already in the list, pushes it up or down. Every request is one step, and steps add up (a lower cancels a higher), to three at most. Each step moves the quest one whole group, ahead of due date and importance: the groups are overdue or due today, starts today, and everything else. So one higher on a main-list quest puts it ahead of the others in the starts-today group's company, two puts it ahead of everything due today, and a quest that starts today needs just one to reach the very front. Lower mirrors it, down to the very back. Within a group, the more steps, the earlier it sits. The quest is never trimmed by the list size or a busy day, and its reason says "You asked for this to rank higher." The model also gets your reason: it is told to learn what made the quest more or less important or urgent and let that shape its tie-break scores for similar quests. This is separate from placement, so it does not replace an earlier Move into or Take off. Forget the preference in Settings to reset the steps. |
| **Keep it where it is** | Confirms the current placement as correct. Kept in: protected from busy-day trimming with a small boost and a "you confirmed this" reason. Kept out: a small order penalty, not a hard exclusion. |

Move into and Take off are disabled when they would change nothing (the quest is already in, or already out), and Rank higher and Rank lower are disabled for a quest that is not in the list. The selection is optional: a plain paragraph still saves as context. The latest action on a quest replaces an earlier one, and Forget in Private preferences removes its effect.

The saved preference records the `action` and where the quest was (`inFocus`). The model receives both with the written explanation and is told to treat them as positive or negative corrective examples: learn the reasoning for similar quests, but apply the action only to that quest. Move and Take off are enforced by the server after the model's advice, so they work even when AI is unavailable.

## Workload-aware focus

A busy day should be focused on what matters, so Smart Focus lists fewer optional low-priority quests when today is already full. This is one of the general rules every account gets; the numbers live in `DEFAULT_FOCUS_TUNING` (`shared/smart-focus-ai.ts`) and `rankFocus` accepts a tuning argument so a per-account override can be added later.

**How heavy today is.** Only quests already committed to today count: overdue, due today, or starting today (reminders, completed and optional work do not). Pressure is:

`pressure = committed hours + 0.5 × high-priority quests + 0.2 × quests`

High priority means Med-High, High or Pareto. A quest with no duration counts as 30 minutes.

| Level | Pressure | Optional low-priority extras listed | Routine extras |
|-------|----------|--------------------------------------|----------------|
| Light | under 4 | all (as before) | allowed |
| Full | 4 to under 7 | up to 4 | allowed, after non-routine ones |
| Busy | 7 to under 10 | up to 2 | held back |
| Heavy | 10 or more | none | held back |

Worked examples: 3 quests of 30 minutes, none high priority, is 2.1 (light). 5 quests of 30 minutes with 2 high priority is 4.5 (full). 7 quests of 60 minutes with 2 high priority is 9.4 (busy). 6 quests of 90 minutes with 3 high priority is 11.7 (heavy).

**What counts as an optional low-priority extra:** an eligible quest that is not due or starting today, is not high priority, and is not something the user explicitly asked for in feedback. When slots are limited, routine quests (anything that repeats) and quests that are not deadline-type go last. Held-back quests are not backfilled, so the list gets shorter on a busy day.

**Never held back:** quests due, overdue or starting today (even low-priority routines), high-priority work, and quests the user wrote feedback about and the model chose to include.

**The model and the rules.** The model is told the day's workload (level, pressure, minutes, counts) plus each quest's duration and whether it is routine, and is asked to favor high-priority work on busy days. The limits above are applied by the server after the model's advice, so advice cannot bring held-back quests back. The ranking response includes `workload` and `heldBack`, and its message says, for example, "Busy day: 3 lower-priority quests held back." (visible after Refresh now on the Smart Focus settings page).

## Keeps refreshing

Smart Focus is not a once-a-day list. The server re-ranks from your current quests every time it is asked, and the app asks whenever it opens, whenever you come back to it after at least 5 minutes, and every 15 minutes while it stays open and visible. It also re-reads your quest list at those moments, so changes from another device show up. Finishing, adding or editing a quest changes the ranking on its own.

As the essentials are finished, the list makes room. After the protected quests, high-priority work and quests you asked for, any space left up to the list size (10, or more when many quests are protected) is filled with the next most important eligible quests that did not qualify before, in the usual order (earliest due date, then importance, then the model's tie-break). This uses the same low-priority budget as the workload rules, so a busy or heavy day adds nothing, a full day adds a few, and a light day fills the list. It never adds quests with a future start date, ones taken off Smart Focus, ones dismissed today, or ones the model said no to, and routines come in only on days that allow them. Added quests say "Added because your list has room".

## Work-filter priorities

An account can carry a small profile that weights quests by their work filter (Apple, General, MW, ...). Each filter has a weekday and a weekend weight, in importance levels: a quest's importance is shifted by that many levels (limited to three either way) before Smart Focus orders and qualifies it. The weighted importance is used for the usual order (due date, then importance, then the model's tie-break), for whether a quest counts as high priority, and for which optional quests a busy day holds back. It never overrides the hard safeguards: overdue, due-today and starting-today quests stay listed.

The owner's account is preloaded with Apple at +1 on weekdays (Monday to Friday) and -1 on weekends (Saturday and Sunday), judged in the account's timezone. So an Apple Medium ranks level with a Med-High on weekdays, and a General Medium outranks an Apple Medium on weekends. An Apple quest's reason says so ("Apple work counts for more on weekdays."). The older Apple checkbox counts as the Apple filter, and filter names are matched without regard to case. The profile is sent to the model with each quest's work filter, and is read-only on Settings, under Smart Focus, "Work priorities". It is kept when preferences are forgotten, and accounts without a profile are unaffected.

Stored in the account's Smart Focus memory as `profile.workFilters`, for example `{"Apple": {"weekday": 1, "weekend": -1}}`. `add-smart-focus-apple-priority.cjs` writes it (merging, idempotent, `--dry` to preview).

## Feedback takes effect immediately

When you submit AI feedback with a choice, the change is made on the list you are looking at right away: Take off removes the quest, Move into adds it just below what is overdue, due or starting today, and Rank higher or Rank lower moves it to the front or back of its group. A "Smart Focus updated" message confirms it even if the quest's card disappears. The app then asks the server to re-rank, and that answer replaces the instant one.

On the server, saving feedback clears the cached ranking, and a ranking that started before the feedback is never reused after it, even if the AI call was still running. The AI is called at most once a minute per account. Inside that minute, your change is applied on top of the model's last scores (kept in memory, and dropped when preferences are forgotten or Smart Focus is turned off), so the rest of the order does not reshuffle. About 65 seconds after feedback the app asks again, which is when the AI reads your written reason.

## Persistence and privacy

Memory is stored under an account-scoped `smart-focus:` key in the existing `user_kv` table. No new schema or migration is required. Compare-and-swap updates prevent simultaneous requests from silently overwriting each other.

There is no browser-localStorage preference mirror and no training/fine-tuning job. Memory is reusable stored context, not a model that runs offline. OpenAI calls explicitly use `store: false`; this is not a promise of zero provider retention. The application's API logging excludes Smart Focus response bodies.

The provider receives a maximum of 100 eligible candidates: IDs, bounded title/description, importance, type, and dates, plus all retained written preferences. It receives no account email, unrelated journals, credentials, or other users' tasks. If there are more than 100 candidates, the UI message discloses that AI reviewed a subset; date safeguards cover the complete list.

Limits: 3,000 characters per feedback item; 100 items / 30,000 total feedback characters. At capacity, saving fails visibly rather than silently forgetting an older preference. Dismissal history retains at most 500 events; only the most recent 30 days influence ranking.

## Reliability and cost

- Input-sensitive, per-account ranking cache: 15 minutes. Quest edits, account-local date changes, and memory changes invalidate results.
- No background polling. Same-account concurrent ranking calls are combined; at most one paid generation is started per account per minute.
- Provider timeout: 20 seconds, no automatic provider retries. Failures are cached briefly to avoid retry storms.
- Missing keys, exhausted API credits, rate limits, malformed model output, or provider errors produce an explicitly labeled **rules-based** list. Saved feedback is preserved.
- After feedback during the one-minute cooldown, Refresh may temporarily return rules. Refresh after the minute to obtain a new AI result.
- AI inference needs an internet/server connection. If the server itself cannot be reached, the client labels its existing local-rule fallback or last available ranking; it does not claim a new AI result.

## API and tests

All `/api/smart-focus/*` routes require the authenticated session and use its account ID, never a client-supplied owner.

- `GET /state`
- `POST /rank`, optionally `?refresh=1`
- `PATCH /settings` with `{enabled}`
- `POST /feedback` with `{taskId, text}`
- `POST /dismiss` with `{taskId, undo?}`
- `DELETE /preferences/:id`, `/signals/:taskId`, or `/memory`

Tests: `shared/smart-focus-ai.test.ts`, `server/smart-focus.test.ts`, and `client/src/components/smart-focus/select-focus.test.ts`. They cover protective rules, cap overflow, account isolation, timezone boundaries, explicit feedback exclusions, signal thresholds/expiry, Undo, caching, and provider failure. Tests use synthetic tasks and mocked provider advice; live provider access must be checked separately.

See [AI_SMART_FOCUS_TEST_CASES.md](AI_SMART_FOCUS_TEST_CASES.md) for step-by-step UI, API, provider and regression cases, with automated coverage clearly distinguished from manual acceptance checks.
