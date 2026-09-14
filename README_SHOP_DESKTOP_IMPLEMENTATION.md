# Life OS Shop: Desktop Implementation

This document defines the desktop Shop layout shown in `shop-ui.html`.

## Target range

- Primary reference: 1280 × 720 and larger.
- Desktop shell: 901 px and wider.
- Main content maximum width: 1160 px.

## Desktop structure

```text
Application shell
├── 236 px Life OS sidebar
└── Main column
    ├── 66 px utility bar
    └── Shop content
        ├── Page heading and management actions
        ├── Available-gold balance
        ├── Rewards catalog
        └── Inventory
```

Use the same shell, brand, profile summary, and navigation behavior as the approved dashboard.

## Sidebar

- Width: 236 px.
- Background: `#10182b`.
- Shop is the active destination.
- Active item uses a 3 px violet inset line.
- Profile summary remains anchored to the bottom.

Use real routes:

- Dashboard: `/dashboard`
- Quests: `/tasks`
- Calendar: `/calendar`
- Shop: `/shop`
- Skills: `/skills`
- Finances: `/finances`
- Journal: `/journal`

## Utility bar

- Height: 66 px.
- White background.
- Neutral bottom border.
- 34 px horizontal padding.
- Breadcrumb: `Life OS / Shop`.
- Keep only functional utility controls.

## Content

```css
.shop-content {
  width: min(1160px, 100%);
  margin-inline: auto;
  padding: 34px;
}
```

## Page heading

Left:

- Title: “Shop”.
- Supporting copy: “Exchange earned gold for things that make real life better.”

Right:

- Export CSV secondary action.
- Add item violet primary action.

Title:

- 28 px.
- Weight 700.
- Tight letter spacing.

Actions:

- 7 px radius.
- 9 px × 13 px padding.
- 12 px label.
- Use Lucide `Download` and `Plus`.

## Gold balance

Display the balance as a prominent account summary rather than decorative game currency.

Container:

- Soft violet surface.
- Border: `#d9d0fb`.
- Radius: 10 px.
- Padding: 19 px 22 px.
- Bottom margin: 25 px.

Label:

- “Available balance”.
- Space Mono.
- 10 px.
- Uppercase.

Value:

- 29 px.
- Weight 700.
- Localized numeric formatting.
- “gold” unit at 14 px in amber.

Use `/api/progress` as the source.

## Catalog header

- Title: “Rewards catalog”.
- Supporting text explains that rewards use earned gold.
- Trailing count displays the number of catalog items.
- Count updates when custom rewards are added or deleted.

## Catalog grid

```css
.rewards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
```

### Reward card

- White background.
- Neutral border.
- 10 px radius.
- 17 px padding.
- Minimum height around 177 px.
- Vertical flex layout.

Content:

1. Reward icon and price
2. Name
3. Description
4. Availability and management controls

Price:

- Coin icon.
- Amber text.
- Bold.
- Format with locale separators.

Affordability:

```ts
const canAfford = progress.goldTotal >= item.cost;
```

States:

- Affordable: “Available”.
- Unaffordable: “Not enough gold”.
- Purchasing: disable action and show progress.
- Selected: violet border and shadow.

Do not make affordability depend only on color.

### Selection and purchase

Recommended desktop behavior:

1. Selecting a card opens a purchase detail panel or dialog.
2. The detail names the item, description, price, current balance, and resulting balance.
3. Primary action: Purchase.
4. Secondary action: Cancel.
5. User-created rewards expose edit and delete separately from purchase.

Do not trigger a purchase immediately on a single card click in production.

### Custom reward management

Only render edit/delete controls when `item.isGlobal === false`.

Price editing:

- Use an explicit form or popover.
- Positive integer validation.
- Save and cancel controls.
- Do not use `window.prompt` in production.

Deletion:

- Use an alert dialog.
- Name the reward.
- Explain that existing purchase history must not be silently corrupted.

## Add reward dialog

Fields:

- Name
- Description
- Cost in gold
- Icon

Requirements:

- Use existing Radix Dialog components.
- Desktop maximum width around 450–560 px.
- Visible labels.
- Inline validation.
- Disable submit while pending.
- Return focus to the Add item control after closing.

If an icon-key migration is introduced, support existing icon data.

## Inventory

Top margin: 34 px.

Container:

- White surface.
- Mint-tinted border.
- 10 px radius.
- 18 px padding.

Desktop grid:

```css
grid-template-columns: repeat(4, minmax(0, 1fr));
gap: 12px;
```

Inventory card:

- Neutral border.
- 8 px radius.
- 13 px padding.
- Icon, name, description, quantity, and Use action.

Quantity:

- Space Mono.
- Mint text.
- State the actual unused count.

Use action:

- Must consume one specific purchase ID.
- Disable while its mutation is pending.
- Ideally disable only the affected item rather than all inventory.

Empty state:

- One neutral icon.
- “No items in inventory”.
- One sentence explaining how to acquire a reward.
- No large decorative artwork.

## Desktop feedback

Purchase success:

- Brief toast or compact confirmation.
- State purchased item and amount spent.
- Update balance and inventory from query results.

Consume success:

- State the reward used.
- Update quantity.

Error:

- Keep the actionable context visible.
- Explain insufficient balance, validation failure, or network failure.

## Desktop acceptance checklist

- Shop is highlighted in desktop navigation.
- Content is centered and does not exceed 1160 px.
- Balance uses live `/api/progress` data.
- Catalog uses `/api/shop/items`.
- Three catalog columns appear at desktop widths.
- Unaffordable rewards cannot be purchased.
- Purchase confirmation shows resulting balance.
- Custom rewards can be added and repriced.
- Only custom rewards can be deleted.
- Inventory quantities use `/api/inventory`.
- Use action calls the correct purchase ID.
- CSV export still downloads.
- All dialogs are keyboard accessible.
- No emoji characters are required for core interface icons.
