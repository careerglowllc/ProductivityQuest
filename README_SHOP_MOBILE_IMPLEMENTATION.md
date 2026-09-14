# Life OS Shop: Mobile and iPhone Portrait Implementation

This document defines the responsive Shop shown through `shop-mobile-iphone.html`.

## Core rule

Mobile and desktop must use the same Shop component, API queries, mutations, and validation.

Do not create a separate mobile Shop route.

## Reference size

- Primary iPhone portrait viewport: 390 × 844 CSS pixels.

Test at:

- 320 px
- 375 px
- 390 px
- 430 px
- 768 px
- 900 px transition

The current shared `useIsMobile()` hook switches below 768 px. Prefer CSS for layout and reserve the hook for meaningful behavior changes.

## Mobile reading order

1. Compact top utility bar
2. Shop heading
3. Export and Add item actions
4. Gold balance
5. Rewards catalog
6. Inventory
7. Persistent bottom navigation

## Responsive shell

At 900 px and below:

```css
.app {
  display: block;
}

.sidebar {
  display: none;
}

.topbar {
  height: 58px;
  padding-inline: 17px;
}

.content {
  padding: 22px 16px 90px;
}
```

Include bottom safe-area spacing:

```css
.content {
  padding-bottom: calc(90px + env(safe-area-inset-bottom));
}
```

## Heading and actions

At 480 px and below:

- Stack title and actions.
- Title remains 24 px.
- Actions move below with 15 px top margin.
- Keep both Export and Add item visible.
- Icon-only versions require accessible labels.

Do not place all management controls into the fixed top bar; preserve room for the page title and balance.

## Balance

- Full width.
- 15 px padding at narrow widths.
- Value remains approximately 25 px.
- Do not make the balance sticky unless it has been verified not to crowd the catalog.

When the balance changes after purchase:

- Animate only the number or use a brief highlight.
- Announce the new balance.
- Respect reduced-motion preference.

## Catalog

At 900 px and below:

```css
.rewards-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

At 480 px and below:

```css
.rewards-grid {
  grid-template-columns: 1fr;
}
```

The 390 px reference therefore shows one reward per row.

Mobile reward card:

- Minimum height approximately 145 px.
- Full-width tap target.
- Price remains visible without opening the card.
- Name may wrap.
- Description should use no more than two or three lines in the collapsed state.
- Availability state remains visible.

### Recommended mobile interaction

Tapping a reward opens a bottom sheet or dialog with:

- Icon
- Name
- Description
- Price
- Current balance
- Balance after purchase
- Purchase action
- Cancel action

Do not use `window.confirm`, `window.prompt`, or immediate purchase on card tap in production.

Unaffordable reward sheet:

- Purchase action disabled.
- State exactly how much additional gold is required.

```ts
const missingGold = Math.max(0, item.cost - goldTotal);
```

## Add reward on mobile

Use a responsive Dialog or Drawer:

- Maximum height below the status bar and bottom navigation.
- Internal scrolling.
- Sticky dialog actions if the form becomes long.
- Correct keyboard avoidance in Capacitor.
- Minimum 44 px action targets.

Field order:

1. Name
2. Description
3. Cost
4. Icon

Avoid a dense ten-column emoji picker. Use categorized icons, a searchable picker, or a smaller grid of stable application icons.

## Editing and deleting

Do not show tiny edit and delete controls inside the catalog card.

Place custom-item management in:

- The reward detail sheet, or
- A clearly labeled overflow menu.

Price editing:

- Numeric keyboard.
- `inputMode="numeric"`.
- Positive integer validation.

Delete:

- Separate confirmation.
- Never expose delete for global items.

## Inventory

At mobile widths:

```css
.inventory-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

At 320 px, allow a single column if content becomes cramped.

Inventory card must show:

- Reward icon
- Name
- Unused quantity
- Use action

If descriptions cause cards to become uneven, omit the description from the compact card and show it in detail.

Use action:

- Minimum 44 px height.
- Disable only the affected inventory group while pending.
- Show “Using…” or equivalent text.
- Keep the user’s place after completion.

## Mobile bottom navigation

Use the shared Life OS navigation, not Shop-specific navigation.

Recommended destinations matching the approved mockups:

| Label | Route |
|---|---|
| Home | `/dashboard` |
| Quests | `/tasks` |
| Calendar | `/calendar` |
| Shop | `/shop` |
| More | `/more` |

Requirements:

- Fixed to bottom.
- 65 px plus safe-area inset.
- Equal-width items.
- Navy surface.
- Active Shop item uses light violet.
- Labels remain short.
- `aria-current="page"` on Shop.

The repository’s existing mobile `TabBar` currently uses a different six-item destination set. Resolve this once at the shared navigation level rather than hardcoding a separate Shop bar.

## Purchase feedback

The current page uses large bouncing and sparkling overlays. Replace these with concise feedback:

- Short toast.
- Brief balance highlight.
- Inventory count update.
- Optional subtle card-to-inventory transition.

Feedback must not:

- Block scrolling for 1.5 seconds.
- Trigger continuous animation.
- cover the bottom navigation.
- Depend on motion for comprehension.

## Safe areas and Capacitor

The project includes Capacitor. Verify:

- `env(safe-area-inset-top)` where needed.
- `env(safe-area-inset-bottom)` on fixed navigation.
- Add-item form remains usable above the software keyboard.
- Dialog close controls remain reachable.
- `100dvh` is used instead of `100vh` where viewport height matters.
- Status-bar contrast works in each theme.

## Mobile loading and errors

- Use compact skeleton reward cards.
- Keep balance and catalog loading independent.
- Do not show a fake zero balance while progress is loading.
- Provide retry controls for catalog and inventory query errors.
- Preserve page structure to avoid major layout shift.

## Mobile performance

- Use one catalog query and one inventory query.
- Do not attach viewport listeners to every card.
- Use CSS Grid and media queries.
- Use transform and opacity for motion.
- Avoid expensive animated backgrounds.
- Memoize catalog filtering only when filtering becomes nontrivial.

## Mobile accessibility

- Minimum target: 44 × 44 px.
- Visible keyboard focus.
- Purchase sheet announces item and cost.
- Disabled purchase explains insufficient balance.
- Quantity changes use a polite live region.
- Form errors are linked to fields.
- Text supports 200% zoom.
- No horizontal scrolling at 320 px.
- Bottom navigation does not cover focused content or toast messages.

## iPhone portrait verification

At 390 × 844:

- Desktop sidebar is absent.
- Top bar is 58 px.
- Heading actions fit without clipping.
- Balance spans the content width.
- Catalog is one column.
- Prices and affordability remain visible.
- Reward detail opens and closes by touch.
- Purchase confirmation shows resulting balance.
- Add-item form stays above the keyboard.
- Inventory uses two columns without overflow.
- Use buttons remain at least 44 px high.
- Bottom navigation stays fixed.
- Final inventory content scrolls above navigation.
- Safe-area padding is visible.

Also test:

- Insufficient gold.
- Repeated purchase.
- Slow purchase mutation.
- Purchase failure.
- Empty catalog.
- Empty inventory.
- One and two-digit inventory quantities.
- Very long reward names.
- Very high prices.
- Reduced-motion mode.
- Landscape orientation.

## Mobile completion criteria

The mobile Shop is complete when it provides every desktop Shop capability in a touch-friendly hierarchy, uses the same live data and mutations, preserves safe areas, and has no clipping, hidden controls, or navigation overlap on supported iPhone portrait widths.
