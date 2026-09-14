# Life OS Daily GEWS UI — implementation reference

## Purpose and direction

`daily-gews-ui.html` is a standalone visual and interaction reference for the Daily GEWS route. It uses the crafted editorial Life OS family from `journal-ui.html`: navy shell, warm paper, Instrument Serif display type, DM Sans body text, and Space Mono metadata. The four categories use deliberate emotional color: blue for Sadnesses, ochre for Gratitudes, sage for Wins, and terracotta for Exciteds.

This HTML is a visual/interaction reference only. Production must preserve the existing React logic, synced-storage behavior, `AttachmentArea`, CSV helpers, toast behavior, and `useSwipeDownToClose`. It must not replace the production page or introduce a parallel server schema.

## Routes and shared Journal shell

Production route: `/journal/daily-gews`.

The page belongs inside the existing Journal shell and should retain:

- the Life OS desktop navigation/sidebar, profile block, breadcrumb/top bar, and mobile bottom navigation;
- Journal-related navigation for Journal home, Daily GEWS, Gratitude, Excitement, Empowering Thoughts, and Weekly Planning;
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
type GewsCategory = "gratitudes" | "wins" | "exciteds" | "sadnesses";

type GewsLine = {
  text: string;
  attachments?: QuestAttachment[];
};

type GewsEntry = {
  date: string; // YYYY-MM-DD
  gratitudes: GewsLine[];
  wins: GewsLine[];
  exciteds: GewsLine[];
  sadnesses: GewsLine[];
  updatedAt: string;
};
```

The exact visual and CSV category order is:

```ts
const CATEGORY_ORDER: GewsCategory[] = [
  "sadnesses",
  "gratitudes",
  "wins",
  "exciteds",
];
```

Legacy entries whose category arrays contain plain strings must be normalized to `{ text, attachments: [] }` before rendering or mutation. Preserve any existing attachment arrays during normalization.

## Behavior contract

- There is one entry per date. Opening today must open the existing entry when today already exists; it must never create a duplicate or blank replacement.
- The date control supports selecting another date. Saving an edited entry removes its original date and applies the selected date.
- If the selected date already exists, the save collision follows the existing React behavior: the selected date is replaced by the saved form, leaving one entry for that date.
- Each category supports multiple lines. A line can be added with the Add control or by the production page's supported keyboard behavior.
- Save must auto-commit non-empty text still sitting in any category draft input. Typed drafts must not disappear merely because the user presses Save before pressing Add.
- Each draft line has an optional attachment affordance. Production must use `AttachmentArea` and `QuestAttachment`; the prototype only exposes a filename affordance and does not upload bytes.
- Existing lines can be edited or removed before the daily save. Empty replacement text is rejected.
- Daily save, edit, and delete are complete interactions. Delete requires confirmation and production uses the existing toast with Undo.
- Days are listed chronologically in the UI contract (newest first is the approved display used by the current React page); each day shows category counts and a useful preview.
- Include a composed empty state and a composed no-search-results state.
- Undo and redo snapshot the full entry array around every mutating action. A fresh mutation clears redo; undo creates a redoable state; redo restores undo. Keep the existing `persistWithUndo` and toast semantics.
- Search is case-insensitive and non-destructive.

## CSV contract

Production must use the existing `rowsToCSV` and `downloadCSV` helpers, not a replacement serializer. The Daily GEWS export is one row per line, sorted by date and then `CATEGORY_ORDER`, with these exact columns:

```text
Date,Category,Entry,Attachments
```

The Date value is the formatted full date, Category is the human label, Entry is the line text, and Attachments is empty or `N file(s)`. Preserve the existing date-stamped `daily-gews.csv` filename behavior.

## Responsive editor and gesture behavior

Desktop uses a centered dialog with a scrollable editor. Mobile uses the bottom-aligned responsive dialog/drawer shown in the prototype, with a visible grab handle, safe-area padding, reachable Save and Cancel controls, and category sections that remain usable without horizontal overflow. Production must use the existing `useSwipeDownToClose` hook for swipe-down dismissal; a downward gesture on the drawer closes it without saving. Critical edit, remove, attachment, and save controls must never depend on hover.

Use `min-height: 100dvh`, keep the mobile bottom navigation clear of content with safe-area padding, and respect narrow widths around 320px.

## Accessibility and motion

Use semantic `main`, `nav`, `header`, `section`, `article`, `button`, `label`, and form elements. Every icon-only button needs an accessible name and useful title. Dialogs need `role="dialog"`, `aria-modal="true"`, a labelled heading, Escape dismissal, focus placement, and focus return in production. Entry list updates should use a restrained live region. Never communicate category meaning by color alone.

The interface should animate only transform and opacity for short hover, toast, and drawer transitions. No looping decoration, glow, or parallax. Under `prefers-reduced-motion: reduce`, remove nonessential transitions and smooth scrolling while retaining every interaction and state.

## Acceptance checks

1. Open `daily-gews-ui.html` directly from the workspace root; the real Daily GEWS interface appears without a build step.
2. Confirm the file contains no emoji codepoints; all icons are inline SVG or CSS.
3. Run `node --check` against the HTML's extracted script. It must pass.
4. Confirm the prototype uses only `journal-daily-gews-ui-demo-v1`; it must not read or write `journal-daily-gews-v1`.
5. Desktop shows the Life OS shell, editorial hero, four category colors, related Journal navigation, daily list, counts, toolbar, and seeded demo days.
6. Mobile hides the sidebar, shows bottom navigation, keeps content inside the viewport, and opens a usable bottom drawer.
7. Opening today with a seeded today entry edits that entry rather than creating a duplicate.
8. Date selection, multiple lines, attachment affordances, line add/edit/remove, auto-commit of typed drafts, Save, Edit, Delete, and confirmation all work.
9. Undo and redo restore complete list states and are disabled when unavailable.
10. Search produces both filtered results and an intentional no-results state; clearing search restores the list.
11. CSV export has the exact four columns and one row per line with escaped values.
12. Swipe-down closes the mobile editor; Escape and the close control also work.
13. Reduced-motion mode removes nonessential motion.
14. Production integration continues to use the existing React logic, production storage key, synced-storage, `AttachmentArea`, CSV helpers, toast behavior, and `useSwipeDownToClose`.