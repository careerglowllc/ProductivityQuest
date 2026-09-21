// Real FIFO cost-basis capital gains math for BTC, replacing the old flat 15%
// (× 0.85) haircut applied to the ENTIRE position value on both the Coinbase
// and Ledger (cold-storage hardware wallet) cards.
//
// Lot data below was derived by simulating the FULL Coinbase transaction
// history (every Buy/Sell/Send/Receive, Jan 2021 – Jul 2026) and the full
// Ledger Live wallet-operations export in FIFO order (IRS default method for
// crypto without specific-lot identification):
//   - Coinbase "Sent BTC" that matches a Ledger "IN" (same BTC amount/date) is
//     a wallet-to-wallet transfer, not a disposal — the FIFO-consumed lot's
//     original acquisition date + cost basis carries over into the Ledger
//     wallet (transfers don't reset the holding period or basis).
//   - The 2022-10-29 Ledger deposit (0.03825 BTC) has no matching Coinbase
//     send, so it's treated as an external deposit with basis = FMV at
//     receipt (IRS Pub. 551 — property received with no known cost carries
//     over its value at receipt as basis).
//   - Small unmatched Coinbase "Sent BTC" entries from 2021 (no corresponding
//     Ledger arrival) left tracked custody entirely — they reduce Coinbase's
//     remaining FIFO pool but aren't counted in either card's current basis.
// See /memories/repo/coinbase-btc-transaction-log.md and
// /memories/repo/ledger-wallet-btc-transaction-log.csv for the raw source data.
//
// Only the gain (current value − cost basis) is taxed on sale/withdrawal; the
// cost basis itself is already-after-tax principal and comes back with zero
// haircut. Lots held > 1 year are taxed at the federal LTCG rate; lots held
// ≤ 1 year are taxed as ordinary income. Both assume $0 state tax (Texas
// residency by the time of sale/withdrawal).

interface BtcLot {
  date: string;
  btc: number;
  costBasis: number;
}

// FIFO-remaining Coinbase lots as of 2026-09-20 (all short-term as of that date).
const COINBASE_LOTS: BtcLot[] = [
  { date: "2026-02-09", btc: 0.002644, costBasis: 191.13 },
  { date: "2026-03-10", btc: 0.0416, costBasis: 3000 },
  { date: "2026-05-21", btc: 0.025, costBasis: 2000 },
  { date: "2026-06-02", btc: 0.0724, costBasis: 5000 },
  { date: "2026-06-10", btc: 0.0785, costBasis: 5000 },
  { date: "2026-06-23", btc: 0.109, costBasis: 7000 },
  { date: "2026-07-08", btc: 0.0938, costBasis: 6000 },
];

// FIFO-remaining Ledger (cold-storage hardware wallet) lots as of 2026-09-20.
const LEDGER_LOTS: BtcLot[] = [
  { date: "2022-04-18", btc: 0.0028074, costBasis: 115.77 },
  { date: "2022-04-29", btc: 0.0216, costBasis: 850 },
  { date: "2022-05-01", btc: 0.0216, costBasis: 850 },
  { date: "2022-05-05", btc: 0.0229, costBasis: 850 },
  { date: "2022-05-09", btc: 0.1889, costBasis: 5850 },
  { date: "2022-05-21", btc: 0.0285, costBasis: 850 },
  { date: "2022-05-30", btc: 0.0263, costBasis: 850 },
  { date: "2022-06-11", btc: 0.0292, costBasis: 850 },
  { date: "2022-06-13", btc: 0.0351, costBasis: 850 },
  { date: "2022-06-16", btc: 0.0404, costBasis: 850 },
  { date: "2022-06-20", btc: 0.0405, costBasis: 850 },
  { date: "2022-06-28", btc: 0.0412, costBasis: 850 },
  { date: "2022-10-29", btc: 0.03825, costBasis: 795.68 }, // external deposit, no Coinbase match
  { date: "2024-01-01", btc: 0.0861, costBasis: 4000 },
  { date: "2024-03-03", btc: 0.0311, costBasis: 2000 },
  { date: "2024-11-20", btc: 0.0208, costBasis: 2000 },
  { date: "2025-08-22", btc: 0.0249, costBasis: 3000 },
  { date: "2025-11-04", btc: 0.0676, costBasis: 7000 },
  { date: "2025-11-17", btc: 0.0319, costBasis: 3000 },
  { date: "2025-11-20", btc: 0.0225, costBasis: 2000 },
  { date: "2025-12-01", btc: 0.0457, costBasis: 4000 },
  { date: "2026-02-01", btc: 0.0626, costBasis: 5000 },
  { date: "2026-02-09", btc: 0.038856, costBasis: 2808.87 },
];

const LTCG_RATE = 0.15;
const ORDINARY_RATE = 0.24; // short-term gains taxed as ordinary income
const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export interface BtcTaxBreakdown {
  grossValue: number;
  costBasis: number;
  afterTaxValue: number;
  estimatedTax: number;
}

function computeBreakdown(lots: BtcLot[], currentHoldings: number, currentPrice: number, now: Date): BtcTaxBreakdown {
  const grossValue = currentHoldings * currentPrice;
  const totalLotBtc = lots.reduce((s, l) => s + l.btc, 0);
  if (totalLotBtc <= 0 || currentHoldings <= 0 || currentPrice <= 0) {
    return { grossValue, costBasis: 0, afterTaxValue: grossValue, estimatedTax: 0 };
  }
  // Scale the tracked lots to match today's actual holdings (handles small drift
  // from dust/rounding/manual entry vs. the simulated FIFO totals).
  const scale = currentHoldings / totalLotBtc;
  let afterTaxValue = 0;
  let costBasisTotal = 0;
  const nowMs = now.getTime();
  for (const lot of lots) {
    const btc = lot.btc * scale;
    const cost = lot.costBasis * scale;
    costBasisTotal += cost;
    const value = btc * currentPrice;
    if (value <= cost) { afterTaxValue += value; continue; } // loss lot — nothing to tax
    const heldOverOneYear = nowMs - new Date(lot.date).getTime() >= ONE_YEAR_MS;
    const rate = heldOverOneYear ? LTCG_RATE : ORDINARY_RATE;
    const gain = value - cost;
    afterTaxValue += cost + gain * (1 - rate);
  }
  return { grossValue, costBasis: costBasisTotal, afterTaxValue, estimatedTax: grossValue - afterTaxValue };
}

/** Real after-capital-gains-tax breakdown for the Coinbase BTC holdings. */
export function coinbaseBtcTax(currentHoldings: number, currentPrice: number, now: Date = new Date()): BtcTaxBreakdown {
  return computeBreakdown(COINBASE_LOTS, currentHoldings, currentPrice, now);
}

/** Real after-capital-gains-tax breakdown for the Ledger cold-storage BTC holdings. */
export function ledgerBtcTax(currentHoldings: number, currentPrice: number, now: Date = new Date()): BtcTaxBreakdown {
  return computeBreakdown(LEDGER_LOTS, currentHoldings, currentPrice, now);
}
