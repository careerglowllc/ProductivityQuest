// The Rocklin house's one-time costs: what the Lifetime Cost of Ownership card lists, and, for the repairs and projects,
// what is taken off the sale in the Real Estate tab. One list feeds both, so a price changed here changes both.

export interface HomeOneTimeCost {
  label: string;
  amount: number; // dollars, including any processing fees
  tentative?: boolean; // an estimate: listed and projected, but not yet counted as spent
  pending?: boolean; // a repair or project: also taken off the sale (not the down payment or the small solar service visits)
}

// Repairs and renovations come from the contractor invoice summary (price plus processing fees). The old floors, cabinets,
// floor-molding, and Oak and Stone rows were replaced by it: the molding / cabinet demo / plumber visit row is now its
// three lines (mold, kitchen demo, shutoff valve), and Oak and Stone invoice #1033 ($1,250) is the drainage line.
export const HOME_ONE_TIME_COSTS: readonly HomeOneTimeCost[] = [
  { label: "Down payment + closing costs", amount: 30000 },
  { label: "New shed (Affirm financed)", amount: 6158.28, pending: true },
  { label: "Small roof fix", amount: 500, pending: true },
  { label: "Solar inspection (6/26/26)", amount: 299 },
  { label: "Solar panel cleaning (7/14/26)", amount: 309 },
  { label: "Flooring replacement", amount: 17610.56, pending: true },
  { label: "Mold remediation", amount: 6500, pending: true },
  { label: "Kitchen demolition / remediation", amount: 3000, pending: true },
  { label: "Plumbing shutoff valve", amount: 335, pending: true },
  { label: "New kitchen cabinets + quartz countertops", amount: 19525, pending: true },
  { label: "Plumbing / leak detection inspection", amount: 675.94, pending: true },
  { label: "Landscaping maintenance / cleanup", amount: 625, pending: true },
  { label: "Garage door repair", amount: 160, pending: true },
  { label: "HVAC kitchen range hood vent install", amount: 1300, pending: true },
  { label: "Drainage investigation + landscape refresh", amount: 1250, pending: true },
  { label: "French drain installation", amount: 5900, pending: true },
];

const toCents = (dollars: number) => Math.round(dollars * 100);
const sumDollars = (items: readonly { amount: number }[]) => items.reduce((total, item) => total + toCents(item.amount), 0) / 100;

export const totalOneTimeCosts = (items: readonly HomeOneTimeCost[] = HOME_ONE_TIME_COSTS): number => sumDollars(items);
export const paidOneTimeCosts = (items: readonly HomeOneTimeCost[] = HOME_ONE_TIME_COSTS): number => sumDollars(items.filter((item) => !item.tentative));
export const pendingHomeCosts = (items: readonly HomeOneTimeCost[] = HOME_ONE_TIME_COSTS): number => sumDollars(items.filter((item) => item.pending));
