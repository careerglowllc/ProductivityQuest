import { rowsToCSV, type CSVExport } from "@/lib/csv-export";
import type { QuestAttachment } from "@/lib/attachments";

// "journal-" prefix keys ride the existing localStorage → server sync (see synced-storage.ts).
export const EXCITEMENT_KEY = "journal-excitement-v1";
export const THOUGHTS_KEY = "journal-empowering-thoughts-v1";
export const GLEW_KEY = "journal-daily-gews-v1";

export type ExcitementEntry = { id: string; text: string; createdAt: string; emoji?: string; attachments?: QuestAttachment[] };
export type Thought = { id: string; title: string; description: string; createdAt: string; updatedAt: string; attachments?: QuestAttachment[] };
// An "Excited" line from a Daily GLEW day; read-only here, edited on the Daily GLEW page.
export type GlewExcited = { date: string; index: number; text: string; attachments?: QuestAttachment[] };

export type SparkKind = "excitement" | "thought" | "glew";
export type SparkFilter = "all" | SparkKind;
export type Spark = {
  key: string; kind: SparkKind; id: string; title?: string; text: string; time: number; date: string;
  emoji?: string; attachments?: QuestAttachment[]; glewDate?: string;
};

type Reader = Pick<Storage, "getItem">;
const defaultStorage = (): Reader | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

function readList(key: string, storage: Reader | null): any[] {
  try {
    const parsed = JSON.parse(storage?.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export const loadExcitements = (storage = defaultStorage()): ExcitementEntry[] => readList(EXCITEMENT_KEY, storage);
export const loadThoughts = (storage = defaultStorage()): Thought[] => readList(THOUGHTS_KEY, storage);

// Older Daily GLEW lines were plain strings; newer ones are { text, attachments }.
export function loadGlewExciteds(storage = defaultStorage()): GlewExcited[] {
  return readList(GLEW_KEY, storage).flatMap((day) =>
    (Array.isArray(day?.exciteds) ? day.exciteds : []).flatMap((line: string | { text?: string; attachments?: QuestAttachment[] }, index: number) => {
      const text = (typeof line === "string" ? line : line?.text ?? "").trim();
      return text && typeof day.date === "string" ? [{ date: day.date, index, text, attachments: typeof line === "string" ? undefined : line.attachments }] : [];
    }));
}

const stamp = (iso?: string) => { const time = iso ? new Date(iso).getTime() : NaN; return Number.isNaN(time) ? 0 : time; };
const glewTime = (date: string) => { const [y, m, d] = date.split("-").map(Number); const time = new Date(y, (m || 1) - 1, d || 1, 12).getTime(); return Number.isNaN(time) ? 0 : time; };

// Everything that lights you up or holds you steady, newest first.
export function buildSparks(source: { excitements: ExcitementEntry[]; thoughts: Thought[]; glew: GlewExcited[] }): Spark[] {
  const sparks: Spark[] = [
    ...source.excitements.map((e): Spark => ({ key: `excitement:${e.id}`, kind: "excitement", id: e.id, text: e.text, time: stamp(e.createdAt), date: e.createdAt, emoji: e.emoji, attachments: e.attachments })),
    ...source.thoughts.map((t): Spark => ({ key: `thought:${t.id}`, kind: "thought", id: t.id, title: t.title, text: t.description, time: stamp(t.updatedAt || t.createdAt), date: t.updatedAt || t.createdAt, attachments: t.attachments })),
    ...source.glew.map((g): Spark => ({ key: `glew:${g.date}:${g.index}`, kind: "glew", id: `${g.date}:${g.index}`, text: g.text, time: glewTime(g.date), date: g.date, attachments: g.attachments, glewDate: g.date })),
  ];
  return sparks.sort((a, b) => b.time - a.time || a.key.localeCompare(b.key));
}

export function filterSparks(sparks: Spark[], filter: SparkFilter, search: string): Spark[] {
  const query = search.trim().toLowerCase();
  return sparks.filter((s) => (filter === "all" || s.kind === filter) && (!query || `${s.title ?? ""} ${s.text}`.toLowerCase().includes(query)));
}

export const countSparks = (sparks: Spark[]): Record<SparkFilter, number> => ({
  all: sparks.length,
  excitement: sparks.filter((s) => s.kind === "excitement").length,
  thought: sparks.filter((s) => s.kind === "thought").length,
  glew: sparks.filter((s) => s.kind === "glew").length,
});

export const SPARK_KIND_LABEL: Record<SparkKind, string> = { excitement: "Excitement", thought: "Empowering thought", glew: "From Daily GLEW" };

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Pure builders (no side effects) so the Journal hub's/Settings' "Export All" master export can reuse them.
export function buildExcitementCSVExport(): CSVExport {
  const rows = loadExcitements().map((e) => [e.emoji || "", e.text, fmtDate(e.createdAt)]);
  return { folder: "Journal", filename: "excitement-journal.csv", content: rowsToCSV(["Emoji", "Entry", "Date Added"], rows) };
}

export function buildEmpoweringThoughtsCSVExport(): CSVExport {
  const rows = loadThoughts().map((t) => [t.title, t.description, fmtDate(t.createdAt), fmtDate(t.updatedAt)]);
  return { folder: "Journal", filename: "empowering-thoughts.csv", content: rowsToCSV(["Title", "Description", "Date Added", "Last Modified"], rows) };
}

// Used by the Sparks page's own Export CSV button; the master export keeps the two files above.
export function buildSparksCSVExport(sparks: Spark[]): CSVExport {
  const rows = sparks.map((s) => [SPARK_KIND_LABEL[s.kind], s.emoji || "", s.title || "", s.text, s.kind === "glew" ? fmtDate(`${s.date}T12:00:00`) : fmtDate(s.date)]);
  return { folder: "Journal", filename: "sparks.csv", content: rowsToCSV(["Type", "Emoji", "Title", "Text", "Date"], rows) };
}
