# 📊 Finance Page — Calculations & Filters Reference

**File:** `client/src/pages/finances.tsx`  
**Last updated:** June 1, 2026

---

## Table of Contents

1. [Item Classification (Income / Expense / Retirement)](#1-item-classification)
2. [Monthly Summary Totals](#2-monthly-summary-totals)
3. [Cashflow (W2-only logic)](#3-cashflow-w2-only-logic)
4. [Net Worth Calculations](#4-net-worth-calculations)
5. [Market Price Fetching & Caching](#5-market-price-fetching--caching)
6. [Real Estate Calculations](#6-real-estate-calculations)
7. [Early Withdrawal Haircuts (Retirement Accounts)](#7-early-withdrawal-haircuts)
8. [Portfolio Allocation Pie](#8-portfolio-allocation-pie)
9. [Filtering & Sorting (Table Tab)](#9-filtering--sorting-table-tab)
10. [Business Item Logic](#10-business-item-logic)
11. [Category Colors](#11-category-colors)
12. [Auto-Seeded Items](#12-auto-seeded-items)
13. [NW Snapshot Auto-Save](#13-nw-snapshot-auto-save)

---

## 1. Item Classification

Every financial item is classified into one of three buckets by `classifyItem(category, tags)`:

| Bucket | Triggers |
|--------|----------|
| `"income"` | category is `"Income"` or `"Investment"` |
| `"retirement"` | category is `"Retirement"` |
| `"expense"` | everything else |

Tags are also inspected — if an item has the `"Business"` tag it is flagged by `isBusinessItem()` but still goes through the same three-bucket classification.

**Source:** Look for `classifyItem` near the top of the file (file-level function, not inside the component).

---

## 2. Monthly Summary Totals

These are computed from the live `financialItems` array:

```
totalIncome     = sum of all "income" items' monthlyCost
totalRetirement = sum of all "retirement" items' monthlyCost
totalExpenses   = sum of all "expense" items' monthlyCost
netCashFlow     = totalIncome - totalExpenses
savingsRate     = (netCashFlow / totalIncome) × 100
```

> ⚠️ `monthlyCost` is stored in **cents** in the database. The UI divides by 100 everywhere before displaying. Always pass cents to the API.

`netCashFlow` includes investment/RSU income. The **W2-only** cashflow is a separate calculation (see §3).

**Status badge thresholds:**
- `savingsRate > 60%` → 🎉 Excellent (green)
- `savingsRate ≥ 51%` → ✅ Good (green)
- `savingsRate > 0%`  → 💡 Room for improvement (yellow)
- `netCashFlow < 0`   → ⚠️ Warning (red)

---

## 3. Cashflow (W2-only logic)

The **Cashflow tab** intentionally ignores RSUs, ESPP, investment income, etc. It only counts the single item named exactly `"Post-Tax W2 Salary Income"`:

```
w2Income       = financialItems.find(i => i.item === "Post-Tax W2 Salary Income")?.monthlyCost ?? 0
cashflowNetRaw = w2Income - totalExpenses
nonW2Income    = totalIncome - w2Income   ← RSUs, ESPP, etc.
```

**Why?** W2 salary is predictable and recurring. RSU vests and ESPP proceeds are lumpy and shouldn't be counted as regular monthly cashflow.

The cashflow **pie chart** shows three slices:
1. W2 Salary
2. Expenses
3. Retirement Contributions (treated as outflow from W2)

---

## 4. Net Worth Calculations

All net worth figures are **after-tax liquidation values** — what you'd actually receive if you sold everything today. This is the conservative "true pocket money" number.

### Asset values (component-level, before tax)

```
_btcValue      = btcHoldings × btcPrice
_coinbaseValue = coinbaseBtcHoldings × btcPrice
_totalBtcValue = _btcValue + _coinbaseValue

_vtsaxValue    = vtsaxHoldings × vtsaxPrice
_vooValue      = vooHoldings × vooPrice
_vanguardTotal = _vtsaxValue + _vooValue

_rothIraValue  = (rothIraIbitHoldings × ibitPrice) + (rothIraVtsaxHoldings × vtsaxPrice)
_k401Value     = k401Shares × ssoPrice   ← ProShares Ultra S&P500 (SSO)
```

### After-tax haircuts (Overview + FIRE)

| Asset | Tax logic | Multiplier |
|-------|-----------|-----------|
| BTC (hardware + Coinbase) | 15% LTCG on entire value | × 0.85 |
| Vanguard brokerage (VTSAX + VOO) | 15% LTCG on entire value | × 0.85 |
| Roth IRA | 10% early withdrawal penalty + income tax on gains; contributions already after-tax — blended ~25% effective haircut | × 0.75 |
| 401k (SSO) | 10% early withdrawal penalty + ~22% federal income tax = 32% haircut | × 0.68 |
| HSA (non-medical before 65) | 20% penalty + ~22% income tax = 42% haircut | × 0.58 |
| Real estate | See §6 | custom |
| Cash (checking + CareerGlow + HSA) | No tax | × 1.00 |
| Vehicles | No tax assumed | × 1.00 |
| E*Trade RSU | Already liquidated → $0 currently | × 1.00 |
| veluna.com domain | 15% LTCG on gains above purchase price | custom |

### `overviewNetWorth` (used for NW widget + snapshots)

```
overviewNetWorth =
  _btcAfterTax
  + _vanguardAfterTax
  + _rothIraAfterPenalty   ← Roth × 0.75
  + _k401AfterPenalty      ← 401k × 0.68
  + _homeAfterTaxNetCash   ← see §6
  + checkingBalance
  + careerglowBalance
  + hsaBalance             ← NOT the 42%-haircut value here (full balance shown in NW widget)
  + _domainAfterTax
  + eTradeRsuValue
  + fordExplorerValue
  + kawasakiNinjaValue
```

> **Note:** The NW widget uses `hsaBalance` raw (not 58% haircut) because HSA can be used tax-free for medical expenses. The FIRE tab uses `_fireHsaValue = hsaBalance × 0.58` to be conservative.

### Holdings stored in localStorage

All NW holdings are stored in `localStorage` with these keys:

| Key | Default | Description |
|-----|---------|-------------|
| `nw-btc` | `1` | BTC in hardware wallet |
| `nw-coinbase-btc` | `0.06953573` | BTC on Coinbase |
| `nw-vtsax` | `146.857` | VTSAX shares (taxable Vanguard) |
| `nw-voo` | `240.676` | VOO shares (taxable Vanguard) |
| `nw-roth-ibit` | `697` | IBIT shares in Roth IRA |
| `nw-roth-vtsax` | `145.188` | VTSAX shares in Roth IRA |
| `nw-401k-sso` | `1734.032` | SSO shares in 401k |
| `nw-checking` | `100622` | BMO checking (dollars) |
| `nw-etrade-rsu` | `0` | E*Trade RSU value (dollars) |
| `nw-ford-explorer` | `17000` | 2020 Ford Explorer (dollars) |
| `nw-kawasaki-ninja` | `1200` | Kawasaki Ninja (dollars) |
| `nw-veluna-domain` | `4050` | veluna.com estimated value |
| `nw-home-value` | `636000` | Manual home estimate (fallback) |
| `nw-home-loan` | `614000` | Mortgage balance |

---

## 5. Market Price Fetching & Caching

Live prices are fetched via TanStack Query with `staleTime: 60_000` (1 minute):

| Endpoint | Asset | Used for |
|----------|-------|---------|
| `/api/market/bitcoin` | BTC/USD | `_btcPrice` |
| `/api/market/vtsax` | VTSAX NAV | `_vtsaxPrice`, Roth IRA |
| `/api/market/voo` | VOO price | `_vooPrice` |
| `/api/market/ibit` | IBIT price | Roth IRA IBIT shares |
| `/api/market/sso` | SSO price | `_viiixPrice` (401k) |
| `/api/market/property?address=…` | Redfin estimate | `_homeLivePrice`; `staleTime: 6hrs` |

**Cache fallback:** When a live fetch fails, the last known price is read from `localStorage` (`cache_btc_price`, `cache_vtsax_price`, etc.). The UI shows a yellow warning when cached values are being used.

**Property:** Uses the live Redfin estimate when available, otherwise falls back to the manually entered `homeEstValue`. The Zestimate is explicitly not used because it lags transaction data by weeks.

---

## 6. Real Estate Calculations

Full home-sale simulation (every number is re-computed on every render):

```
_homeSalePrice         = live Redfin price OR manual homeEstValue
_homeAgentCommission   = _homeSalePrice × (homeSellerFee / 100)   ← default 6%
_homeTransferTax       = _homeSalePrice × 0.0022                  ← Placer County rate
_homeTotalSellingCosts = _homeAgentCommission + _homeTransferTax + homeOtherCosts
_homeNetCashAfterSale  = _homeSalePrice - homeLoanBalance - _homeTotalSellingCosts

_homeAdjustedBasis     = homePurchasePrice + homeCapImprovements - homeDepreciation
_homeRawGain           = _homeSalePrice - _homeTotalSellingCosts - _homeAdjustedBasis
_homeTaxableGain       = max(0, _homeRawGain - homePrimaryExclusion)  ← §121 exclusion ($250k single)
_homeCapGainsTax       = _homeTaxableGain × (homeFedCapGainsRate + homeCaCapGainsRate) / 100
_homeAfterTaxNetCash   = _homeNetCashAfterSale - _homeCapGainsTax
```

If `_homeAfterTaxNetCash < 0` (underwater), it is treated as **$0** in NW calculations (you don't have negative cash, you'd just walk away or short-sell).

Default rates:
- Federal cap gains rate: **15%**
- California cap gains rate: **9.3%** (CA taxes cap gains as ordinary income)
- Primary residence exclusion: **$250,000** (single filer)
- Transfer tax: **0.22%** (Placer County)
- Agent commission: **6%**

---

## 7. Early Withdrawal Haircuts

These apply when estimating "what would you actually get if you cashed out your retirement accounts TODAY at age 28":

### Roth IRA (× 0.75 — 25% haircut)
- Contributions are already after-tax and can be withdrawn penalty-free.
- But **gains** are subject to the 10% early withdrawal penalty + income tax.
- Blended haircut across contributions + gains = ~25% effective reduction.

### 401k (× 0.68 — 32% haircut)
- All contributions are pre-tax.
- 10% early withdrawal penalty applies.
- ~22% federal income tax on the withdrawal.
- Combined: 10% + 22% = 32% effective haircut.

### HSA (× 0.58 — 42% haircut, FIRE tab only)
- If used for non-medical expenses before age 65: 20% penalty + ~22% income tax.
- Note: The main NW widget shows the raw HSA balance since it *can* be used tax-free for medical expenses.

---

## 8. Portfolio Allocation Pie

The **Net Worth tab** allocation pie breaks holdings into five slices:

| Slice | Calculation |
|-------|-------------|
| Bitcoin | `_btcAfterTax` (all wallets, 15% LTCG applied) |
| Vanguard Brokerage | `_vanguardAfterTax` (VTSAX + VOO, 15% LTCG) |
| Roth IRA | `_rothIraAfterPenalty` (IBIT + VTSAX, 25% haircut) |
| 401k | `_k401AfterPenalty` (SSO, 32% haircut) |
| Real Estate | `_homeAfterTaxNetCash` |

Cash, vehicles, HSA, domain are shown separately in the asset breakdown table but not in the pie (to keep it focused on investable assets).

---

## 9. Filtering & Sorting (Table Tab)

### Category filter
`categoryFilter` state — defaults to `"All"`. Selecting a category filters `financialItems` to only show that category.

### Text search
`tableSearch` state — case-insensitive substring match against the `item` name field.

### Sort
`sortField` and `sortDirection` are persisted to `localStorage`:
- Keys: `finance-sort-field`, `finance-sort-direction`
- Sortable columns: `item`, `category`, `monthlyCost`, `recurType`
- Clicking the same column twice flips direction (asc ↔ desc)

The sort runs on the already-filtered `filteredItems` array.

### Resizable columns
Column widths are stored in `colWidths` state (not persisted). Default widths:
`[320, 160, 110, 110, 150, 48]` → Item, Category, Monthly, Annual, Recur, Actions.

---

## 10. Business Item Logic

`isBusinessItem(item)` returns `true` if:
- `item.category === "Business"` **OR**
- `item.tags` array includes `"Business"`

This flag is used in the **Business tab** to filter and display only business-related expenses. It does **not** affect whether an item is classified as income/expense — that is purely category-based (see §1).

---

## 11. Category Colors

Used in all pie charts and category legends:

| Category | Color |
|----------|-------|
| Income | `#22C55E` (green) |
| Investment | `#4ADE80` (light green) |
| Retirement | `#FBBF24` (yellow) |
| Housing | `#EF4444` (red) |
| Food | `#F59E0B` (amber) |
| Transportation | `#10B981` (emerald) |
| Business | `#3B82F6` (blue) |
| Insurance | `#F97316` (orange) |
| Health (Non Insurance) | `#06B6D4` (cyan) |
| General | `#8B5CF6` (violet) |
| Entertainment | `#EC4899` (pink) |
| Phone | `#6366F1` (indigo) |
| Internet | `#14B8A6` (teal) |
| Credit Card | `#84CC16` (lime) |
| Toiletries | `#A855F7` (purple) |
| Charity | `#F43F5E` (rose) |

Unknown categories fall back to `#94A3B8` (slate).

---

## 12. Auto-Seeded Items

Several items are auto-created on first load if they don't already exist. These are one-time seeds that avoid requiring manual data entry:

| Item | Category | Monthly cost | Notes |
|------|----------|-------------|-------|
| MailWisp Paid User Income | Income | $1.00 | Business SaaS revenue |
| Sperm Freeze Reprotech | Health | $33.33 | $399.96/yr amortized |
| Brilliant Pest Solutions | Home | $59.00 | Rocklin rental property |
| CASA Annual Audit (TAC) | Business | $60.00 | $720/yr amortized |

The seed check is `financialItems.length > 0 && !financialItems.find(i => i.item === "…")` — so it only fires once data has loaded and never duplicates.

---

## 13. NW Snapshot Auto-Save

Every time prices finish loading (when `nwIsLoading` transitions to `false`), a monthly NW snapshot is upserted to the database:

- **Endpoint:** `POST /api/nw-snapshots`
- **Key:** `month = new Date().toISOString().slice(0, 7)` → e.g. `"2026-06"`
- **Value:** `Math.round(overviewNetWorth)` in dollars
- **Breakdown:** JSON object with per-asset buckets (btc, vanguard, rothIra, k401, realEstate, cash, domain, etrade, vehicles)

The upsert logic on the server (`ON CONFLICT (user_id, month) DO UPDATE`) means running this multiple times in the same month simply updates the value rather than creating duplicates.

Historical snapshots are displayed in the **NW Trend** tab as a line chart.

---

## One-Time Data Migrations

Keyed by `localStorage` flags to run exactly once per browser:

| Migration key | What it does |
|---------------|-------------|
| `nw-migration-20260527` | Set ETrade RSU → $0, checking → $100,622 (post-RSU liquidation) |
| `nw-migration-20260529-roth` | Update Roth VTSAX shares: 146.857 → 145.188; IBIT stays 697 |
