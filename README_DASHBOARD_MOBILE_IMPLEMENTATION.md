# Life OS Dashboard: Mobile and iPhone Portrait Implementation

This file defines how the approved desktop dashboard translates to mobile. The visual reference is the same responsive document used by the desktop mockup, constrained to an iPhone portrait viewport by `dashboard-mobile-iphone.html`.

## Core rule

Mobile is not a separate dashboard.

Use:

- The same React page.
- The same query results.
- The same derived calculations.
- The same action handlers.
- Responsive layout and navigation changes only.

Do not create `/dashboard/mobile`.

## Target devices and widths

Primary reference:

- iPhone portrait viewport: 390 × 844 CSS pixels.

Required testing:

- 320 px width
- 375 px width
- 390 px width
- 430 px width
- 768 px width
- 900 px width transition

The existing project-wide `useIsMobile()` hook changes at 768 px. The approved mockup begins its compact shell at 900 px and changes to a single metric column at 480 px.

To avoid inconsistent behavior, establish explicit responsibilities:

- Component behavior that truly depends on touch/mobile navigation should use the existing 768 px hook.
- Pure layout changes should use CSS media queries.
- Do not add multiple JavaScript viewport listeners to individual widgets.

If the product wants the new shell to switch at 900 px, update the shared breakpoint intentionally and verify every consumer of `useIsMobile()` before changing it.

## Mobile information hierarchy

The mobile reading order is:

1. Compact top utility bar
2. Greeting
3. Today’s momentum
4. Active streak
5. Financial independence
6. Active questlines
7. Skills overview
8. Today’s schedule
9. Top priority tasks
10. Financial overview
11. Persistent bottom navigation

This ordering preserves all desktop information. Mobile changes presentation and sequence, not content availability.

## Mobile shell

### Remove the desktop sidebar

At the mobile shell breakpoint:

```css
.sidebar {
  display: none;
}

.app {
  display: block;
}
```

Do not leave an empty sidebar column.

### Compact top bar

- Height: 58 px.
- Horizontal padding: 17 px.
- Show the current page breadcrumb.
- Keep only high-value utility actions.
- Hide the full date chip when space is limited.
- Keep safe-area top padding if rendered as an installed Capacitor app.

### Content spacing

At 900 px and below:

```css
.content {
  padding: 22px 16px 90px;
}
```

At 480 px and below:

```css
.content {
  padding-top: 18px;
}
```

The 90 px bottom padding prevents the persistent navigation from covering the final card.

Account for the device safe area:

```css
padding-bottom: calc(90px + env(safe-area-inset-bottom));
```

## Greeting

- Stack the greeting and date below 480 px.
- Heading: 24 px.
- Supporting text remains visible.
- Date moves below the greeting with a 12 px top margin.
- Keep the user’s name concise to avoid wrapping into three lines.

## Progress metric adaptation

At 900 px and below:

```css
.stats {
  grid-template-columns: 1fr 1fr;
}

.stats > :first-child {
  grid-column: 1 / -1;
}
```

At 480 px and below:

```css
.stats {
  grid-template-columns: 1fr;
}

.stats > :first-child {
  grid-column: auto;
}
```

The approved 390 px presentation therefore shows:

1. Today’s momentum as a full-width card.
2. Active streak as a full-width card.
3. Financial independence as a full-width card.

Do not reduce type sizes so aggressively that the metric loses prominence.

Mobile metric card requirements:

- Minimum comfortable touch-independent height around 122 px.
- 19 px internal padding unless the smallest supported width requires 16 px.
- Value remains approximately 30 px.
- Progress remains 6 px high.

## Active questlines on mobile

- Use the same disclosure component as desktop.
- Keep every row full width.
- Title and percentage remain on the same first line when possible.
- Long titles may wrap; percentages should not shrink or disappear.
- Description may wrap to two lines.
- Expanded action targets must be at least 44 px high.
- Do not rely on hover.

On selection:

1. Update `aria-expanded`.
2. Reveal the next milestone immediately below the row.
3. Keep the selected row in view.
4. Do not automatically scroll unless content would otherwise be hidden behind bottom navigation.

## Dashboard modules

At 900 px and below:

```css
.grid {
  grid-template-columns: 1fr;
}
```

Every desktop module becomes one full-width card.

Recommended card order:

1. Skills overview
2. Today’s schedule
3. Top priority tasks
4. Financial overview

Card padding:

- 16 px at 480 px and below.
- 20 px for larger mobile/tablet widths.

Avoid fixed card heights on mobile. Let content determine height.

### Skills overview

- The compact map may remain visual, but its “View details” action must be easy to tap.
- The full constellation remains on `/skills`.
- Do not add drag/zoom interactions to the dashboard preview.

### Schedule

- Keep time and event content in two columns.
- Time column may reduce from 60 px to 52 px if necessary.
- Event text must wrap rather than overflow.
- Show a practical subset of today’s events.
- The full calendar remains one tap away.

### Priority tasks

- Entire row may be tappable if it does not conflict with opening task details.
- The completion control must remain visually distinct.
- Reward text stays aligned to the trailing edge.
- Long task names wrap without pushing reward text off-screen.
- Completion feedback should be immediate.

### Financial overview

- The chart width must be fluid.
- Tooltips must work by tap or keyboard, not hover alone.
- If chart labels become illegible at 320 px, reduce the number of labels rather than shrinking below readable size.

## Persistent bottom navigation

The approved dashboard mockup uses five mobile destinations:

1. Home
2. Quests
3. Calendar
4. Skills
5. More

The current `TabBar` uses six:

1. Dashboard
2. Quests
3. Calendar
4. Journal
5. Settings
6. All

This is a product decision, not merely a CSS difference. Before implementation, choose one destination model and use it consistently throughout the app.

Recommended model matching the approved UI:

| Label | Route |
|---|---|
| Home | `/dashboard` |
| Quests | `/tasks` |
| Calendar | `/calendar` |
| Skills | `/skills` |
| More | `/more` |

Journal and Settings remain accessible through More.

Navigation requirements:

- Fixed to the viewport bottom.
- Height: 65 px plus safe-area inset.
- Navy background.
- Equal-width destinations.
- Icon and short label.
- Active destination uses a light violet color.
- Minimum target width and height: 44 px.
- `aria-current="page"` on the current destination.

Example safe-area treatment:

```css
.mobile-nav {
  min-height: calc(65px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}
```

Do not nest an `<a>` inside the Wouter `Link` if the installed Wouter version already renders the anchor. Follow the existing note in `client/src/components/tab-bar.tsx`.

## Touch behavior

- Do not use hover as a requirement.
- Use `touch-action: manipulation` on compact action controls when appropriate.
- Avoid delayed tap feedback.
- Do not attach swipe gestures to ordinary vertical-scrolling dashboard cards.
- Preserve native page scrolling.
- Keep destructive actions out of casual swipe zones.

## iPhone and Capacitor considerations

The repository contains Capacitor configuration and iOS guidance. When this React page is shown inside the native shell:

- Respect `env(safe-area-inset-top)`.
- Respect `env(safe-area-inset-bottom)`.
- Verify keyboard appearance does not permanently shift the fixed navigation.
- Verify status-bar contrast in both themes.
- Avoid `100vh`; prefer `100dvh` where a viewport height is required.
- Test on a real device as well as browser emulation.

## Mobile loading and empty states

Keep states compact:

- Skeletons should match the final card dimensions.
- Avoid a separate full-screen loader for each widget.
- Empty states should use one sentence and one clear action.
- Error states need a retry action only where retry is meaningful.
- Preserve content order while data loads to avoid large layout shifts.

## Mobile performance

- Do not render the full Skills constellation inside the dashboard.
- Lazy-load heavy chart code if it materially reduces initial dashboard cost.
- Memoize expensive finance calculations where appropriate.
- Avoid resize observers per card unless they are necessary.
- Use CSS layout rather than JavaScript width calculations.
- Keep selection and completion animations to transform and opacity where possible.

## Mobile accessibility

- Support 200% text zoom without horizontal scrolling.
- Ensure labels remain readable at 320 px.
- Maintain 4.5:1 contrast for normal text.
- Keep tap targets at least 44 × 44 px.
- Use visible focus treatment for external keyboards.
- Ensure bottom navigation does not hide toast messages.
- Toasts use `role="status"` or an equivalent polite live region.

## Mobile verification checklist

Test every item at 390 × 844:

- No desktop sidebar appears.
- No horizontal scrollbar appears.
- Greeting and date fit without clipping.
- All three metric cards stack vertically.
- Progress tracks fit within cards.
- Questlines expand by touch.
- All lower modules become one column.
- Long task titles wrap correctly.
- Calendar events do not overflow.
- Financial chart remains readable.
- Bottom navigation remains fixed.
- Last content card can scroll fully above navigation.
- Safe-area padding works.
- Navigation routes are correct.
- Task completion still updates stats and progress.

Also test:

- 320 px narrow screen.
- Landscape orientation.
- Browser text zoom.
- Reduced-motion preference.
- Slow network loading states.
- Empty questline, task, skill, calendar, and finance data.

## Mobile completion criteria

The mobile implementation is complete when it presents all desktop dashboard information in the approved order, remains fully usable with touch and keyboard, shares desktop data and actions, and has no clipping, hidden content, or navigation overlap on supported iPhone portrait sizes.
