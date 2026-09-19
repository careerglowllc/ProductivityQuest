// Real Roth IRA early-withdrawal math, replacing the old flat 25% haircut.
//
// Basis breakdown from the account's full Vanguard transaction history:
//  - $12,000 in two regular annual contributions (2019-10-15, 2020-09-18) — these
//    are always withdrawable tax-free AND penalty-free, at any age, any time.
//  - Three backdoor-Roth conversions — tax-free on withdrawal (already taxed at
//    conversion time), but each has its OWN 5-year clock: withdrawing that specific
//    conversion's principal before its 5-year mark incurs the 10% early-withdrawal
//    penalty unless the owner is 59.5+.
// Earnings (current value beyond basis) are taxed as ordinary income (not LTCG) and
// hit with the 10% penalty when withdrawn before 59.5 in a non-qualified distribution.
const ROTH_REGULAR_CONTRIBUTIONS = 12000; // 2019 $6,000 + 2020 $6,000

const ROTH_CONVERSIONS: Array<{ date: string; amount: number }> = [
  { date: "2024-01-10", amount: 6501.88 },
  { date: "2025-01-31", amount: 7000.82 },
  { date: "2026-01-21", amount: 7500.75 },
];

const ROTH_TOTAL_CONVERSIONS = ROTH_CONVERSIONS.reduce((sum, c) => sum + c.amount, 0);
export const ROTH_TOTAL_BASIS = ROTH_REGULAR_CONTRIBUTIONS + ROTH_TOTAL_CONVERSIONS;

const EARLY_WITHDRAWAL_PENALTY_RATE = 0.10;
// Ordinary federal income rate applied to the earnings portion; assumes $0 state tax
// (Texas residency by the time of withdrawal — no CA state income tax).
const ROTH_EARNINGS_TAX_RATE = 0.24;
const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

/** True after-tax/after-penalty value if the whole Roth IRA were liquidated today (age < 59.5). */
export function rothIraTrueAfterPenalty(currentValue: number, now: Date = new Date()): number {
  const conversionPenaltyFree = ROTH_CONVERSIONS
    .filter(c => now.getTime() - new Date(c.date).getTime() >= FIVE_YEARS_MS)
    .reduce((sum, c) => sum + c.amount, 0);
  const conversionPenalized = ROTH_TOTAL_CONVERSIONS - conversionPenaltyFree;
  const earnings = Math.max(0, currentValue - ROTH_TOTAL_BASIS);
  return (
    ROTH_REGULAR_CONTRIBUTIONS +
    conversionPenaltyFree +
    conversionPenalized * (1 - EARLY_WITHDRAWAL_PENALTY_RATE) +
    earnings * (1 - ROTH_EARNINGS_TAX_RATE - EARLY_WITHDRAWAL_PENALTY_RATE)
  );
}

/** Blended (after / before) multiplier — used to split the IBIT/VTSAX sub-holdings proportionally. */
export function rothIraEffectiveMultiplier(currentValue: number, now: Date = new Date()): number {
  if (currentValue <= 0) return 1;
  return rothIraTrueAfterPenalty(currentValue, now) / currentValue;
}
