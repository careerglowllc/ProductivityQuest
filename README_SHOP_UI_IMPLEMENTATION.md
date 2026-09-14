# Life OS Shop UI Implementation Guide

This document explains how to implement the approved Life OS Shop redesign in the existing React application while preserving real purchase and inventory behavior.

## Visual references

- Responsive Shop mockup: `shop-ui.html`
- iPhone portrait preview: `shop-mobile-iphone.html`
- Approved dashboard system: `ui-overhaul-proposal.html`
- Existing Shop page: `client/src/pages/shop.tsx`
- Existing shared navigation: `client/src/components/tab-bar.tsx`
- Existing mobile breakpoint hook: `client/src/hooks/use-mobile.tsx`
- Shop server routes: `server/routes.ts`

Read this file first, then:

1. `README_SHOP_DESKTOP_IMPLEMENTATION.md`
2. `README_SHOP_MOBILE_IMPLEMENTATION.md`
3. `shop-ui.html`
4. `client/src/pages/shop.tsx`

## Goal

Replace the current Shop presentation with the approved Life OS command-interface design.

The Shop must feel like part of the same application as the redesigned dashboard:

- Navy application navigation
- Neutral light workspace
- Violet primary actions
- Amber currency and price signals
- Mint inventory and successful-use signals
- Tight, professional typography
- Restrained motion
- Clear purchasing states

This is an actual application page, not a landing page or a decorative game store.

## Preserve existing behavior

The redesign must retain:

- Current gold balance
- Shop item loading
- Affordability checks
- Item purchase
- Inventory grouping and quantities
- Item consumption/use
- Adding custom rewards
- Editing prices on user-created rewards
- Deleting user-created rewards
- Protection of global/default rewards
- CSV export
- Purchase, use, add, edit, and delete feedback
- Existing authentication requirements
- Existing light/dark theme support unless intentionally changed across the whole app

Do not replace live data with the mockup’s sample values.

## Existing APIs

| Purpose | Method and route | Request |
|---|---|---|
| Current gold | `GET /api/progress` | None |
| Shop catalog | `GET /api/shop/items` | None |
| Add custom reward | `POST /api/shop/items` | `{ name, description, cost, icon }` |
| Update custom reward price | `PATCH /api/shop/items/:id` | `{ cost }` |
| Delete custom reward | `DELETE /api/shop/items/:id` | None |
| Purchase reward | `POST /api/shop/purchase` | `{ itemId }` |
| Purchase history | `GET /api/purchases` | None |
| Use inventory purchase | `PATCH /api/purchases/:id/use` | None |
| Grouped inventory | `GET /api/inventory` | None |

### Important request-shape warning

`server/routes.ts` and `client/src/pages/shop.tsx` use:

```ts
{ itemId }
```

The older `client/src/components/item-shop-modal.tsx` sends:

```ts
{ shopItemId }
```

The server expects `itemId`. Any shared purchase component must use the server contract or be corrected before reuse.

## Recommended component structure

```text
client/src/
├── pages/
│   └── shop.tsx
└── components/
    └── shop/
        ├── shop-shell.tsx
        ├── shop-header.tsx
        ├── gold-balance-card.tsx
        ├── rewards-catalog.tsx
        ├── reward-card.tsx
        ├── reward-purchase-dialog.tsx
        ├── add-reward-dialog.tsx
        ├── edit-reward-price.tsx
        ├── inventory-section.tsx
        ├── inventory-card.tsx
        └── purchase-feedback.tsx
```

This is a suggested decomposition. Reuse stable project components and Radix primitives rather than creating duplicates.

## Data ownership

The Shop page should own the queries and mutations. Presentational components should receive typed data and explicit callbacks.

Recommended data flow:

```text
Shop page
├── useQuery(/api/progress)
├── useQuery(/api/shop/items)
├── useQuery(/api/inventory)
├── purchase mutation
├── consume mutation
├── create reward mutation
├── update price mutation
└── delete reward mutation
```

Avoid running the same catalog or inventory query inside every card.

## Required types

Use schema-generated types where available. If the current schema types are not exported for these records, define focused UI types:

```ts
type ShopItem = {
  id: number;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category?: string | null;
  isGlobal: boolean;
  createdAt?: string | Date;
};

type InventoryGroup = {
  itemId: number;
  item?: ShopItem;
  unused: number;
  used: number;
  purchaseIds: number[];
};
```

Do not leave catalog and inventory collections typed as `any[]`.

## Shared Shop design tokens

Use the same tokens as the approved dashboard:

```css
:root {
  --shop-bg: #f3f5f7;
  --shop-surface: #ffffff;
  --shop-navy: #10182b;
  --shop-ink: #182133;
  --shop-muted: #6e7888;
  --shop-line: #dbe1e8;
  --shop-violet: #7757d8;
  --shop-violet-soft: #f0ecff;
  --shop-mint: #24a982;
  --shop-mint-soft: #e6f7f1;
  --shop-amber: #e6a51b;
  --shop-amber-soft: #fff6df;
  --shop-coral: #dc6b68;
  --shop-shadow: 0 10px 30px rgba(19, 32, 56, 0.07);
}
```

Typography:

- DM Sans for interface text.
- Space Mono for balances, quantities, and compact metadata.
- Use the existing project font-loading strategy.

## Icon strategy

The current Shop stores item icons as emoji strings. The redesigned UI should not depend on emoji rendering for its visual identity.

Recommended implementation:

1. Add a stable icon key to custom rewards, or interpret existing stored values through a compatibility mapper.
2. Map icon keys to existing Lucide icons.
3. Preserve legacy emoji values as data, but render a neutral fallback icon where necessary.
4. Do not break existing records during migration.

Example:

```ts
const rewardIcons = {
  coffee: Coffee,
  gaming: Gamepad2,
  wellness: Heart,
  entertainment: Tv,
  custom: Sparkles,
};
```

## Mutation behavior

### Purchase

Before calling the API:

- Confirm the item exists.
- Confirm `goldTotal >= item.cost`.
- Disable duplicate purchase submission.

After success:

- Invalidate `/api/progress`.
- Invalidate `/api/purchases`.
- Invalidate `/api/inventory`.
- Close the confirmation surface.
- Announce success through a polite live region.

On failure:

- Keep the current balance unchanged.
- Keep the item available for retry.
- Show the server message when safe and useful.

### Consume/use

Use a specific `purchaseId` from `inventory.purchaseIds`.

After success:

- Invalidate `/api/inventory`.
- Invalidate `/api/purchases`.
- Announce the used reward.

Do not decrement the visible quantity permanently until the mutation succeeds unless the optimistic update includes rollback.

### Create, update, and delete

- Validate name, description, positive integer cost, and icon.
- Only user-created items may expose edit or delete controls.
- Global/default items must remain protected.
- Delete requires explicit confirmation.
- Refresh or invalidate the catalog after success.

## CSV export

Preserve `buildShopItemsCSVExport()` and the existing CSV utilities.

Export columns:

- Name
- Description
- Cost (Gold)
- Icon
- Category
- Is Global
- Created At

The export control should remain secondary to shopping and purchasing.

## Motion

Use motion to communicate state:

- Reward-card hover: 2 px lift and border emphasis.
- Selected reward: violet border and subtle shadow.
- Purchase success: brief confirmation surface or toast.
- Inventory use: brief mint state change.
- Modal: short opacity and scale transition.

Avoid:

- Constant starfield animation
- Large bouncing purchase overlays
- Repeated sparkle effects
- Motion that blocks the next action

All nonessential motion must respect `prefers-reduced-motion`.

## Required UI states

Each section must support:

- Loading
- Empty
- Error
- Populated

Additional catalog states:

- Affordable
- Unaffordable
- Selected
- Purchasing
- User-created/editable
- Global/protected

Additional inventory states:

- Available quantity
- Using
- Used history
- Empty inventory

## Accessibility

- Catalog items must be buttons or contain an explicit selection/purchase button.
- Avoid clickable `Card` elements without semantic keyboard behavior.
- Purchase confirmation requires a clear item name, price, and resulting balance.
- Disabled purchase controls must state why the reward is unavailable.
- Forms require visible labels.
- Validation errors must be associated with fields.
- Dialog focus must be trapped and restored.
- Toasts use a polite live region.
- Delete confirmation must name the affected item.
- Do not rely on amber, mint, or coral alone to communicate state.

## Implementation order

1. Establish shared Life OS tokens.
2. Refactor Shop data into typed queries and mutations.
3. Build the responsive application shell.
4. Implement heading, actions, and balance.
5. Implement catalog and reward states.
6. Implement purchase confirmation.
7. Implement inventory and consume actions.
8. Restyle add, price-edit, and delete flows.
9. Preserve CSV export.
10. Add loading, empty, and error states.
11. Verify desktop and mobile.
12. Run type checking and application validation.

## Completion criteria

The Shop redesign is complete when:

- It matches `shop-ui.html`.
- It feels consistent with the approved dashboard.
- All content comes from live APIs.
- Gold cannot go negative.
- Purchases update balance and inventory.
- Inventory use updates quantities.
- Global items cannot be deleted.
- Custom items can be added, repriced, and deleted.
- CSV export still works.
- Desktop and mobile share the same business logic.
- Keyboard, screen-reader, reduced-motion, loading, empty, and error states work.
