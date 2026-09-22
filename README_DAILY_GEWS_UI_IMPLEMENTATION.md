# Life OS Daily GLEW UI — implementation reference

## Purpose and direction

`daily-gews-ui.html` is a standalone visual and interaction reference for the Daily GLEW route. It uses the crafted editorial Life OS family from `journal-ui.html`: navy shell, warm paper, Instrument Serif display type, DM Sans body text, and Space Mono metadata. The four categories use deliberate emotional color: blue for Sadnesses, ochre for Gratitudes, sage for Wins, and terracotta for Exciteds.

This HTML is a visual/interaction reference only. Production must preserve the existing React logic, synced-storage behavior, `AttachmentArea`, CSV helpers, toast behavior, and `useSwipeDownToClose`. It must not replace the production page or introduce a parallel server schema.

## Routes and shared Journal shell

Production route: `/journal/daily-gews`.

The page belongs inside the existing Journal shell and should retain:

- the Life OS desktop navigation/sidebar, profile block, breadcrumb/top bar, and mobile bottom navigation;
- Journal-related navigation for Journal home, Daily GLEW, Gratitude, Excitement, Empowering Thoughts, and Weekly Planning;
- the existing router and route-level page composition rather than links that merely simulate navigation;
- shared focus states, warm editorial surfaces, responsive safe-area padding, and reduced-motion behavior.

## Storage and types

Production storage remains exactly:

```ts
const STORAGE_KEY = "journal-daily-gews-v1";
```

The prototype uses only this isolated demo key:

```ts
const DEMO_STORAGE_KEY = "journal-daily-gews-ui-demo-v1";
```

The demo key must never read, write, migrate, delete, or otherwise touch `journal-daily-gews-v1`. It seeds tasteful sample data only when the demo key is absent. Production must not seed sample data.

Production types:

```ts
type GlewCategory = "gratitudes" | "wins" | "exciteds" | "sadnesses";

type GlewLine = {
  text: string;
  attachments?: QuestAttachment[];
};

type GlewEntry = {
  date: string; // YYYY-MM-DD
  gratitudes: GlewLine[];
  wins: GlewLine[];
  exciteds: GlewLine[];
  sadnesses: GlewLine[];
  updatedAt: string;
};
```

The exact visual and CSV category order is:

```ts
const CATEGORY_ORDER: GlewCategory[] = [
  "sadnesses",
  "gratitudes",
  "wins",
  "exciteds",
];
```

Legacy entries whose category arrays contain plain strings must be normalized to `{ text, attachments: [] }` before rendering or mutation. Preserve any existing attachment arrays during normalization.

## Preferred capture UX

The primary production interaction should be a compact single-reflection composer, not a four-section form or mandatory dialog. It should sit above history like the approved Gratitude Journal composer:

- One textarea and one category icon control on the left. The initial category is `sadnesses` (Sadnesses).
- The icon opens an accessible picker with Sadness, Gratitude, Win, and Excited choices. The selected icon, accessible label, color, prompt, and placeholder update together. Category meaning must also be written as a label; color is never the sole signal.
- The composer has an optional attachment affordance using the existing `AttachmentArea` contract.
- Enter without Shift immediately appends one reflection to today's entry. Shift+Enter inserts a newline. The selected category remains selected after save so a user can rapidly record several reflections of the same kind; the draft and attachment selection clear.
- If today has no entry, create today's `GlewEntry`. If today already exists, append to its selected category array. Never create a second record for today's date.
- History is individual-line-first: each saved reflection is easy to scan under its date, with a visible category label/icon, optional attachment indicator, edit action, recategorize action, and delete action. Complete-day editing remains available from the day header as a secondary path for date changes or batch cleanup, not as the normal capture flow.

This is a deliberate improvement over a four-section editor: the fast path is always visible, one thought is saved at a time, and the day list explains the emotional shape of a day without forcing the user to open a form.

## Behavior contract

- There is one entry per date. Opening today must open the existing entry when today already exists; it must never create a duplicate or blank replacement.
- The date control supports selecting another date. Saving an edited entry removes its original date and applies the selected date.
- If the selected date already exists, the save collision follows the existing React behavior: the selected date is replaced by the saved form, leaving one entry for that date.
- Each category remains an array of multiple lines even though capture is one line at a time. A line can be appended from the composer or managed in the complete-day editor.
- Per-line edit trims and replaces text without changing category. Per-line delete removes only that line. Per-line recategorize removes it from its original array and appends the same `GlewLine` to the selected category, preserving attachments.
- A composer save is an immediate daily save: update `updatedAt`, persist the one date record, refresh the day list, and toast the result. The selected category should remain selected for rapid repeat capture.
- Save must auto-commit non-empty text still sitting in any category draft input. Typed drafts must not disappear merely because the user presses Save before pressing Add.
- Each composer line has an optional attachment affordance. Production must use `AttachmentArea` and `QuestAttachment`; the prototype only exposes a filename affordance and does not upload bytes. When a line is edited or recategorized, preserve its attachments unless `AttachmentArea` explicitly changes them.
- Existing lines can be edited or removed before the daily save. Empty replacement text is rejected.
- Daily save, edit, and delete are complete interactions. Delete requires confirmation and production uses the existing toast with Undo. Individual line deletion uses the same mutation/undo contract. Complete-day editing is secondary and may remain a responsive dialog/drawer for date changes and batch maintenance.
- Days are listed chronologically in the UI contract (newest first is the approved display used by the current React page); each day shows category counts and a useful preview.
- Include a composed empty state and a composed no-search-results state.
- Undo and redo snapshot the full entry array around every mutating action. A fresh mutation clears redo; undo creates a redoable state; redo restores undo. Keep the existing `persistWithUndo` and toast semantics.
- Search is case-insensitive and non-destructive.

## CSV contract

Production must use the existing `rowsToCSV` and `downloadCSV` helpers, not a replacement serializer. The Daily GLEW export is one row per line, sorted by date and then `CATEGORY_ORDER`, with these exact columns:

```text
Date,Category,Entry,Attachments
```

The Date value is the formatted full date, Category is the human label, Entry is the line text, and Attachments is empty or `N file(s)`. Preserve the existing date-stamped `daily-gews.csv` filename behavior. The composer always appends against today's local calendar date; only the secondary complete-day editor changes dates. Production writes through synced-storage and must not add raw fetch calls or a second persistence layer.

## Responsive editor and gesture behavior

Desktop uses a centered dialog with a scrollable editor. Mobile uses the bottom-aligned responsive dialog/drawer shown in the prototype, with a visible grab handle, safe-area padding, reachable Save and Cancel controls, and category sections that remain usable without horizontal overflow. Production must use the existing `useSwipeDownToClose` hook for swipe-down dismissal; a downward gesture on the drawer closes it without saving. Critical edit, remove, attachment, and save controls must never depend on hover.

Use `min-height: 100dvh`, keep the mobile bottom navigation clear of content with safe-area padding, and respect narrow widths around 320px.

## Accessibility and motion

Use semantic `main`, `nav`, `header`, `section`, `article`, `button`, `label`, and form elements. Every icon-only button needs an accessible name and useful title. Dialogs need `role="dialog"`, `aria-modal="true"`, a labelled heading, Escape dismissal, focus placement, and focus return in production. Entry list updates should use a restrained live region. Never communicate category meaning by color alone.

The interface should animate only transform and opacity for short hover, toast, and drawer transitions. No looping decoration, glow, or parallax. Under `prefers-reduced-motion: reduce`, remove nonessential transitions and smooth scrolling while retaining every interaction and state.

## Acceptance checks

1. Open `daily-gews-ui.html` directly from the workspace root; the real Daily GLEW interface appears without a build step.
2. Confirm the file contains no emoji codepoints; all icons are inline SVG or CSS.
3. Run `node --check` against the HTML's extracted script. It must pass.
4. Confirm the prototype uses only `journal-daily-gews-ui-demo-v1`; it must not read or write `journal-daily-gews-v1`.
5. Desktop shows the Life OS shell, editorial hero, compact single-reflection composer, accessible category picker, four category colors, related Journal navigation, individual reflection history, counts, toolbar, and seeded demo days.
6. Mobile hides the sidebar, shows bottom navigation, keeps content inside the viewport, and opens a usable bottom drawer.
7. The composer defaults to Sadness, updates prompt/icon/color for every picker option, and Enter saves one line without opening a dialog.
8. Add a line to a new today record, then add another line to the same date and confirm there is still exactly one date record.
9. Individual history lines can be edited, deleted, and recategorized while retaining date context and attachments.
10. Opening today with a seeded today entry appends through the composer rather than creating a duplicate; the complete-day editor still supports date selection and multiple lines.
11. Attachment affordances, auto-commit of typed drafts in the complete-day editor, Save, Edit, Delete, and confirmation all work.
12. Undo and redo restore complete list states and are disabled when unavailable.
13. Search produces both filtered results and an intentional no-results state; clearing search restores the list.
14. CSV export has the exact four columns and one row per line with escaped values.
15. Swipe-down closes the secondary mobile editor; Escape and the close control also work.
16. Reduced-motion mode removes nonessential motion.
17. Production integration continues to use the existing React logic, production storage key, synced-storage, `AttachmentArea`, CSV helpers, toast behavior, and `useSwipeDownToClose`.