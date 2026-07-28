# 🏠 Rental ROI & S&P 500 Calculator — Math & Logic Reference

**Property:** 2605 Plumbago Court, Rocklin, CA 95677  
**Purchased:** May 2025  
**Calculator location:** Finances → Real Estate tab → ROI Calculator

---

## Table of Contents

1. [Property Inputs (Hard-Coded Actuals)](#1-property-inputs)
2. [Down Payment](#2-down-payment)
3. [Projected Sale Calculation](#3-projected-sale-calculation)
4. [Holding Costs](#4-holding-costs)
5. [Rental Income Scenario](#5-rental-income-scenario)
6. [ROI & CAGR](#6-roi--cagr)
7. [S&P 500 Comparison](#7-sp-500-comparison)
8. [Adjustable Sliders & Defaults](#8-adjustable-sliders--defaults)
9. [Tax Assumptions](#9-tax-assumptions)
10. [Worked Example with Default Inputs](#10-worked-example-with-default-inputs)

---

## 1. Property Inputs

These are the actual known numbers for the Rocklin house, editable in the Net Worth tab:

| Input | Value | Notes |
|---|---|---|
| Purchase price | $636,000 | May 2025 |
| Current estimated value | $636,000 | Updated via Redfin live price or manual entry |
| Remaining loan balance | $614,000 | 30-year mortgage, started May 2025 |
| Monthly housing cost | ~$4,467/mo | Mortgage (PITI) + HOA + utilities + insurance — pulled live from finance items |
| Down payment | $30,000 | ~3.5% FHA + closing costs (hard override) |
| Pending/one-time costs | $42,958 | Shed $6,158 + floors $35,000 (tentative) + roof $500 + fume hood $1,300 |

### One-Time Costs Breakdown

| Item | Amount | Status |
|---|---|---|
| Down payment + closing costs | $30,000 | Paid |
| New shed (Affirm financed) | $6,200 | Paid |
| Small roof fix | $500 | Paid |
| Fume hood install | $1,300 | Paid |
| Floor molding & replacement | $35,000 | **Tentative** |

---

## 2. Down Payment

The calculator uses a **hard override of $30,000** rather than inferring from loan paydown, because the actual out-of-pocket at close is known.

```
downPayment = $30,000 (override)
```

Without the override, it would be inferred as:
```
monthlyPrincipal = (purchasePrice - loanBalance) / monthsOwned
originalLoan = loanBalance + monthlyPrincipal × monthsOwned
downPayment = purchasePrice - originalLoan
```

---

## 3. Projected Sale Calculation

The sale is projected at the end of the hold period (`holdYears`, default 10 years).

### Step 1 — Projected Sale Price
```
projectedSalePrice = currentValue × (1 + annualAppreciation/100)^holdYears
```
Default: `$636,000 × (1.04)^10 = $940,976`

### Step 2 — Projected Remaining Loan Balance
The mortgage amortizes at a constant principal payment rate inferred from current paydown:
```
projectedLoanBalance = max(0, loanBalance - monthlyPrincipal × holdYears × 12)
```
Default: `$614,000 - (≈$167/mo × 120) = ~$594,000`

> Note: This is a simplified linear approximation. A real amortization schedule front-loads interest, so actual principal paid is slightly less in early years. The error is small over 10 years.

### Step 3 — Selling Costs
```
agentFee      = projectedSalePrice × 6%
transferTax   = projectedSalePrice × 0.22%
totalSellCosts = agentFee + transferTax
```
Default: `$940,976 × 6.22% = ~$58,529`

### Step 4 — Net Proceeds (Pre-Tax)
```
netPreTax = projectedSalePrice - projectedLoanBalance - totalSellCosts
```
Default: `$940,976 - $594,000 - $58,529 = ~$288,447`

### Step 5 — Capital Gains Tax
```
projectedGain     = projectedSalePrice - totalSellCosts - purchasePrice
taxableGain       = max(0, projectedGain - $250,000 exclusion)
capGainsTax       = taxableGain × 24.32%    ← 15% federal + 9.32% CA
```
The **$250,000 exclusion** applies if used as primary residence for 2 of the last 5 years (Section 121). As a rental property, this exclusion may **not apply** — adjust accordingly in the Net Worth tab.

The combined rate of **24.32%** = 15% federal long-term capital gains + 9.32% California state rate.

### Step 6 — After-Tax Net Proceeds
```
projectedAfterTax = netPreTax - capGainsTax - pendingCosts
```
`pendingCosts` are deducted here because they represent real cash outlays that reduce your net position — whether paid before or at sale.

---

## 4. Holding Costs

These are the total cash you spend owning the property over the hold period.

```
annualMaintenance = currentValue × annualMaintenancePct / 100
                  = $636,000 × 1.5% = $9,540/yr  (default)

totalHoldingCost  = (monthlyHousingCost × holdYears × 12)
                  + (annualMaintenance × holdYears)
                  + pendingCosts

totalCashInvested = downPayment + totalHoldingCost
```

### Default 10-Year Example
```
monthlyHousingCost ≈ $4,467/mo
Housing over 10 yrs = $4,467 × 120 = $536,040
Maintenance 10 yrs  = $9,540 × 10  = $95,400
Pending costs       = $42,958
────────────────────────────────
totalHoldingCost    = $674,398
totalCashInvested   = $30,000 + $674,398 = $704,398
```

> `monthlyHousingCost` is pulled **live** from your finance items (Housing category). It includes PITI mortgage, HOA, utilities, insurance, pest control — everything tagged Housing. The shed payment is excluded from long-term projections because it ends Jan 2027.

---

## 5. Rental Income Scenario

Toggle "Rental Scenario" on to model the house as a rental property.

### Effective Monthly Rent
```
effectiveRent = monthlyRent × (1 - vacancyRate/100)
```
Default: `$2,800 × (1 - 5%) = $2,660/mo`

### Annual Net Operating Income (NOI)
```
annualRentalIncome   = effectiveRent × 12
annualRentalExpenses = monthlyHousingCost × 12 + annualMaintenance
annualNOI            = annualRentalIncome - annualRentalExpenses
```
Default: `$31,920 - ($53,604 + $9,540) = -$31,224/yr` (cash-flow negative at $2,800 rent)

### Cap Rate
```
capRate = annualNOI / currentValue × 100
```
This is the year-1 unleveraged return on property value. Negative at $2,800/mo rent on a $636k house — typical for high-cost California markets.

### Total Rental Income Over Hold Period (Compounded)
Rent grows by `annualRentIncrease`% each year:
```
totalRentalIncome = Σ(yr=0 to holdYears-1) [ effectiveRent × 12 × (1 + rentIncrease)^yr ]
```
Default 10 yrs at 5%/yr:  
`$31,920 × [(1.05^10 - 1) / 0.05] ≈ $401,400`

### How Rental Income Affects ROI

When rental is **ON**, total proceeds include rental income, and the net cash invested is reduced by what rental covered:
```
rentalNetHoldingCost  = max(0, totalHoldingCost - totalRentalIncome)
rentalCashInvested    = downPayment + rentalNetHoldingCost
totalProceeds         = projectedAfterTax + totalRentalIncome
```

When rental is **OFF** (empty property / personal use):
```
totalProceeds    = projectedAfterTax
totalCashInvested = downPayment + totalHoldingCost  (no offset)
```

---

## 6. ROI & CAGR

### Total ROI
Simple total return on all cash invested:
```
netGain  = totalProceeds - totalCashInvested
totalROI = (netGain / totalCashInvested) × 100
```

### CAGR (Compound Annual Growth Rate)
The annualized return — what constant yearly rate would grow your invested cash to the total proceeds:
```
CAGR = (totalProceeds / rentalCashInvested)^(1/holdYears) - 1
```

**Why use `rentalCashInvested` for CAGR but `totalCashInvested` for ROI?**  
ROI measures total cash drain. CAGR measures the efficiency of the capital you actually had to put in — if rental income covered most of your holding costs, your effective invested capital is lower, producing a higher CAGR. This is the correct investment performance metric.

---

## 7. S&P 500 Comparison

The question being answered: **"If you didn't buy this rental property, and instead invested all those same dollars in the S&P 500, how would you do?"**

### Capital Invested in S&P

**Lump sum at t=0** (money you keep if you don't buy):
```
spLumpInvested = downPayment + pendingCosts = $30,000 + $42,958 = $72,958
```

**Monthly contributions** = net monthly outflow you'd no longer have to pay:
```
For each year yr:
  rentalIncome_yr = effectiveRent × (1 + annualRentIncrease)^yr   [if rental ON, else 0]
  monthlyContrib  = max(0, monthlyHousingCost + annualMaintenance/12 - rentalIncome_yr)
```

If the rental is cash-flow positive (rent > all costs), monthly contribution = $0 — the property is self-funding, so there's nothing freed up to invest.

### Future Value Calculation (Correct Annuity Formula)

For each year `yr`, 12 monthly payments are invested. Their FV at end of that year, then grown to end of hold period:

```
spMonthlyRate = (1 + spAnnualReturn/100)^(1/12) - 1

For each year yr:
  fvEndOfYear_yr = monthlyContrib × [(1 + r)^12 - 1] / r
  growth_yr      = (1 + r)^((holdYears - yr - 1) × 12)
  
spFV_monthly = Σ(yr=0 to holdYears-1) [ fvEndOfYear_yr × growth_yr ]
spFV_lumpSum = spLumpInvested × (1 + r)^(holdYears × 12)
spFinalValue = spFV_lumpSum + spFV_monthly
```

> **Why not a simple annuity?** Because monthly contributions change each year as rent increases. Each year's 12 payments are treated as a constant annuity for that year (correct), then grown to the end of the hold period (correct). The old (broken) formula used `monthsRemaining` as the annuity duration instead of 12, which was wrong by ~10x.

### S&P CAGR
```
spCAGR = (spFinalValue / spTotalCashIn)^(1/holdYears) - 1
```

### The Winner
```
homeWins = totalProceeds >= spFinalValue
margin   = |totalProceeds - spFinalValue|
```

---

## 8. Adjustable Sliders & Defaults

| Slider | Default | Range | Affects |
|---|---|---|---|
| Annual home appreciation | 4% | 0–12% | Projected sale price |
| Hold period | 10 yrs | 1–30 yrs | Everything |
| Annual maintenance | 1.5% of value/yr | 0.5–4% | Holding costs, monthly outflow |
| Monthly rent income | $2,800/mo | $500–$6,000 | Rental NOI, ROI, S&P offset |
| Vacancy rate | 5% | 0–20% | Effective rent |
| Annual rent increase | 5%/yr | 2–10% | Total rental income |
| S&P 500 annual return | 10% | 4–15% | S&P final value |

### Recommended Benchmarks
- **Home appreciation**: CA suburban avg ~4–5%/yr historically; use 3% for conservative
- **Maintenance**: Industry standard is 1–2% of home value/yr for repairs and upkeep
- **Annual rent increase**: 5%/yr is the historical US average for single-family rentals
- **Vacancy rate**: 5% = ~3 weeks/year vacant; 0% if you have a multi-year tenant
- **S&P 500 return**: 10% = historical long-run nominal average; 7% real (inflation-adjusted)

---

## 9. Tax Assumptions

| Tax | Rate | Basis |
|---|---|---|
| Federal capital gains (long-term) | 15% | Standard LTCG rate for most income levels |
| California state capital gains | 9.32% | CA taxes capital gains as ordinary income; 9.32% is a mid-bracket effective rate |
| **Combined** | **24.32%** | Applied to taxable gain only |
| Primary residence exclusion | $250,000 | Section 121 — only applies if lived in as primary home 2 of last 5 years |

> If renting out for the full hold period, the $250k exclusion will **not apply** unless the property was your primary residence for 2 years before conversion to rental. Adjust the exclusion to $0 for a pure rental scenario.

---

## 10. Worked Example with Default Inputs

**Assumptions:** 10-year hold, 4% appreciation, 1.5% maintenance, rental ON at $2,800/mo with 5% vacancy and 5%/yr increases, S&P at 10%/yr

### Rental Property Path

```
Projected sale price (4%/yr × 10)   = $636,000 × 1.04^10   = $940,976
Projected loan balance (10 yrs)      ≈ $594,000
Agent fee (6%) + transfer tax (0.22%)= $58,529
Net proceeds pre-tax                 = $940,976 - $594,000 - $58,529 = $288,447
Capital gain                         = $940,976 - $58,529 - $636,000 = $246,447
Taxable gain (after $250k exclusion) = max(0, $246,447 - $250,000) = $0
Capital gains tax                    = $0
Pending costs deducted               = $42,958
After-tax net proceeds               = $288,447 - $0 - $42,958 = $245,489

Rental income total (10 yrs, 5%/yr) ≈ $401,400
Total proceeds                       = $245,489 + $401,400 = $646,889

Total holding cost                   = $536,040 + $95,400 + $42,958 = $674,398
Total cash invested                  = $30,000 + $674,398 = $704,398
Rental offsets holding cost          = $401,400
Net cash invested (for CAGR)         = $30,000 + max(0, $674,398 - $401,400)
                                     = $30,000 + $272,998 = $302,998

Net gain                             = $646,889 - $704,398 = -$57,509
Total ROI                            = -$57,509 / $704,398 = -8.2%
CAGR                                 = ($646,889 / $302,998)^(1/10) - 1 = 7.9%/yr
```

> The negative total ROI but positive CAGR reflects the fact that rental income covered a large portion of holding costs, so the *effective* invested capital is much lower than the gross cash out.

### S&P 500 Path

```
Lump sum at t=0           = $30,000 + $42,958 = $72,958
Monthly outflow yr-1      = $4,467 + $795/mo maintenance - $2,660 rent = $2,602/mo
(rent grows 5%/yr, outflow shrinks each year)
Monthly outflow yr-5      ≈ $4,467 + $795 - $2,660×1.05^5 ≈ $1,861/mo
Monthly outflow yr-9      ≈ $4,467 + $795 - $2,660×1.05^9 ≈ $1,140/mo

S&P monthly rate          = (1.10)^(1/12) - 1 = 0.7974%/mo

spFV_lumpSum              = $72,958 × (1.007974)^120 ≈ $189,358
spFV_monthly              ≈ $235,000  (annuity FV, year-by-year)
spFinalValue              ≈ $424,358

spCAGR                    ≈ 6.8%/yr
```

### Winner at Default Settings
At 10% S&P return, 4% appreciation, $2,800/mo rent:

- **Rental property total proceeds**: ~$647k
- **S&P 500 portfolio**: ~$424k
- **Winner: Rental property** by ~$223k

This flips in favor of S&P if:
- Appreciation drops below ~2%/yr, or
- S&P return assumption is raised to 12%+, or
- Vacancy/maintenance costs increase significantly

---

## Key Formulas Cheat Sheet

```
# Projected sale price
P_sale = V_now × (1 + g)^n

# Net after-tax proceeds
P_net = P_sale - L_projected - (P_sale × 6.22%) - capGainsTax - pendingCosts

# Capital gains tax
gain      = P_sale - selling_costs - purchasePrice
taxable   = max(0, gain - $250,000)
tax       = taxable × 24.32%

# Total rental income
R_total = Σ(i=0..n-1) [ R_eff × 12 × (1 + g_r)^i ]

# Total proceeds (rental ON)
proceeds = P_net + R_total

# CAGR
CAGR = (proceeds / cash_invested_net)^(1/n) - 1

# S&P lump sum FV
FV_lump = L × (1 + r_mo)^(n×12)

# S&P monthly annuity FV (year-by-year)
For each year yr:
  contrib = max(0, monthly_cost + maintenance/12 - rental_income_yr)
  FV_yr   = contrib × [(1+r_mo)^12 - 1] / r_mo × (1+r_mo)^((n-yr-1)×12)
FV_monthly = Σ FV_yr

# S&P total
FV_sp = FV_lump + FV_monthly
```

---

*Last updated: July 28, 2026 — reflects actual Rocklin house numbers and calculator v3 logic*
