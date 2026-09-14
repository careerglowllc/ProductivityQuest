# Life OS Dashboard UI Implementation Guide

This documentation describes how to implement the approved Life OS dashboard UI in the existing React application.

The visual reference is the working HTML mockup:

- Desktop mockup: `ui-overhaul-proposal.html`
- iPhone portrait preview: `dashboard-mobile-iphone.html`
- Existing production page: `client/src/pages/dashboard.tsx`
- Existing responsive navigation: `client/src/components/tab-bar.tsx`
- Existing mobile breakpoint hook: `client/src/hooks/use-mobile.tsx`

## Read these files in this order

1. `README_DASHBOARD_DESKTOP_IMPLEMENTATION.md`
2. `README_DASHBOARD_MOBILE_IMPLEMENTATION.md`
3. `ui-overhaul-proposal.html`
4. `client/src/pages/dashboard.tsx`
5. `client/src/components/tab-bar.tsx`

The desktop and mobile interfaces are two responsive presentations of the same dashboard. Do not build separate business logic, API queries, or data transformations for mobile.

## Objective

Replace the current dashboard presentation with the approved command-center interface while preserving the existing application behavior and data sources.

The implementation must retain:

- Authentication and user data
- Active questlines and expansion behavior
- Today’s task progress
- Priority-task ordering and completion
- Financial-independence calculations
- Finance overview data
- Skills overview and navigation
- Google Calendar events
- Existing routes
- Existing light/dark theme behavior unless explicitly superseded
- Existing draggable or resizable widget preferences if those remain product requirements

The implementation must not:

- Replace live data with the hardcoded values from the mockup
- Create a separate mobile dashboard route
- Duplicate desktop and mobile query logic
- Remove existing task, finance, questline, calendar, or skill capabilities
- Use the HTML mockup directly in an iframe in the production app
- add marketing copy, device frames, or proposal text

## Existing data sources

Continue using the queries already present in `client/src/pages/dashboard.tsx`:

| Dashboard data | Existing query |
|---|---|
| Active questlines | `/api/questlines` |
| Tasks | `/api/tasks` |
| User progress and currency | `/api/progress` |
| Today’s completion statistics | `/api/stats` |
| Skills | `/api/skills` |
| Financial items | `/api/finances` |
| Calendar events | `/api/google-calendar/events?year=YYYY&month=M` |
| Market prices | Preserve the existing market-price queries used by the financial-independence widget |

Do not rename or replace API contracts solely for this redesign.

## Recommended React structure

Refactor the page into focused presentational components while retaining one data-owning dashboard page.

```text
client/src/
├── pages/
│   └── dashboard.tsx
├── components/
│   └── dashboard/
│       ├── dashboard-shell.tsx
│       ├── dashboard-header.tsx
│       ├── dashboard-sidebar.tsx
│       ├── dashboard-mobile-nav.tsx
│       ├── dashboard-stat-grid.tsx
│       ├── dashboard-stat-card.tsx
│       ├── active-questlines.tsx
│       ├── questline-row.tsx
│       ├── skills-overview-card.tsx
│       ├── today-schedule-card.tsx
│       ├── priority-tasks-card.tsx
│       └── financial-overview-card.tsx
└── styles/
    └── dashboard-tokens.css
```

This is a recommended decomposition, not a requirement to rename stable existing components. Prefer extracting existing logic rather than rewriting it.

## Data flow

`Dashboard` should remain responsible for:

1. Running the existing queries.
2. Normalizing query results to arrays or safe defaults.
3. Calculating derived values such as completion percentages.
4. Sorting priority tasks.
5. Passing data and callbacks to presentational components.

Presentational components should:

- Receive typed props.
- Render loading, empty, error, and populated states.
- Avoid issuing duplicate queries.
- Avoid reproducing business calculations.
- Emit explicit actions such as `onToggleTask`, `onToggleQuestline`, or `onOpenFinance`.

## Shared visual tokens

Use these values as the approved baseline:

```css
:root {
  --dashboard-bg: #f3f5f7;
  --dashboard-surface: #ffffff;
  --dashboard-navy: #10182b;
  --dashboard-ink: #182133;
  --dashboard-muted: #6e7888;
  --dashboard-line: #dbe1e8;
  --dashboard-violet: #7757d8;
  --dashboard-violet-soft: #f0ecff;
  --dashboard-mint: #24a982;
  --dashboard-mint-soft: #e6f7f1;
  --dashboard-amber: #e6a51b;
  --dashboard-amber-soft: #fff6df;
  --dashboard-blue: #3d76ba;
  --dashboard-coral: #dc6b68;
  --dashboard-shadow: 0 10px 30px rgba(19, 32, 56, 0.07);
}
```

Typography:

- Primary UI font: DM Sans, weights 400, 500, 600, and 700.
- Numeric labels and timestamps: Space Mono, weights 400 and 700.
- If externally hosted fonts are not appropriate for production, self-host them or use the project’s existing font-loading approach.

## Shared component rules

### Surfaces

- Standard background: `#f3f5f7`.
- Standard card: white, 1 px `#dbe1e8` border, 10 px radius.
- Standard card shadow: `0 10px 30px rgba(19, 32, 56, 0.07)`.
- Do not outline every nested element with a colored border.
- Colored borders indicate meaning, selection, or category—not decoration.

### Progress

- Track height: 6 px for primary metrics.
- Track background: `#e7ebf0`.
- Radius: fully rounded.
- Violet: questline and system progress.
- Mint: positive daily momentum and completion.
- Amber: streak and financial-independence progress.
- Clamp all percentage widths between 0 and 100.

### Icons

- Use the existing Lucide icon package.
- Do not use emoji characters.
- Standard icon size: 16–20 px desktop and 22–24 px in mobile bottom navigation.
- Decorative icons must be hidden from assistive technology.
- Icon-only controls require `aria-label`.

### Motion

- Hover and state transitions: 160–220 ms.
- Use opacity, border color, background color, and small transforms.
- Do not continuously animate dashboard cards.
- Disable nonessential motion under `prefers-reduced-motion: reduce`.

## Required states

Every data-driven module must support:

1. Loading
2. Empty
3. Error
4. Populated

Examples:

- No active questlines: show a concise empty state with a link to create or manage questlines.
- No tasks today: show completion at zero without dividing by zero.
- No calendar events: show “No events scheduled” rather than an empty chart.
- No skills: show a link to create the first skill.
- No finance records: show an onboarding message instead of a misleading zero chart.

## Accessibility requirements

- Use semantic landmarks: `header`, `nav`, `main`, and labeled `section` elements.
- Questline rows must be buttons or use a real disclosure component with `aria-expanded`.
- Task completion must use a checkbox or a button with an accurate accessible name and state.
- Minimum pointer target: 44 × 44 px on mobile.
- Maintain visible keyboard focus.
- Do not communicate status through color alone.
- Progress indicators require accessible labels and current values.
- Toasts use a polite live region.
- Bottom navigation must not cover focused or scrolled content.

## Implementation sequence

1. Extract or establish the visual tokens.
2. Build the responsive shell and navigation.
3. Restyle the greeting and top metrics.
4. Convert active questlines to the approved disclosure rows.
5. Restyle the four dashboard modules.
6. Connect existing task-completion and navigation handlers.
7. Add loading, empty, and error states.
8. Verify desktop behavior.
9. Verify mobile behavior using the same data.
10. Run type checking, tests, keyboard checks, and screenshot comparison.

## Completion criteria

The redesign is complete only when:

- The production React dashboard visually matches the approved HTML mockup.
- Every card displays live application data.
- Existing dashboard actions still work.
- Desktop and mobile share the same data and business logic.
- The layout has no horizontal overflow at supported widths.
- Keyboard navigation and screen-reader labels are present.
- Reduced-motion behavior works.
- Existing route navigation remains correct.
- Type checking and application validation pass.
