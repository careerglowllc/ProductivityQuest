# 🔥 FIRE Goal Overview Widget

**File:** `client/src/pages/finances.tsx` — `renderWidget("fireGoal")` case  
**Last updated:** June 1, 2026

---

## Overview

The FIRE Goal widget lives on the **Overview tab** of the Finances page, alongside other draggable/toggleable widgets (Income Sources, Net Worth, Portfolio Allocation, etc.). It gives a quick at-a-glance snapshot of FIRE progress without needing to navigate to the full FIRE tab.

---

## What It Shows

| Element | Description |
|---------|-------------|
| **% progress bar** | Liquid NW ÷ FIRE goal, capped at 100% |
| **Liquid NW Today** | After-tax portfolio value (same formula as FIRE tab) |
| **FIRE Age** | Projected age + year to hit the goal |
| **Monthly @ Retirement** | Inflation-adjusted monthly spend at FIRE date |
| **Remaining** | `max(0, FIRE_GOAL − liquidNW)` |
| **Mode toggle** | 📈 Standard SWR vs 💎 w/ Inheritance |
| **Link button** | "Open full FIRE analysis →" switches to the FIRE tab |

---

## Widget State

### Global state (shared with FIRE tab)
The widget reads these from component-level state — changing them in the FIRE tab's sliders will update the widget automatically:

| State var | Default | Effect on widget |
|-----------|---------|-----------------|
| `fireLocationKey` | `"thailand"` | Which location's cost data to use |
| `fireTier` | `"comfortable"` | Lifestyle tier (lean/comfortable/cushy) |
| `fireSwr` | `0.04` | SWR used in Standard mode |
| `fireColInflation` | `0.05` | COL inflation for projecting spend at retirement |
| `fireCurrencyBuffer` | `0.05` | Buffers applied to base monthly cost |
| `fireHealthcareBuffer` | `0.10` | |
| `fireLifestyleBuffer` | `0.05` | |
| `fireInheritanceAge` | `48` | Age used in inheritance drawdown formula |

### Widget-local state
| State var | Default | Description |
|-----------|---------|-------------|
| `fgWidgetInheritance` | `false` | Toggles Standard SWR vs Inheritance mode **within the widget only** — does not affect the FIRE tab's `fireInheritanceMode` |

---

## Inheritance Toggle

Two pill buttons appear at the top of the widget content:

- **📈 Standard SWR** (default) — orange theme. FIRE goal = `inflatedAnnualSpend / fireSwr`. Portfolio must last forever.
- **💎 w/ Inheritance** — emerald theme. FIRE goal = PV annuity from FIRE date to `fireInheritanceAge`. Portfolio only needs to last until inheritance arrives. Progress bar turns green.

The toggle is **independent** of the FIRE tab's Advanced Assumptions inheritance mode. You can have the tab in standard mode and the widget in inheritance mode, or vice versa.

---

## Computation (Inline Mini-FIRE)

The widget re-implements the FIRE tab's core math inline (since the FIRE tab runs in a separate IIFE scope). The formulas are identical:

### Liquid NW
```
_fgLiquid = btcAfterTax + vanguardAfterTax + (roth × 0.75) + (401k × 0.68)
          + max(0, homeAfterTaxNetCash) + checking + careerglow + (hsa × 0.58)
          + domain + eTrade + fordExplorer + kawasaki
```

### FIRE Goal
```
monthlyBase     = sum(FIRE_TIER_DATA[location][tier])
monthlyToday    = round(monthlyBase × (1 + currencyBuf + healthBuf + lifeBuf))
annualToday     = monthlyToday × 12
inflatedAnnual  = annualToday × (1 + fireColInflation)^yearsToFIRE

// Standard mode:
FIRE_GOAL = round(inflatedAnnual / fireSwr)

// Inheritance mode:
drawdownYrs = max(1, fireInheritanceAge − (28 + yearsToFIRE))
FIRE_GOAL   = round(inflatedAnnual × [1 − (1.07)^(−drawdownYrs)] / 0.07)
```

### Progress
```
pct = min((liquidNW / FIRE_GOAL) × 100, 100)
```

---

## Widget Registration

The widget is registered in the full overview widget system:

| Registration point | Value |
|-------------------|-------|
| `overviewWidgets` default state | `fireGoal: true` (visible by default) |
| `WidgetKey` union type | includes `"fireGoal"` |
| `widgetOrder` default array | appended after `"portfolioAllocation"` |
| localStorage migration guard | `if (!parsed.includes("fireGoal")) parsed.push("fireGoal")` |
| Server prefs migration | `if (!order.includes("fireGoal")) order.push("fireGoal")` |
| Toggle bar | `{ key: "fireGoal", label: "FIRE Goal", dot: "bg-orange-400" }` |
| `WIDGET_META` | `fireGoal: { label: "FIRE Goal" }` |
| `BORDER` map | `fireGoal: "border-orange-500/20 hover:border-orange-500/50"` |

---

## Notes / Subscriptions Field

The `financial_items` table now has a `notes` column (`text`, nullable). When set, it renders as a dimmed subheader beneath the item name in the subscriptions table. Currently used for:

- **CareerGlow Google Workspace** (`id: 469`) → `"Reviewer & Admin accounts"`

To set notes on any item, update the DB directly:
```sql
UPDATE financial_items SET notes = 'Your note here' WHERE id = <id>;
```

---

## Defaults Summary

| Setting | Default | Reason |
|---------|---------|--------|
| Location | Thailand 🇹🇭 | Lowest cost, most popular FIRE expat destination |
| Tier | Comfortable | Realistic expat living without deprivation |
| Inheritance toggle | Standard SWR | Conservative default; inheritance is upside scenario |
