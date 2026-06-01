# 🔥 FIRE Goal Tab — How It Works

**File:** `client/src/pages/finances.tsx` — `<TabsContent value="fire">` IIFE  
**Last updated:** June 1, 2026

---

## Table of Contents

1. [What Is FIRE?](#1-what-is-fire)
2. [Lifestyle Tiers (Lean / Comfortable / Cushy)](#2-lifestyle-tiers)
3. [Cost of Living Base Numbers](#3-cost-of-living-base-numbers)
4. [Buffers (Currency, Healthcare, Lifestyle)](#4-buffers)
5. [COL Inflation Adjustment](#5-col-inflation-adjustment)
6. [FIRE Goal Formula (Full Step-by-Step)](#6-fire-goal-formula)
7. [Years-to-FIRE Projection](#7-years-to-fire-projection)
8. [Safe Withdrawal Rate (SWR)](#8-safe-withdrawal-rate-swr)
9. [Portfolio Projection Model (`fireFV`)](#9-portfolio-projection-model-firefv)
10. [Interactive Sliders](#10-interactive-sliders)
11. [Tables Explained](#11-tables-explained)
12. [FIRE Milestones](#12-fire-milestones)
13. [True Liquid NW (FIRE version)](#13-true-liquid-nw-fire-version)
14. [All State Variables](#14-all-state-variables)
15. [File-Level Constants](#15-file-level-constants)

---

## 1. What Is FIRE?

**Financial Independence, Retire Early.** The goal is to accumulate enough invested assets that passive investment returns (dividends + appreciation) cover all living expenses indefinitely, meaning you never need to work again.

The classic formula:

```
FIRE Goal = Annual Spending / Safe Withdrawal Rate
```

Example: $30,000/yr spending ÷ 4% SWR = **$750,000 needed**.

This app targets retiring **abroad** (Southeast Asia or South America) where a comfortable life costs far less than the US, making FIRE achievable much earlier.

---

## 2. Lifestyle Tiers

Three lifestyle tiers let you model different retirement lifestyles:

| Tier | Description | Target demographic |
|------|-------------|-------------------|
| 🎒 **Lean** | Budget-conscious, local neighborhoods, mostly street food, scooter-only | "Enough to survive well" |
| 🏠 **Comfortable** | Nice expat-quality 1BR, mix of local/western food, international health insurance | "Upper-end realistic expat" |
| ✨ **Cushy** | Premium apartment, lots of restaurants, regular travel, big healthcare buffer | "Digital nomad luxury" |

**Tier selector** appears in the top-right of the FIRE tab. Changing the tier instantly updates:
- All monthly budget numbers
- All tables
- The FIRE goal target
- The projection chart

---

## 3. Cost of Living Base Numbers

Base costs are defined in the **`FIRE_TIER_DATA`** file-level constant (near top of `finances.tsx`):

```typescript
FIRE_TIER_DATA[location][tier] = {
  rent, food, transport, health, entertainment, utilities, visa
}
```

All values are in **USD per month, today's dollars.**

### Chiang Mai, Thailand 🇹🇭

| Category | Lean | Comfortable | Cushy |
|----------|------|-------------|-------|
| Rent | $400 | $750 | $1,500 |
| Food | $280 | $500 | $900 |
| Transport | $75 | $120 | $200 |
| Health insurance | $110 | $150 | $300 |
| Entertainment | $100 | $250 | $450 |
| Utilities | $65 | $100 | $150 |
| Visa/travel | $100 | $230 | $300 |
| **Base total** | **$1,130** | **$2,100** | **$3,800** |

### Da Nang, Vietnam 🇻🇳

| Category | Lean | Comfortable | Cushy |
|----------|------|-------------|-------|
| Rent | $350 | $700 | $1,200 |
| Food | $260 | $450 | $850 |
| Transport | $70 | $100 | $160 |
| Health insurance | $110 | $150 | $280 |
| Entertainment | $90 | $220 | $400 |
| Utilities | $60 | $90 | $130 |
| Visa/travel | $100 | $190 | $280 |
| **Base total** | **$1,040** | **$1,900** | **$3,300** |

### Medellín, Colombia 🇨🇴

| Category | Lean | Comfortable | Cushy |
|----------|------|-------------|-------|
| Rent | $550 | $1,000 | $1,800 |
| Food | $330 | $550 | $1,000 |
| Transport | $75 | $120 | $200 |
| Health insurance | $110 | $150 | $300 |
| Entertainment | $130 | $300 | $600 |
| Utilities | $65 | $100 | $150 |
| Visa/travel | $100 | $180 | $300 |
| **Base total** | **$1,360** | **$2,400** | **$4,350** |

---

## 4. Buffers

Buffers add a safety margin on top of the base COL numbers. Three independent sliders:

| Buffer | Default | Purpose |
|--------|---------|---------|
| Currency buffer | 5% | USD may weaken vs local currency; protects against exchange rate risk |
| Healthcare buffer | 10% | International health insurance costs are volatile; unexpected medical expenses |
| Lifestyle buffer | 5% | Unexpected trips, gifts, emergencies, lifestyle creep |

All three buffers add together:

```
totalBuffer = currencyBuffer + healthcareBuffer + lifestyleBuffer
adjustedMonthly = baseMonthly × (1 + totalBuffer)
```

Default total buffer = **20%** on top of base costs.

---

## 5. COL Inflation Adjustment

Living costs abroad increase over time (especially in rapidly developing markets like Thailand and Vietnam). The COL inflation slider (default **5%/yr**) inflates today's spending to estimate what you'd actually spend at the time of retirement:

```
inflatedAnnualAtRetirement = adjustedAnnual × (1 + colInflation)^yearsToFire
```

### Why 5% (not US CPI of ~3%)?

- Thailand and Vietnam have experienced 4–7% local price inflation over the past decade as their economies industrialize.
- USD tends to weaken 2–3%/yr against emerging market currencies long-term.
- Premium expat-quality housing in these cities is in high demand, pushing rents up faster than general inflation.
- 5% is a realistic middle-ground buffer.

The **inflation scenario table** lets you see the monthly cost at 3%, 5%, 7%, and 9%/yr across 7 time horizons.

---

## 6. FIRE Goal Formula

The full 4-step calculation:

### Step 1: Compute today's adjusted monthly cost
```
baseMonthly     = sum of all 7 category costs for selected location + tier
adjustedMonthly = baseMonthly × (1 + totalBuffer)
adjustedAnnual  = adjustedMonthly × 12
```

### Step 2: First-pass years to FIRE (for inflation estimation)
Run `fireFV(n)` (see §9) starting from `n=1` until the projected portfolio value exceeds `adjustedAnnual / SWR`. This gives a rough estimate of how many years until FIRE.

### Step 3: Inflate costs to retirement year
```
inflatedAnnual = adjustedAnnual × (1 + colInflation)^yearsToFirePass1
```

### Step 4: Compute the actual FIRE goal
```
FIRE_GOAL = inflatedAnnual / SWR
```

### Why inflate first, then compute the goal?

A naive "today's costs × 25" approach underestimates how much you need. If you plan to retire in 12 years and costs inflate 5%/yr, your actual spending at retirement will be 80% higher than today. You need to accumulate enough to sustain *those future costs*, not today's.

---

## 7. Years-to-FIRE Projection

After computing `FIRE_GOAL`, the algorithm iterates from `n=1` to `n=80` and finds the first year where `fireFV(n) ≥ FIRE_GOAL`:

```
for n = 1 to 80:
  if fireFV(n) >= FIRE_GOAL:
    yearsToFire = n
    break

fireAge = currentAge + yearsToFire
fireYear = 2026 + yearsToFire
```

Current age is calculated from DOB **October 1, 1997**, anchored to today (June 1, 2026) = age **28**.

If `_fireLiquidNW ≥ FIRE_GOAL` already, `yearsToFire = 0`.

If the loop reaches 80 without hitting the goal (e.g. negative savings rate), `yearsToFire = null` and the UI shows an error.

---

## 8. Safe Withdrawal Rate (SWR)

The SWR is the percentage of your portfolio you withdraw each year in retirement. The historical research (Trinity Study, Bengen 1994) supports:

| SWR | Implied multiple | Risk level |
|-----|-----------------|-----------|
| 5.0% | 20× annual spend | Aggressive — works for short retirement |
| 4.5% | 22× | Moderately aggressive |
| 4.0% | 25× | Classic "4% rule" — 95%+ success over 30 yrs |
| 3.5% | 29× | Conservative — good for early retirement (40+ yr horizon) |
| 3.25% | 31× | Very conservative |
| 3.0% | 33× | Highly conservative — virtually bulletproof |

The slider defaults to **4.0%** but ranges from 2.5% to 5.0%.

**Why the 4% rule may be too aggressive for early retirement at 28:**  
A 30-year retirement (retiring at 55) has much higher historical success rates than a 60-year retirement (retiring at 28). 3.5% or 3.25% is more prudent for a 55+ year retirement horizon.

---

## 9. Portfolio Projection Model (`fireFV`)

The `fireFV(n)` function projects the total portfolio value `n` years from now:

```
fireFV(n) =
  investFV(n)         ← investable assets growing at 8%/yr + annual savings
  + homeFV(n)         ← home equity growing at 4%/yr
  + _fireCashFixed    ← cash that doesn't meaningfully grow
```

### Growth rates
| Component | Rate | Rationale |
|-----------|------|-----------|
| `R_INVEST = 8%` | Investable assets (BTC, stocks, Roth IRA, 401k) | ~8% is the historical long-run nominal return of a diversified equity portfolio (S&P 500 ~10%, global diversification ~8%) |
| `R_HOME = 4%` | Home equity | ~4% nominal home appreciation; conservative vs historical ~5% |

### Investable assets (`_fireInvestable`)
```
_fireInvestable =
  _btcAfterTax
  + _vanguardAfterTax
  + _fireRothValue    ← Roth × 0.75
  + _fire401kValue    ← 401k × 0.68
  + eTradeRsuValue
```

### Annual savings added (`_fireAnnualSavings`)
```
_fireActual401kContrib = min(totalRetirement × 12, $23,500)   ← IRS 2026 annual limit
_fireAnnualRetirementNet = _fireActual401kContrib × 0.68       ← after 401k early-withdrawal haircut
_fireAnnualDirectSavings = max(0, cashflowNetRaw) × 12         ← W2 net cash, annualized
_fireAnnualSavings = _fireAnnualDirectSavings + _fireAnnualRetirementNet
```

### FV formula
```
investFV(n) = _fireInvestable × (1 + R_INVEST)^n
            + _fireAnnualSavings × [(1 + R_INVEST)^n - 1] / R_INVEST
```
(Standard future value of a growing annuity formula.)

### Home equity (`_fireHomeBase`)
```
_fireHomeBase = max(0, _homeAfterTaxNetCash)   ← $0 if underwater
homeFV(n) = _fireHomeBase × (1 + R_HOME)^n
```

### Cash (fixed, no growth)
```
_fireCashFixed = checkingBalance + careerglowBalance + _fireHsaValue + _domainAfterTax + fordExplorerValue + kawasakiNinjaValue
```

---

## 10. Interactive Sliders

Five `<input type="range">` sliders in the **⚙️ Advanced Assumptions** card:

| Slider | State var | Default | Range | Step |
|--------|-----------|---------|-------|------|
| Safe Withdrawal Rate | `fireSwr` | 4.00% | 2.5–5.0% | 0.0025 |
| COL Inflation / yr | `fireColInflation` | 5.0% | 0–10% | 0.5% |
| Currency Buffer | `fireCurrencyBuffer` | 5% | 0–30% | 1% |
| Healthcare Buffer | `fireHealthcareBuffer` | 10% | 0–50% | 1% |
| Lifestyle Buffer | `fireLifestyleBuffer` | 5% | 0–50% | 1% |

All sliders are controlled React state — every change triggers an immediate re-render and all downstream calculations update in real time.

**Persistence:** These are intentionally *not* persisted to localStorage. They reset on page refresh so you always see the baseline defaults first.

---

## 11. Tables Explained

### Monthly Budget by Tier

Shows the 7 spending categories for the selected location across all three tiers.

- **Base Total row:** raw sum of the 7 categories before any buffer
- **+X% Buffers row:** after multiplying by `(1 + totalBuffer)`
- **FIRE Goal row:** rough estimate using 15-year inflation window (not the precise goal — that uses the iterative pass-1 method). Good for comparison across tiers at a glance.
- Currently selected tier is underlined in the buffered row.

### FIRE Target by Withdrawal Rate × Tier

Grid of 6 SWRs × 3 tiers = 18 cells. Based on **today's costs** (no inflation), after applying buffers.

```
goal = (adjustedMonthly × 12) / SWR
```

The currently selected SWR row is highlighted in orange.

### Monthly COL Over Time (Inflation Scenarios)

Shows how much you'd spend per month at 4 different inflation rates (3%, 5%, 7%, 9%) across 7 time horizons (today, +5, +10, +15, +20, +25, +30 years).

```
projectedMonthly(year, rate) = adjustedMonthly × (1 + rate)^year
```

- The currently selected inflation rate column is bolded in yellow.
- The estimated retirement year row (based on the selected location's `locYrs`) is highlighted.
- Year 0 (today, 2026) is highlighted in green.

---

## 12. FIRE Milestones

Four progress milestones are tracked against the current FIRE goal:

| Milestone | Target | Label |
|-----------|--------|-------|
| 25% | `FIRE_GOAL × 0.25` | Building momentum |
| 50% | `FIRE_GOAL × 0.50` | Half-FIRE — compounding kicks in |
| 75% | `FIRE_GOAL × 0.75` | Coast-FIRE — can slow savings |
| 100% | `FIRE_GOAL` | Full FIRE 🎉 |

For each unmet milestone, the projection data is searched for the first year `fireFV(n) ≥ target` and that year/age is displayed.

---

## 13. True Liquid NW (FIRE Version)

The FIRE tab computes its own liquid NW (`_fireLiquidNW`) that is slightly more conservative than the Overview widget's NW, because it also haircuts the HSA:

```
_fireRothValue = _rothIraValue × 0.75    ← 25% early withdrawal haircut
_fire401kValue = _k401Value × 0.68       ← 32% early withdrawal haircut
_fireHsaValue  = hsaBalance × 0.58       ← 42% haircut (non-medical before 65)

_fireLiquidNW =
  _btcAfterTax
  + _vanguardAfterTax
  + _fireRothValue
  + _fire401kValue
  + max(0, _homeAfterTaxNetCash)
  + checkingBalance
  + careerglowBalance
  + _fireHsaValue          ← haircut applied here (vs raw in overview)
  + _domainAfterTax
  + eTradeRsuValue
  + fordExplorerValue
  + kawasakiNinjaValue
```

**Progress percentage:**
```
pct = min(_fireLiquidNW / FIRE_GOAL × 100, 100)
```

---

## 14. All State Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `fireLocationKey` | `"thailand" \| "vietnam" \| "colombia"` | `"thailand"` | Selected retirement location |
| `fireColExpanded` | `"thailand" \| "vietnam" \| "colombia" \| null` | `null` | Which COL card methodology essay is expanded |
| `fireTier` | `"lean" \| "comfortable" \| "cushy"` | `"comfortable"` | Selected lifestyle tier |
| `fireSwr` | `number` | `0.04` | Safe withdrawal rate (4%) |
| `fireColInflation` | `number` | `0.05` | Local COL inflation rate (5%/yr) |
| `fireCurrencyBuffer` | `number` | `0.05` | Currency risk buffer (5%) |
| `fireHealthcareBuffer` | `number` | `0.10` | Healthcare cost buffer (10%) |
| `fireLifestyleBuffer` | `number` | `0.05` | Lifestyle/misc buffer (5%) |

---

## 15. File-Level Constants

These live outside the React component (at the top of `finances.tsx`) so they don't get re-created on every render:

### `FIRE_METHODOLOGY`
```typescript
FIRE_METHODOLOGY: Record<"thailand" | "vietnam" | "colombia", string>
```
Long-form essays explaining the methodology behind each location's cost estimates. Shown in the expandable "📖 How these numbers were calculated" section on each COL card.

### `FIRE_TIER_DATA`
```typescript
FIRE_TIER_DATA: Record<
  "thailand" | "vietnam" | "colombia",
  Record<"lean" | "comfortable" | "cushy", {
    rent, food, transport, health, entertainment, utilities, visa
  }>
>
```
The authoritative source of all base monthly costs. 3 locations × 3 tiers × 7 categories = **63 data points**. All values in USD/month in today's dollars. Edit this object to update costs.

---

## Quick Reference: How to Update the Numbers

| What to change | Where |
|---------------|-------|
| Base monthly costs for a tier/location | `FIRE_TIER_DATA` constant (~line 82 in finances.tsx) |
| Methodology essays (expandable cards) | `FIRE_METHODOLOGY` constant (~line 25 in finances.tsx) |
| Default SWR | `useState<number>(0.04)` for `fireSwr` |
| Default COL inflation | `useState<number>(0.05)` for `fireColInflation` |
| Default buffers | `fireCurrencyBuffer (0.05)`, `fireHealthcareBuffer (0.10)`, `fireLifestyleBuffer (0.05)` |
| Investment growth rate | `R_INVEST = 0.08` inside the FIRE tab IIFE |
| Home equity growth rate | `R_HOME = 0.04` inside the FIRE tab IIFE |
| User's birth date | `BIRTH_YEAR = 1997`, `BIRTH_MONTH = 9` inside the FIRE tab IIFE |
| IRS 401k contribution limit | `23_500` inside `_fireActual401kContrib` calculation |
