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
8. **Success:** submit a paragraph, check confirmation, and open Private preferences from Settings → Smart Focus. Verify text and quest title. Reload and confirm persistence. Existing selection-bar actions remain usable.

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

20. **Enable consent [manual UI]:** Smart Focus starts disabled. Enabling it on Settings → Smart Focus first explains that relevant quest text and feedback go to OpenAI. Disabling stops future provider requests without deleting memory.
21. **Cache/concurrency [automated API]:** identical concurrent or cached requests produce one model call, not one per request.
22. **Failure [automated API]:** a provider failure returns an explicitly labeled rules result, preserves saved memory, and is cached briefly rather than retried continuously.
23. **Quota [manual integration]:** exhausted credits show the provider-credit message and rules mode, not a claim of live AI ranking.
24. **Live integration [requires funded API]:** provide synthetic tasks and feedback, refresh after cooldown, confirm an AI response passes validation, is displayed in the list, and gives reasons. Do not use actual private account data for a smoke test.
25. **Accessibility/responsiveness [manual UI]:** navigate the selected-task button, chooser, paragraph, submit and close controls by keyboard; check readable light/dark themes and phone layout.

## Settings page and the on/off state

26. **Settings entry [automated + manual]:** Settings lists **Smart Focus** and opens `/settings/smart-focus` (route, list entry and notice link share one path). The page has Enable/Disable, Refresh now (only while enabled) and Private preferences.
27. **Disabled tab [automated + manual UI]:** with Smart Focus disabled, the Smart Focus tab lists no quests and no reminders strip, shows "Smart Focus is off" with "Go to the Smart Focus page in settings to adjust" and a working link, the tab chip shows no count, and no `/api/smart-focus/rank` call is made.
28. **Enabled tab [manual UI]:** after enabling, the tab lists quests with no explanation panel above them, and the reminders strip returns. Other filters are unaffected by the setting.
29. **Loading and error [automated + manual UI]:** while the setting loads the tab shows a loading line (never a flash of quests); if loading fails it shows a retry message, not quests.
30. **Panel removed [automated]:** the Quests page has no "Smart Focus / Rules-based" panel and no Disable AI, Refresh or Private preferences buttons.
31. **Provider status [manual UI]:** with credits exhausted, Refresh now on the settings page reports "Rules-based: ... exhausted credits or quota"; the Quests tab keeps listing the rules-based quests silently.
32. **Consent [manual UI]:** Enable shows the OpenAI notice; "Keep it off" leaves Smart Focus disabled and the tab empty.

## Workload-aware focus

See "Workload-aware focus" in [AI_SMART_FOCUS.md](AI_SMART_FOCUS.md) for the formula and limits. Optional low-priority quests below have a start date in the past, importance Low, and are not due or starting today.

33. **Light day keeps extras [automated]:** 2 quests due today (30 min each), 6 optional low-priority quests. All 6 are listed; no "held back" text; `workload.level` is `light`.
34. **Full day trims to 4 [automated]:** 5 quests due today (30 min, 2 high priority) and 7 optional low-priority quests. Only 4 are listed, 3 are held back, message says "Full day: 3 lower-priority quests held back."
35. **Busy day [automated]:** 7 quests due today (60 min, 2 high priority) with 3 non-routine and 2 daily low-priority extras. Only 2 non-routine extras are listed; no routine is listed.
36. **Heavy day [automated]:** 6 quests due today (90 min, 3 high priority), 3 low-priority extras and one Pareto extra. Only the Pareto extra is listed.
37. **Routines go last [automated]:** on a full day with 5 weekly routines and 2 one-time low-priority extras, both one-time quests are listed and routines fill only the remaining slots. With a tighter tuning, a deadline-type quest beats a general one.
38. **Never held back [automated]:** low-priority routines that are themselves due today stay listed on a heavy day; a quest the user explicitly wrote feedback about (and the model included) also stays.
39. **AI cannot override [automated]:** on a heavy day, advice with include=true and score 100 for the low-priority extras does not list them.
40. **Load inputs [automated]:** more high-priority quests, more quests, or longer quests each raise the pressure; reminders, completed, optional and future-start quests do not; a missing duration counts as 30 minutes.
41. **Tuning override [automated]:** passing a custom tuning changes the level thresholds and extras limits (the hook for per-account tuning later).
42. **API [automated]:** `POST /api/smart-focus/rank` returns `workload` and `heldBack`, and the model request receives the workload.
43. **Live feel [manual]:** with 7 long quests due today, Refresh now on Settings → Smart Focus reports a busy day, and the Smart Focus tab shows few low-priority routines; after finishing most of them and refreshing, more optional quests return.

## Feedback actions (move in, take off, keep)

44. **Choices under the explanation [automated + manual UI]:** open AI feedback for a quest. Directly under the paragraph box are three buttons: **Move into Smart Focus**, **Take off Smart Focus**, and **Keep it where it is** (worded "Keep it in" / "Keep it out of" Smart Focus once placement is known). There is a **Submit** button and a Cancel button.
45. **Highlight [automated + manual UI]:** clicking a choice highlights it (pressed state); clicking it again, or another one, changes or clears the selection. Choosing nothing still allows a text-only preference.
46. **Placement-aware choices [automated]:** for a quest already in Smart Focus, Move is disabled; for one that is not, Take off is disabled. When placement is unknown all three are enabled.
47. **Explanation prompt [automated]:** the placeholder and label change with the choice (why move it in, why take it off, why keep it here).
48. **Submit sends the action [automated API]:** `POST /api/smart-focus/feedback` accepts `action` (`include`, `exclude`, `keep`) and optional `inFocus`; an unknown action or non-boolean `inFocus` returns 400. When `inFocus` is omitted for an action, the server works it out from the last ranking or the rules.
49. **Move into Smart Focus [automated]:** a low-priority quest with no dates is listed after "move in", ranks above other optional work, survives the model saying no and a heavy day, and shows "You moved this into Smart Focus." A future-start quest is brought in too, a "Not today" from earlier that day does not block it, and it is never cut off by the list size. Completed, recycled and reminder quests still cannot be brought in.
50. **Take off [automated]:** a high-priority quest taken off disappears even if the model says include. A quest that is due, overdue or starting today is removed too, because the choice is the user's own; the model and plain-text feedback still cannot hide it. Moving it back in (or Forget in Settings) restores it.
51. **Keep it in [automated]:** the quest is not held back on a busy day and shows "You confirmed this belongs in Smart Focus."
52. **Keep it out [automated]:** a small order penalty only; it is not a hard exclusion.
53. **Latest action wins [automated]:** move in, then later take off: the quest is off. Older text-only preferences have no action and change nothing by themselves.
54. **Teaching the model [manual with a funded key]:** after a few actions with explanations, refresh on Settings → Smart Focus. The request to the model includes each preference's `action` and `inFocus`; confirm the next ranking reflects the reasoning on similar quests without applying the action to other quests.
55. **Private preferences [manual UI]:** Settings → Smart Focus → Private preferences lists each preference with a badge ("Moved into Smart Focus", "Taken off Smart Focus", "Kept in/out of Smart Focus"); Forget removes the effect.
56. **Default order [automated]:** due or overdue today first, then quests starting today, then everything else. Within a group the earliest due date comes first (undated last), then higher importance. A model score never lifts a lower-importance quest above a higher one with the same due date.
57. **Model tie-break [automated]:** only quests with the same due date and importance are ordered by the model's score; without advice they fall back to id order.
58. **Moved in leads [automated]:** a quest the user moved into Smart Focus leads its group even above higher-importance work.
59. **Full day, no room [automated]:** with 12 quests due today and a backlog of low-priority work, the list is the 12 and no backlog quest is added.
60. **Finishing makes room [automated]:** after 9 of those 12 are completed, the remaining 3 lead, the list fills to 10 with the next most important backlog quests, the message says "7 more added because your list has room", and each shows "Added because your list has room".
61. **Same order for what comes in [automated]:** added quests follow earlier due date, then importance. The list never grows past its size or the day's low-priority budget (a heavy day adds nothing). Future starts, taken-off, dismissed-today, model-rejected, completed and reminder quests are never added, and routines only on days that allow them.
62. **Refresh when opened or revisited [automated helper + manual]:** reopening the app, returning to the tab after 5 or more minutes, or leaving it open 15 minutes re-reads quests and re-ranks (Network tab shows `GET /api/tasks` then `POST /api/smart-focus/rank`). Complete several quests, wait or switch away and back, and confirm the list shows the next most important quests. Returning within 5 minutes does not refetch.
63. **Apple on weekdays [automated]:** with the profile, an Apple quest ranks above equal General, MW and GPR quests on Monday and Friday. Without the profile, nothing changes.
64. **Apple on weekends [automated]:** on Saturday and Sunday the same Apple quest ranks after the other work filters.
65. **A level, not an override [automated]:** an Apple Low still ranks below a General Medium; an earlier due date and a bigger importance gap still win; a tie on weighted importance falls to the usual tie-break.
66. **Reason and old flag [automated]:** an Apple quest's reason ends "Apple work counts for more on weekdays." or "for less on weekends."; the older Apple checkbox and loose spelling (" apple ") count as Apple; other filters get no note.
67. **High priority and busy days [automated]:** on a heavy weekday an Apple Medium (counts as Med-High) is not held back, while a General Medium is. Bad or huge weights are clamped to three levels or ignored.
68. **API [automated]:** `GET /api/smart-focus/state` returns the profile; ranking differs between a Tuesday and a Saturday; Forget everything keeps the profile.
69. **Settings note [manual UI]:** Settings → Smart Focus shows "Work priorities: Apple: up 1 importance level on weekdays, down 1 importance level on weekends" for the owner's account, and nothing for accounts without a profile.
70. **Choices [automated]:** the feedback dialog offers Move into, Take off, **Rank higher**, **Rank lower** and Keep, in that order. For a quest outside Smart Focus, Rank higher, Rank lower and Take off are disabled (hint "Only for quests in your Smart Focus list"); when placement is unknown all are available. The explanation prompt and label follow the choice.
71. **Rank higher / lower [automated]:** a rank higher quest moves to the front of its group even above higher importance or an earlier due date; rank lower moves it to the back. Overdue and due-today work still comes first. Within today's committed work they reorder it.
72. **Latest wins, placement untouched [automated]:** a later rank request replaces an earlier one; a rank request does not replace a Move into (the quest stays moved in and still leads, ranked within that group).
73. **Never trimmed, and explained [automated]:** a quest the user ranked is not held back on a heavy day or cut by the list size, and shows "You asked for this to rank higher/lower."
74. **API and badges [automated + manual UI]:** `POST /api/smart-focus/feedback` accepts `higher` and `lower` (an unknown action returns 400), answers "now ranks higher/lower in Smart Focus", and the next `POST /rank` follows it. Settings → Smart Focus → Private preferences shows "Ranked higher in Smart Focus" / "Ranked lower in Smart Focus".
75. **Teaching the model [manual with a funded key]:** after ranking a few quests with reasons, refresh and confirm similar quests tied on due date and importance order the way the reasons suggest.
76. **Instant list change [automated]:** after Take off, Move into, Rank higher or Rank lower, the list on screen changes before any server answer: Take off removes the quest (and lowers the count), Move into inserts it at the front of the main group below due-today and starts-today work, Rank higher or lower moves it within its own group only. Keep, an unlisted quest and an unknown id change nothing, and the cached ranking is not mutated.
77. **Toast [manual UI]:** submit Take off on a quest in Smart Focus. The card disappears and a "Smart Focus updated" message appears with the server's confirmation.
78. **On top of the AI's last scores [automated API]:** with an AI ranking already made, feedback within the one-minute pause re-ranks at once without a new AI call, keeping the AI's order for the other quests ("AI-assisted order. Your latest changes are applied now..."); Take off and Move into also apply at once. Forgetting preferences drops the remembered scores and the ranking falls back to rules.
79. **No stale ranking [automated API]:** with an AI call still running, saving feedback and then asking for the ranking returns one that already reflects the feedback, without waiting for the slow call, and the slow call's own answer is corrected for the feedback too.
80. **Follow-up [manual UI]:** about 65 seconds after feedback the app asks for the ranking again (Network tab: `POST /api/smart-focus/rank`), which is when the AI reads the written reason.
