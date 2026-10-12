# AI Smart Focus — test cases

Read [AI_SMART_FOCUS.md](AI_SMART_FOCUS.md) for architecture, API contracts, guardrails, limits, and provider configuration. Run `npm run test:focus` for automated API/ranking/selection coverage. UI interaction cases below are manual acceptance checks, not claims of automated browser coverage.

Use synthetic quests and two test accounts, A and B. Set the account timezone explicitly and use its current calendar day.

## Selected-task action bar

1. **Single selection (desktop):** select one quest using the existing selection action. The bottom action bar alongside Complete Selected, calendar actions, Categorize Skill, and Reschedule contains **AI feedback**. Click it: the paragraph dialog names precisely that selected quest.
2. **Single selection (mobile):** select a quest in a narrow viewport. AI feedback is directly visible beside the selected-count controls; opening it must not require the per-card ellipsis menu.
3. **Multiple selection:** select two quests and click AI feedback. A chooser lists only selected quests. Choose B: the feedback dialog names B and submits B's ID only. Neither A nor every selected quest should receive a copy.
4. **Cancel:** close the chooser or paragraph dialog. Nothing is submitted, selected quests remain selected, and no quest field changes.
5. **No selection:** clear selection. The selected-task action bar disappears. The independent card/detail AI feedback menus still work.
6. **Outside Smart Focus:** switch to All, select a quest absent from Smart Focus, and submit why it matters. Its private feedback is saved and can influence the next AI ranking.
7. **Validation and retry:** whitespace-only input cannot submit; text is limited to 3,000 characters. Simulate a network error: retain the paragraph, show the error, and allow retry without losing the text.
8. **Success:** submit a paragraph, check confirmation, and open Private preferences. Verify text and quest title. Reload and confirm persistence. Existing selection-bar actions remain usable.

## Accounts and memory

9. **Isolation [automated API]:** B cannot submit feedback or dismissal for A's task ID. B sees none of A's preferences. Deleting A's preference ID through B does not delete A's record.
10. **Authentication [automated API]:** all state, settings, ranking, feedback, dismissal, and deletion endpoints reject unauthenticated requests.
11. **Review and forget [automated API + manual UI]:** forget one preference or signal; verify only that item disappears. Confirm Clear memory removes all feedback/signals for the signed-in account but leaves quests unchanged.
12. **Memory capacity [manual API]:** at 100 items or 30,000 total characters, another save returns a visible conflict; it must not silently discard old feedback.

## Ranking and learning

13. **Protected dates [automated]:** overdue/due-today/start-today tasks remain despite negative model advice, dismissal history, or more than ten protected tasks. Not today returns a clear refusal for protected work.
14. **Exclusions [automated]:** completed, recycled, and reminder-type quests cannot enter from model suggestions. Future-start work remains out unless already due/overdue.
15. **Missing work [automated]:** valid AI advice can include an undated task. Explicit feedback can exclude a non-protected target but never protected work.
16. **Implicit signals [automated]:** multiple removals on one date count once. Three distinct days within 30 days produce only a small task-specific demotion. Old signals expire; unrelated tasks are unaffected.
17. **Undo [automated API + manual UI]:** Not today removes a non-protected item for the account-local day. Undo toast restores eligibility even after the card unmounts. A future day is not permanently excluded.
18. **Rendered selection [automated]:** server order is preserved, protected overflow is not recapped at ten, and stale completed/missing/reminder IDs do not render.
19. **Timezone [automated API]:** when UTC is tomorrow but the account timezone is still today, the API uses the account's day.

## Provider and fallback

20. **Enable consent [manual UI]:** AI starts disabled. Enabling explains that relevant quest text and feedback go to OpenAI. Disabling stops future provider requests without deleting memory.
21. **Cache/concurrency [automated API]:** identical concurrent or cached requests produce one model call, not one per request.
22. **Failure [automated API]:** a provider failure returns an explicitly labeled rules result, preserves saved memory, and is cached briefly rather than retried continuously.
23. **Quota [manual integration]:** exhausted credits show the provider-credit message and rules mode, not a claim of live AI ranking.
24. **Live integration [requires funded API]:** provide synthetic tasks and feedback, refresh after cooldown, confirm an AI response passes validation, is displayed in the list, and gives reasons. Do not use actual private account data for a smoke test.
25. **Accessibility/responsiveness [manual UI]:** navigate the selected-task button, chooser, paragraph, submit and close controls by keyboard; check readable light/dark themes and phone layout.
