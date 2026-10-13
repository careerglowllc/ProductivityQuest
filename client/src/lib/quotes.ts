import { rowsToCSV, type CSVExport } from "@/lib/csv-export";

// "journal-" prefix so these ride the existing localStorage → server sync (see synced-storage.ts).
export const QUOTES_KEY = "journal-quotes-v1";
export const QUOTE_HISTORY_KEY = "journal-quote-of-day-v1";
export const NO_REPEAT_DAYS = 7;
const KEEP_HISTORY_DAYS = 30;

export type Quote = { id: string; text: string; author: string; source?: string; createdAt: string };
export type QuoteHistory = Record<string, string>; // YYYY-MM-DD → quote id shown that day

const seed = (n: number, author: string, source: string, text: string): Quote => ({ id: `seed-stoic-${n}`, text, author, source, createdAt: "2026-10-13T00:00:00.000Z" });

// Wording follows common English translations and varies between editions.
export const SEED_QUOTES: Quote[] = [
  seed(1, "Marcus Aurelius", "Meditations 5.16", "Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts."),
  seed(2, "Marcus Aurelius", "Meditations 6.6", "The best way of avenging thyself is not to become like the wrong doer."),
  seed(3, "Marcus Aurelius", "Meditations 12.17", "If it is not right, do not do it; if it is not true, do not say it."),
  seed(4, "Seneca", "Letters from a Stoic 13", "We suffer more often in imagination than in reality."),
  seed(5, "Seneca", "On the Shortness of Life 1", "It is not that we have a short time to live, but that we waste a lot of it."),
  seed(6, "Seneca", "Letters from a Stoic 77", "As is a tale, so is life: not how long it is, but how good it is, is what matters."),
  seed(7, "Epictetus", "Enchiridion 5", "Men are disturbed, not by things, but by the principles and notions which they form concerning things."),
  seed(8, "Epictetus", "Discourses 3.23", "First say to yourself what you would be; and then do what you have to do."),
  seed(9, "Epictetus", "Discourses 2.17", "It is impossible for a man to learn what he thinks he already knows."),
  seed(10, "Musonius Rufus", "Lectures, as quoted by Aulus Gellius", "If you accomplish something good with hard work, the labor passes quickly, but the good endures; if you do something shameful in pursuit of pleasure, the pleasure passes quickly, but the shame endures."),
];

type Reader = Pick<Storage, "getItem">;
const defaultStorage = (): Reader | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

// The saved list, or the starter Stoic quotes until the list has been saved once (an emptied list stays empty).
export function loadQuotes(storage: Reader | null = defaultStorage()): Quote[] {
  try {
    const raw = storage?.getItem(QUOTES_KEY);
    if (raw == null) return SEED_QUOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((q) => q && typeof q.id === "string" && typeof q.text === "string" && q.text.trim()) : SEED_QUOTES;
  } catch { return SEED_QUOTES; }
}

export function loadQuoteHistory(storage: Reader | null = defaultStorage()): QuoteHistory {
  try {
    const parsed = JSON.parse(storage?.getItem(QUOTE_HISTORY_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// A stable pseudo-random number in [0, 1) for a day, so the same day always picks the same quote.
export function dayRandom(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) { h ^= day.charCodeAt(i); h = Math.imul(h, 16777619); }
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// One quote per day, random but never one shown in the previous 7 days. If the list is too short for that
// (7 or fewer quotes), it avoids yesterday's quote at least. The pick is remembered so reloads show the same quote.
export function pickQuoteOfTheDay(quotes: Quote[], day: string, history: QuoteHistory): { quote: Quote | null; history: QuoteHistory } {
  if (quotes.length === 0) return { quote: null, history };
  const known = quotes.find((q) => q.id === history[day]);
  if (known) return { quote: known, history };

  const recent = new Set(Array.from({ length: NO_REPEAT_DAYS }, (_, i) => history[shiftDay(day, -(i + 1))]).filter(Boolean));
  let pool = quotes.filter((q) => !recent.has(q.id));
  if (pool.length === 0) pool = quotes.filter((q) => q.id !== history[shiftDay(day, -1)]);
  if (pool.length === 0) pool = quotes;

  const quote = pool[Math.floor(dayRandom(day) * pool.length)];
  const cutoff = shiftDay(day, -KEEP_HISTORY_DAYS);
  const kept = Object.fromEntries(Object.entries(history).filter(([d]) => d >= cutoff && d !== day));
  return { quote, history: { ...kept, [day]: quote.id } };
}

export function buildQuotesCSVExport(storage: Reader | null = defaultStorage()): CSVExport {
  const rows = loadQuotes(storage).map((q) => [q.text, q.author, q.source || "", q.createdAt ? q.createdAt.slice(0, 10) : ""]);
  return { folder: "Journal", filename: "inspirational-quotes.csv", content: rowsToCSV(["Quote", "Author", "Source", "Date Added"], rows) };
}
