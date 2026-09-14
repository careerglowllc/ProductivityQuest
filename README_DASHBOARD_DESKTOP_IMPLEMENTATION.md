# Life OS Dashboard: Desktop Implementation

This file defines the desktop dashboard structure and behavior shown in `ui-overhaul-proposal.html`.

## Target viewport

- Primary reference: 1280 × 720 and larger.
- Supported desktop range: 901 px and wider.
- Content remains readable on very wide screens through a centered maximum-width container.

## Desktop information architecture

```text
Application shell
├── Fixed-width left sidebar
│   ├── Life OS brand
│   ├── Primary navigation
│   └── User progress/profile summary
└── Main column
    ├── Top utility bar
    └── Dashboard content
        ├── Greeting and current date
        ├── Three progress metrics
        ├── Active questlines
        └── Two-column module grid
            ├── Skills overview
            ├── Today’s schedule
            ├── Top priority tasks
            └── Financial overview
```

## Application shell

### Desktop sidebar

Dimensions and placement:

- Width: 236 px.
- Minimum height: full viewport.
- Background: `#10182b`.
- Internal padding: 22 px vertically and 14 px horizontally.
- Content uses a vertical flex layout.

Brand:

- 28 × 28 px violet mark.
- 8 px corner radius.
- “Life OS” text at 15 px, weight 700.
- Horizontal gap: 10 px.

Navigation:

- Vertical gap: 5 px.
- Each destination is a single link with an icon and label.
- Link padding: 11 px vertically and 12 px horizontally.
- Link radius: 8 px.
- Default text: `#aeb8c9`.
- Hover background: `#202b45`.
- Active item adds a 3 px violet inset line on the left.

Destinations:

- Dashboard → `/dashboard`
- Quests → `/tasks`
- Calendar → `/calendar`
- Skills → `/skills`
- Finances → `/finances`
- Journal → `/journal`

If other existing desktop destinations remain required, place them behind the existing “More” or “All” navigation rather than overcrowding the primary list.

Profile summary:

- Anchored to the bottom of the sidebar.
- Separated by a subtle top border.
- Displays avatar, user name, level, and total XP.
- Values must come from authenticated-user and progress data.

### Main column

- Must set `min-width: 0` so grid children cannot force horizontal overflow.
- Background: dashboard background token.

## Top utility bar

- Height: 66 px.
- White background.
- 1 px bottom border.
- Horizontal padding: 34 px.
- Left side: “Dashboard / Today” breadcrumb.
- Right side: search, notifications, and current-date controls.
- Date control uses a compact neutral chip.
- Icon-only controls require labels and keyboard focus.

Connect search and notification controls to existing functionality if present. If the app does not support these actions, remove them instead of shipping nonfunctional controls.

## Content container

- Maximum width: 1300 px.
- Center horizontally.
- Padding: 34 px.
- Do not wrap the entire page in a decorative card.

## Greeting row

- Horizontal flex layout.
- Greeting block on the left.
- Current day and time on the right.
- Bottom margin: 25 px.

Greeting:

- Font size: 28 px.
- Weight: 700.
- Tight letter spacing around `-0.04em`.
- Supporting text uses the muted color.

Date:

- Space Mono.
- 11 px.
- Uppercase visual treatment.

Use the authenticated user’s preferred name. Generate the greeting based on local time if that behavior already exists.

## Progress metrics

Desktop grid:

```css
grid-template-columns: 1.35fr 1fr 1fr;
gap: 14px;
margin-bottom: 18px;
```

Order:

1. Today’s momentum
2. Active streak
3. Financial independence

Card:

- White surface.
- 1 px neutral border.
- 10 px radius.
- 19 px padding.
- Approved card shadow.

Metric label:

- Space Mono.
- 10 px.
- Uppercase.
- Letter spacing: `0.06em`.
- Muted color.

Metric value:

- 30 px.
- Weight 700.
- Tight numeric spacing.
- Supporting unit at 13 px and weight 500.

### Today’s momentum

Use an explicit product formula rather than the mockup’s hardcoded value.

Recommended formula if no existing definition is available:

```ts
const todayCompletion =
  stats.totalToday > 0
    ? stats.completedToday / stats.totalToday
    : 0;

const momentumScore = Math.round(todayCompletion * 100);
```

If the app already has a momentum calculation, preserve it.

### Active streak

Use existing streak data if available. Do not infer a streak from `tasksCompleted` unless product logic explicitly defines it that way.

If no streak field currently exists, treat the metric as a separate implementation requirement rather than showing fake data.

### Financial independence

Reuse the existing calculation in the financial-independence widget. Preserve market-price and property-value behavior.

Display:

- Percentage with one decimal place.
- Amber top border.
- Amber progress fill.
- Accessible label that includes current assets and goal when those values are available.

## Active questlines

Container:

- Soft violet background.
- Border: `#d9d0fb`.
- Radius: 10 px.
- Padding: 18 px.
- Bottom margin: 18 px.

Header:

- “Active questlines” on the left.
- “Manage” action on the right.
- Manage routes to the existing questline manager.

Data:

```ts
const activeQuestlines = questlines.filter(
  (questline) => !questline.completed
);
```

Rows:

- One disclosure row per active questline.
- White background.
- Neutral border.
- Radius: 10 px.
- Padding: 12 px 14 px.
- 8 px vertical separation.
- Questline title and percentage share the first line.
- Description is muted and limited to one or two lines.
- Progress track is 4 px high.

Interaction:

- Entire row toggles expanded state.
- Use a semantic disclosure button.
- `aria-expanded` must reflect state.
- Expanded content contains the next milestone and relevant action.
- Only one or multiple rows may remain open depending on existing behavior; document the chosen behavior in tests.
- Nested actions must not accidentally toggle the row.

## Two-column module grid

```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 16px;
```

Module card:

- White background.
- Neutral border.
- 10 px radius.
- 20 px padding.
- Minimum height: 212 px for visual consistency.
- Do not force equal heights if existing resize preferences intentionally override them.

### Skills overview

Purpose:

- Give a compact view of active skill development.
- Link to `/skills`.

Implementation:

- Use `skills` from `/api/skills`.
- Render a simplified, noninteractive overview.
- Do not duplicate the full constellation implementation on the dashboard.
- Keep the central map to approximately 145 px high.
- Provide loading and empty states.

### Today’s schedule

Purpose:

- Show upcoming events for the current day.
- Link to `/calendar`.

Implementation:

- Continue using the Google Calendar query.
- Filter events to the user’s local calendar day.
- Sort by start time.
- Show the next useful events rather than a full 24-hour timeline at desktop dashboard size.
- Each row uses a 60 px time column and flexible event content.
- Respect event calendar colors while maintaining text contrast.
- Show a current-time indicator only if it improves comprehension and fits without clipping.

### Top priority tasks

Purpose:

- Display the highest-value uncompleted tasks.
- Preserve the existing priority ranking logic.

Priority order:

1. Pareto
2. High
3. Med-High
4. Medium
5. Med-Low
6. Low

Implementation:

- Continue using the existing `getTopTasks()` logic unless product requirements change.
- Show up to four tasks.
- Use a real checkbox or accessible toggle.
- Optimistically update only if the existing mutation supports rollback on failure.
- On completion, invalidate the task, stats, and progress queries that depend on the result.
- Show the XP or reward only if it comes from task data or existing product rules.
- Completed tasks should not remain in a list explicitly labeled “priority tasks” unless the app intentionally preserves them during the current session.

### Financial overview

Purpose:

- Summarize recent income/expense or cash-flow movement.
- Link to `/finances`.

Implementation:

- Continue using `/api/finances`.
- Reuse the existing finance classification and calculations.
- Prefer the existing Recharts dependency for production charts.
- Use accessible tooltip content.
- Provide a textual summary for screen readers and empty states.
- The mockup’s bars are visual placeholders, not a fixed chart contract.

## Desktop hover and focus behavior

- Navigation item: subtle dark surface change.
- Card links: violet text with visible underline or clear focus treatment.
- Questline row: border shifts toward violet.
- Task checkbox: visible focus ring.
- Do not make entire informational cards clickable unless the whole card has one unambiguous destination.

Recommended focus ring:

```css
:focus-visible {
  outline: 3px solid rgba(119, 87, 216, 0.38);
  outline-offset: 2px;
}
```

## Desktop acceptance checklist

- Sidebar remains 236 px and does not compress.
- Main content has no horizontal overflow at 901 px.
- Top metric cards remain on one row.
- Active questlines use live data and expand correctly.
- Four lower modules appear as a balanced two-column grid.
- Navigation routes match existing application routes.
- Task completion updates live data.
- Calendar times respect the user’s timezone.
- Financial percentage matches the existing calculation.
- All controls are keyboard reachable.
- No emoji characters are used as production icons.
