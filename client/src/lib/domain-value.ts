// The veluna.com domain's value is kept once, in the net worth settings. Everything that shows it (net worth, accounts) uses these.
const LTCG_RATE = 0.15;

export const domainAfterTax = (value: number, purchasePrice: number): number =>
  value - Math.max(0, value - purchasePrice) * LTCG_RATE;

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// The account line for the domain, with the same figures the net worth column shows.
export const domainAccountDetail = (value: number, purchasePrice: number): string =>
  `Domain registrar · veluna.com · est. net worth ${dollars(domainAfterTax(value, purchasePrice))} after tax · est. sale price ${dollars(value)}`;
