# Life OS Quests UI — implementation handoff

## Direction
`quests-ui.html` is a standalone interaction reference for the Quests route. It keeps the Life OS navy shell and warm neutral workspace, but shifts Quests toward an operational command-center language: DM Sans for readable density, Space Mono for metadata, restrained violet for focus, teal for completed work, and amber for reward value.

The page is intentionally direct: the first screen is the active queue, not a marketing hero. Search, filters, sort, view switching, selection, and add are visible without opening secondary menus. Details are progressively disclosed inside each quest.

## Production source of truth

The production source is `client/src/pages/home.tsx`, with related behavior in:

- `client/src/components/task-card.tsx`
- `client/src/components/task-detail-modal.tsx`
- `client/src/components/add-task-modal.tsx`
- `client/src/components/add-questline-modal.tsx`
- `client/src/components/questline-tree-modal.tsx`

Production remains React/query/API driven. This mockup must not replace production components, routes, APIs, query keys, or storage. No production React files were modified.

## Interaction mapping

| Mockup behavior | Production behavior to preserve |
| --- | --- |
| Add quest dialog | `AddTaskModal`, task creation mutation, category/reward/importance/due date/description/questline fields |
| Search | Existing title/description/category/importance search behavior |
| Filter chips | Existing all, due today, due in 3 days, high reward, quick task, high priority, routines, business and assignee filters |
| List/grid toggle | Existing `viewType` list/grid behavior |
| Sort select | Existing due-date and importance sorting |
| Checkbox + complete | Existing single and batch completion, optimistic completion feedback, gold/XP/questline updates |
| Selection bar | Existing select-all, clear selection, bulk complete, delete, calendar, and Notion operations |
| Expand details | `TaskDetailModal` / quest detail view; preserve long descriptions and questline context |
| More menu | Secondary Notion import/export and CSV import/export actions |

The prototype shows a compact overflow menu for import/export to keep the primary queue uncluttered. Production should keep those actions wired to the existing API and CSV helpers rather than browser-only demo behavior.

## Primary vs secondary actions

Primary: Add quest, search, filter, complete, select, bulk complete, sort, and list/grid view.  
Secondary: Notion import/export, CSV import/export, delete, calendar actions, questline tree, and detailed editing. Secondary actions should remain available but should not compete with completing the next quest.

## Demo storage

The standalone file uses only:

```js
const KEY = "quests-ui-demo-v1";
```

It seeds local demo quests when that key is absent and persists add, complete, and selection-adjacent state changes there. It never reads or writes production task storage, auth state, query caches, or API endpoints. Clear this key in DevTools to restore the seeded queue.

## Responsive and accessibility behavior

- Desktop keeps the 236px Life OS sidebar; mobile replaces it with a fixed, safe-area-aware five-item bottom navigation.
- The queue remains usable at 320px: filters scroll horizontally, the search field receives a full row, cards become single column, and the add dialog becomes a bottom sheet.
- Semantic `main`, `nav`, `header`, `section`, `article`, `button`, `label`, form controls, and dialog markup are used.
- Icon-only controls have accessible labels; selection and completion use native checkbox/button semantics.
- Critical controls are always visible; no completion or detail action depends on hover.
- Search results are announced through the queue's `aria-live` region, with a composed no-results state.
- `:focus-visible` is explicit and high contrast.
- `prefers-reduced-motion: reduce` removes nonessential transitions and smooth scrolling.

## Acceptance checks

1. Open `quests-ui.html` directly from the workspace root; it renders without a build step.
2. Confirm no emoji characters are present; icons are inline SVG, CSS, or text glyphs only.
3. Run `node --check` against the extracted script.
4. Confirm storage is isolated to `quests-ui-demo-v1`.
5. Add a quest, complete it, expand details, search, filter, sort, switch list/grid, select multiple quests, and complete the selection.
6. Open the More menu and confirm each import/export action gives feedback; CSV export downloads a file.
7. Confirm desktop sidebar and mobile bottom navigation both appear at their intended breakpoints.
8. Test at 320px width and keyboard-only navigation, including Escape-equivalent close via Cancel and visible focus.
9. Test reduced-motion mode and confirm no essential state change is hidden by animation.
10. During production integration, preserve current API/query behavior, optimistic completion/undo feedback, task fields, questlines, Notion actions, calendar actions, and existing production storage.