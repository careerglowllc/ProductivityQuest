// Real taxable-brokerage capital gains math, replacing the old flat 15% (× 0.85)
// haircut applied to the ENTIRE position value (which wrongly taxed already-after-tax
// cost basis, not just the gain).
//
// Cost basis pulled from Vanguard's own "Cost basis – Unrealized gains/losses" report
// for Brokerage Account 66890362 as of 2026-09-18, 4:15 PM ET:
//   VTSAX  58.7920 sh, avg cost $77.61/sh, total cost $4,562.56  — 98.9% of gain is long-term
//   VOO   241.3667 sh, FIFO,                total cost $92,493.63 — 99.7% of gain is long-term
//   VXUS   60.0572 sh, FIFO, $83.72/sh,      total cost $5,027.99 — 100% short-term (bought 2026-07-20)
//
// Only the gain (current value − cost basis) is taxed on sale; the cost basis itself
// is already-after-tax principal and comes back with zero haircut. Long-term gains
// (position held > 1 year) are taxed at the federal LTCG rate; short-term gains are
// taxed as ordinary income. Both assume $0 state tax (Texas residency by sale time).
export const VTSAX_BROKERAGE_COST_BASIS = 4562.56;
export const VOO_COST_BASIS = 92493.63;
export const VXUS_COST_BASIS = 5027.99;
const VXUS_PURCHASE_DATE = "2026-07-20";

const LTCG_RATE = 0.15;
const ORDINARY_RATE = 0.24;
const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function afterTaxValue(currentValue: number, costBasis: number, rate: number): number {
  if (currentValue <= costBasis) return currentValue; // loss position — nothing to tax
  const gain = currentValue - costBasis;
  return costBasis + gain * (1 - rate);
}

/** True after-capital-gains-tax value of the taxable brokerage VOO/VTSAX/VXUS + settlement cash. */
export function brokerageAfterTax(
  vooValue: number,
  vtsaxValue: number,
  vxusValue: number,
  settlementCash: number,
  now: Date = new Date(),
): number {
  // VOO and brokerage VTSAX are both >99% long-term already — treat entirely as LTCG.
  const vooAfterTax = afterTaxValue(vooValue, VOO_COST_BASIS, LTCG_RATE);
  const vtsaxAfterTax = afterTaxValue(vtsaxValue, VTSAX_BROKERAGE_COST_BASIS, LTCG_RATE);
  const vxusHeldOverOneYear = now.getTime() - new Date(VXUS_PURCHASE_DATE).getTime() >= ONE_YEAR_MS;
  const vxusAfterTax = afterTaxValue(vxusValue, VXUS_COST_BASIS, vxusHeldOverOneYear ? LTCG_RATE : ORDINARY_RATE);
  return vooAfterTax + vtsaxAfterTax + vxusAfterTax + settlementCash;
}
