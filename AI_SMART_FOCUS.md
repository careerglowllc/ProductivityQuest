# Personalized AI Smart Focus

Smart Focus uses OpenAI's `gpt-4o-mini` plus deterministic safeguards. It is **not a separately trained model** and does not use a person's ChatGPT account. One server-side `OPENAI_API_KEY` serves the application; preference memory is private to each authenticated app account.

## Using it

1. Open Quests → Smart Focus → **Enable AI**. The consent notice explains that relevant quest content and saved feedback will be sent to OpenAI.
2. Any quest card or quest-detail menu includes **AI feedback**. Enter a paragraph explaining priority, exclusions, missing work, or broader working preferences. It can be saved with AI off and survives restarts.
3. **Refresh** reranks the list. Reasons appear on recommended quests. Missing tasks can be added by the AI even without due dates.
4. **Not today** sets a non-protected quest aside until the next account-local day. Undo is offered in the confirmation toast; individual dismissal history can also be forgotten in Private preferences.
5. Review or forget individual written preferences and signals in **Private preferences**, or confirm clearing all memory. Disabling AI retains memory but stops provider calls and implicit demotion.

Saving feedback does not edit a quest's importance field, dates, completion state, reminders, or other properties. It changes recommendation context. A saved preference can affect multiple tasks when its wording is general; task-specific negative feedback can exclude its non-protected target. The model's advice is never permission to hide protected work.

## Hard safeguards

- Account timezone determines “today,” including daylight-saving boundaries.
- Overdue/due-today work and quests starting today are protected. AI and Not today cannot remove them.
- All protected quests are shown even when there are more than ten. Otherwise the target list size is ten.
- Completed/recycled quests and standing **reminder-type quests** stay out of the work queue. Reminders keep their separate strip.
- Future-start quests cannot enter unless already due/overdue. Missing dates do not block high-priority work.
- High-priority ready work, reached start dates, and important near-term deadlines qualify under server rules. Model scores can reorder non-protected work; deadline type receives an additional priority weight.
- An explicit dismissal lasts only for that day. Repeating it several times on one day counts once.
- Implicit learning requires at least **three distinct dismissal days within 30 days**. It applies only a small, reversible penalty to that exact quest, and only while AI is enabled. It never creates a category-wide preference or permanently excludes a task.
- Completion, filtering/search, changing dates, and ignoring a task are **not** treated as dislike signals.
- Zero false positives cannot be guaranteed. Users can inspect and clear signals.

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
