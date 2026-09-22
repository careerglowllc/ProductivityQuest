# Life OS Journal UI — implementation reference

## Purpose

`journal-ui.html` is a standalone visual and interaction prototype for the **Gratitude Journal** route. It intentionally opens directly into the working gratitude experience, rather than a marketing page or an admin-style dashboard. The visual direction is **quiet editorial utility**: the Life OS navy navigation and compact controls are retained, while the journal uses warm paper, muted sage, dusty rose, and an Instrument Serif editorial display face to make private reflection feel inviting.

The HTML is a reference implementation only. Production must preserve the existing React APIs, hooks, storage synchronization, attachment contracts, and business logic. Do not replace the existing React pages or server-backed storage with this file.

## Files

- `journal-ui.html` — self-contained responsive UI prototype; no build step.
- `README_JOURNAL_UI_IMPLEMENTATION.md` — implementation handoff and acceptance criteria.

## Routes and related navigation

The production route map represented by the Journal navigation is:

| Route | Purpose |
| --- | --- |
| `/journal` | Journal home: essays/reflections list and editor |
| `/journal/daily-glew` | Daily GLEW reflection |
| `/journal/empowering-thoughts` | Current empowering thoughts/beliefs |
| `/journal/gratitude` | This experience; the primary implementation target |
| `/journal/excitement` | Excitement journal |
| `/journal/weekly-planning` | Weekly deep planning |
| `/reference-beliefs` | Reference beliefs |
| `/accomplishments` | Accomplishments |
| `/explore` | Explore |
| `/fitness` | Fitness |
| `/recipes` | Recipes |

In the prototype, related links are intentionally lightweight anchors/placeholders except for the current file. In React, use the existing router and make every related link a real route. Preserve the existing Life OS desktop navigation and mobile bottom navigation conventions.

## Shared vs. route-specific UI

**Shared Life OS shell**

- Desktop sidebar, Life OS mark, profile block, top breadcrumb bar, date chip, and mobile bottom navigation.
- Shared typography rhythm, button treatment, focus states, responsive breakpoints, and reduced-motion behavior.
- Inline SVG icons only. Do not introduce emoji characters into the UI.

**Gratitude-specific**

- Editorial hero: “Gratitude, kept close.”
- Related journal navigation with Gratitude active.
- Quick-add composer with optional icon selector and attachment affordance.
- Search, count, undo/redo, CSV export, entry list, inline editor, delete confirmation, and empty/search states.
- Gratitude-specific copy and the `journal-gratitude-v1` storage key.

The same component patterns can be shared with `journal-excitement.tsx`, but color, copy, and route-specific storage keys must remain distinct.

## Data model and storage

The production gratitude entry shape is:

```ts
type GratitudeEntry = {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
  emoji?: string; // existing React API name; optional
  attachments?: QuestAttachment[];
};
```

The exact production storage key is:

```ts
const STORAGE_KEY = "journal-gratitude-v1";
```

The current React page reads/writes a JSON array under this key. `localStorage` is the fast, offline-capable cache. Because the key begins with `journal-`, it is included in the existing `synced-storage.ts` prefix whitelist and is mirrored to the authenticated user’s `/api/user-data` store. The server is the source of truth after hydrate; periodic refresh can update an already-mounted page through `subscribeUserDataRefresh`. Do not add a second storage key, direct raw API call, or a parallel server schema.

The standalone prototype deliberately uses the isolated key `journal-gratitude-ui-demo-v1` so preview interactions cannot modify production gratitude data. It seeds three sample entries only when that demo key is absent, then persists preview edits locally. Production must continue using `journal-gratitude-v1` and should not seed sample data for a real user.

## Behavior contract

### Add

- Trim the draft; an empty draft must not create an entry.
- Enter adds the entry; Shift+Enter remains available for a multiline draft.
- New entries receive a unique `gratitude-${timestamp}-${random}`-style id and an ISO `createdAt`.
- The optional icon selector is a visual reference for the existing React `EmojiPicker` contract. Production should keep the `emoji` field/API behavior even if the redesigned picker uses a more restrained visual treatment.
- The attachment affordance must use the existing `AttachmentArea` and `QuestAttachment` implementation. The prototype shows a selected filename only and does not upload or persist file bytes.
- Clear draft, icon, and attachment selection after a successful add.

### Edit

- Edit is inline on the entry, not a route change.
- Prefill the current text and attachments.
- Cancel restores read mode without changing data.
- Save trims text and refuses an empty replacement.
- “Update date to today” replaces `createdAt` with a new ISO timestamp; otherwise retain the original date.
- Preserve attachments when editing unless the existing `AttachmentArea` changes them.

### Delete

- Delete opens an explicit confirmation dialog.
- Cancel/overlay click keeps the entry.
- Confirm removes only the selected id and closes the dialog.
- Production uses the existing toast action to offer Undo.

### Undo and redo

- Every mutating action represented by the React page should snapshot the previous list: delete, edit, and icon changes. The prototype additionally snapshots add for a complete reference interaction.
- A fresh mutation clears redo.
- Undo restores the previous array and makes the undone state redoable.
- Redo reapplies the state and restores Undo.
- Disabled buttons must be visibly and semantically disabled when no action is available.
- Keep the existing React `persistWithUndo` semantics and toast behavior.

### Search and states

- Search is case-insensitive and matches entry text.
- Count reflects filtered results, with singular/plural wording.
- Search with no matches shows a composed “Nothing found here” state and a clear next step.
- No entries shows a composed first-note state.
- Search is not destructive; clearing it restores the full list.

### CSV export

- Export is disabled or inert when the collection is empty.
- Production must use the existing `buildGratitudeCSVExport`, `rowsToCSV`, and `downloadCSV` utilities.
- Required columns remain `Emoji`, `Entry`, and `Date Added`; preserve CSV quoting/escaping and the date-stamped `gratitude-journal.csv` filename behavior.
- The prototype includes the attachment column as a visual reference convenience; production should follow the approved existing export contract unless the API is intentionally expanded.

## Responsive rules

- Use `min-height: 100dvh`; do not rely on a fixed viewport height.
- Desktop: persistent sidebar, topbar, centered content column, inline toolbar actions.
- At approximately 900px and below: hide sidebar, show fixed bottom navigation, preserve safe bottom padding, allow related routes to scroll horizontally.
- At approximately 600px and below: stack hero content, let search occupy a full toolbar row, wrap composer actions, keep Add entry reachable, and keep edit/delete actions visible on touch devices.
- Never hide critical actions behind hover alone. Desktop hover can reveal affordances, but keyboard and touch must still expose them.
- Respect safe-area insets in the production mobile bottom navigation.

## Accessibility

- Use semantic `nav`, `main`, `header`, `section`, `article`, `button`, `label`, and form controls.
- Every icon-only control needs an accessible name and a useful `title` where appropriate.
- Preserve visible keyboard focus; do not remove outlines without an equivalent focus style.
- Dialogs must use `role="dialog"`, `aria-modal="true"`, a labelled heading, focus placement, Escape dismissal, and focus return in React.
- Search and entry list updates should be announced with an appropriate live region without becoming noisy.
- Do not communicate meaning by color alone. Disabled states must use both opacity and native `disabled`.
- The existing production attachment and icon controls must remain keyboard accessible.

## Motion and reduced motion

The reference uses short transform/opacity transitions for hover, entry elevation, toast reveal, and control feedback. Production should animate only `transform` and `opacity` for inexpensive interactions. Keep the editorial page calm: no looping decorative animation, parallax, or attention-grabbing glow.

`@media (prefers-reduced-motion: reduce)` must disable transitions and smooth scrolling, while leaving the interface fully usable. Never use motion to convey information that is unavailable in the static state.

## Acceptance checks

1. Open `journal-ui.html` directly from the workspace root; the actual Gratitude Journal interface appears with no build step.
2. The file contains no emoji characters in visible UI copy and uses inline SVG/CSS icons.
3. At desktop width, the Life OS shell, hero, related navigation, composer, toolbar, and three sample entries are all readable without the deeply dark reference styling.
4. At a narrow mobile width, the sidebar becomes bottom navigation, the composer and toolbar remain usable, and no horizontal page overflow occurs.
5. Add a text-only entry, add one with an icon, select an attachment, and verify the visible state resets after adding.
6. Search filters entries and produces both a no-match state and a clear state.
7. Edit, cancel, save, and “Update date to today” all work.
8. Delete requires confirmation; cancel preserves the entry; confirm removes it.
9. Undo and redo restore the expected list states and are disabled when unavailable.
10. CSV export downloads a readable, escaped file with the expected core columns.
11. Refreshing the standalone file preserves preview entries under the isolated `journal-gratitude-ui-demo-v1` key without touching production gratitude data.
12. Production integration continues to use the existing React route components, `subscribeUserDataRefresh`, synced-storage behavior, `EmojiPicker`, `AttachmentArea`, CSV helpers, and toast system.
13. Keyboard users can reach every control; dialogs are labelled; reduced motion removes nonessential animation.