import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HeartHandshake, Plus, Pencil, Trash2, X, Check, Heart, Waves, Sparkle,
  Undo2, Redo2, Download, Search, Paperclip, ArrowRightLeft,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { useSwipeDownToClose } from "@/hooks/use-swipe-down-to-close";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-daily-gews-v1";

type GewsCategory = "gratitudes" | "wins" | "exciteds" | "sadnesses";

type GewsLine = { text: string; attachments?: QuestAttachment[] };

type GewsEntry = {
  date: string; // YYYY-MM-DD
  gratitudes: GewsLine[];
  wins: GewsLine[];
  exciteds: GewsLine[];
  sadnesses: GewsLine[];
  updatedAt: string;
};

// Colors/icons match the Life OS reference: blue for Sadnesses, ochre for Gratitudes,
// sage for Wins, terracotta for Exciteds. Category meaning is always also a label, never color-only.
const CATEGORY_META: Record<GewsCategory, { label: string; icon: typeof Heart; color: string; prompt: string; placeholder: string }> = {
  sadnesses: { label: "Sadnesses", icon: Waves, color: "#768fc0", prompt: "What is weighing on you today?", placeholder: "Something that's weighing on you…" },
  gratitudes: { label: "Gratitudes", icon: Heart, color: "#c28b43", prompt: "What are you grateful for today?", placeholder: "Something you're grateful for…" },
  wins: { label: "Wins", icon: Check, color: "#5d9279", prompt: "What went well today?", placeholder: "Something that went well…" },
  exciteds: { label: "Exciteds", icon: Sparkle, color: "#b77463", prompt: "What are you looking forward to?", placeholder: "Something you're excited about…" },
};
const CATEGORY_ORDER: GewsCategory[] = ["sadnesses", "gratitudes", "wins", "exciteds"];

function todayStr(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function emptyEntry(date: string): GewsEntry {
  return { date, gratitudes: [], wins: [], exciteds: [], sadnesses: [], updatedAt: "" };
}

function fmtDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function loadEntries(): GewsEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as any[]).map(normalizeEntry);
  } catch { /* ignore */ }
  return [];
}

// Migrates older entries (lines stored as plain strings) into the { text, attachments } shape.
function normalizeLine(item: string | GewsLine): GewsLine {
  return typeof item === "string" ? { text: item } : item;
}

function normalizeEntry(e: any): GewsEntry {
  return {
    date: e.date,
    gratitudes: (e.gratitudes || []).map(normalizeLine),
    wins: (e.wins || []).map(normalizeLine),
    exciteds: (e.exciteds || []).map(normalizeLine),
    sadnesses: (e.sadnesses || []).map(normalizeLine),
    updatedAt: e.updatedAt || "",
  };
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
// One row per logged line (across all days), since a day can have several lines per category.
export function buildDailyGewsCSVExport(): CSVExport {
  const entries = loadEntries();
  const headers = ["Date", "Category", "Entry", "Attachments"];
  const rows: string[][] = [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    for (const cat of CATEGORY_ORDER) {
      for (const line of e[cat]) {
        rows.push([
          fmtDateFull(e.date),
          CATEGORY_META[cat].label,
          line.text,
          line.attachments && line.attachments.length > 0 ? `${line.attachments.length} file(s)` : "",
        ]);
      }
    }
  }
  return { folder: "Journal", filename: "daily-gews.csv", content: rowsToCSV(headers, rows) };
}

// Category picker: a colored icon trigger that opens a small labeled list — used both as the
// composer's category selector (bordered box) and as a per-reflection "recategorize" action
// (bare icon-button, matching the neighboring edit/delete buttons).
function GewsCategoryPicker({
  value, onChange, size = "md", bare = false, title,
}: { value: GewsCategory; onChange: (cat: GewsCategory) => void; size?: "sm" | "md"; bare?: boolean; title?: string }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[value];
  const Icon = meta.icon;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {bare ? (
          <button
            type="button"
            title={title || "Recategorize reflection"}
            aria-label={title || `Recategorize reflection (currently ${meta.label})`}
            className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
          >
            <ArrowRightLeft aria-hidden className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            title={`Category: ${meta.label}`}
            aria-label={`Category: ${meta.label}. Click to change.`}
            className={`dash-focus flex shrink-0 items-center justify-center rounded-lg border border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] transition-colors hover:border-current ${size === "sm" ? "h-7 w-7" : "h-11 w-11"}`}
            style={{ color: meta.color }}
          >
            <Icon aria-hidden className={size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[210px] border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-1.5">
        <div className="grid gap-0.5" role="listbox" aria-label="Reflection category">
          {CATEGORY_ORDER.map((cat) => {
            const m = CATEGORY_META[cat];
            const CatIcon = m.icon;
            const active = cat === value;
            return (
              <button
                key={cat}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(cat); setOpen(false); }}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active ? "bg-[var(--jrnl-paper-2)] font-semibold text-[var(--jrnl-ink)]" : "text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-paper-2)] hover:text-[var(--jrnl-ink)]"
                }`}
              >
                <CatIcon aria-hidden className="h-4 w-4 shrink-0" style={{ color: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function JournalDailyGewsPage() {
  const isMobile = useIsMobile();
  const { toast, dismiss } = useToast();
  const [entries, setEntries] = useState<GewsEntry[]>(loadEntries);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [form, setForm] = useState<GewsEntry>(emptyEntry(todayStr()));
  const [drafts, setDrafts] = useState<Record<GewsCategory, string>>({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
  const [draftAttachments, setDraftAttachments] = useState<Record<GewsCategory, QuestAttachment[]>>({ gratitudes: [], wins: [], exciteds: [], sadnesses: [] });
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<{ cat: GewsCategory; idx: number } | null>(null);
  const [editingLineText, setEditingLineText] = useState("");
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);
  const { swipeCallbackRef, style: swipeStyle } = useSwipeDownToClose(dialogOpen, setDialogOpen, isMobile);

  // Composer — the primary capture path: one category, one reflection at a time, appended to today.
  const [composerCategory, setComposerCategory] = useState<GewsCategory>("wins");
  const [composerDraft, setComposerDraft] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<QuestAttachment[]>([]);
  const [search, setSearch] = useState("");

  // Inline per-reflection edit in the main history list (separate from the complete-day dialog's editor).
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Pick up entries added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setEntries(loadEntries())), []);

  function persist(next: GewsEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast,
  // and re-applied via the Redo button if that undo is triggered.
  function persistWithUndo(next: GewsEntry[], label: string) {
    const previous = entries;
    persist(next);
    setLastRedo(null); // a fresh change invalidates any pending redo
    const undo = () => {
      persist(previous);
      setLastUndo(null);
      const redo = () => {
        persist(next);
        setLastRedo(null);
        setLastUndo({ label, undo });
        toast({ title: "Change redone", duration: 2000 });
      };
      setLastRedo({ label, redo });
      toast({ title: "Change undone", duration: 2000 });
    };
    setLastUndo({ label, undo });
    return undo;
  }

  const sortedDesc = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  // Day-level search — matches the reference: a query matches if it appears anywhere in the
  // day's JSON (any category's text), and the whole day (all its lines) still shows.
  const filteredDays = useMemo(() => {
    if (!search.trim()) return sortedDesc;
    const q = search.toLowerCase();
    return sortedDesc.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
  }, [sortedDesc, search]);
  const totalLines = useMemo(
    () => entries.reduce((n, e) => n + CATEGORY_ORDER.reduce((m, c) => m + e[c].length, 0), 0),
    [entries],
  );

  function openAdd() {
    // If today already has an entry, open it for editing instead of a blank form —
    // otherwise saving would silently wipe out whatever was already logged today.
    const today = todayStr();
    const existing = entries.find((e) => e.date === today);
    if (existing) {
      openEdit(existing);
      return;
    }
    setForm(emptyEntry(today));
    setDrafts({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
    setDraftAttachments({ gratitudes: [], wins: [], exciteds: [], sadnesses: [] });
    setOriginalDate(null);
    setEditingLine(null);
    setDialogOpen(true);
  }

  function openEdit(e: GewsEntry) {
    setForm({ ...e });
    setDrafts({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
    setDraftAttachments({ gratitudes: [], wins: [], exciteds: [], sadnesses: [] });
    setOriginalDate(e.date);
    setEditingLine(null);
    setDialogOpen(true);
  }

  function addItem(cat: GewsCategory) {
    const val = drafts[cat].trim();
    if (!val) return;
    setForm({ ...form, [cat]: [...form[cat], { text: val, attachments: draftAttachments[cat] }] });
    setDrafts({ ...drafts, [cat]: "" });
    setDraftAttachments({ ...draftAttachments, [cat]: [] });
  }

  function removeItem(cat: GewsCategory, idx: number) {
    setForm({ ...form, [cat]: form[cat].filter((_, i) => i !== idx) });
  }

  function startLineEdit(cat: GewsCategory, idx: number) {
    setEditingLine({ cat, idx });
    setEditingLineText(form[cat][idx].text);
  }

  function cancelLineEdit() {
    setEditingLine(null);
    setEditingLineText("");
  }

  function saveLineEdit() {
    if (!editingLine) return;
    const text = editingLineText.trim();
    if (!text) { cancelLineEdit(); return; }
    const { cat, idx } = editingLine;
    setForm({ ...form, [cat]: form[cat].map((line, i) => (i === idx ? { ...line, text } : line)) });
    cancelLineEdit();
  }

  function save() {
    if (!form.date) return;
    const now = new Date().toISOString();
    // Auto-commit any typed-but-not-yet-added drafts so closing right after typing
    // never silently discards them.
    const finalForm: GewsEntry = { ...form };
    for (const cat of CATEGORY_ORDER) {
      const val = drafts[cat].trim();
      if (val) finalForm[cat] = [...finalForm[cat], { text: val, attachments: draftAttachments[cat] }];
    }
    const withoutOld = originalDate ? entries.filter((e) => e.date !== originalDate) : entries;
    const withoutSameDate = withoutOld.filter((e) => e.date !== finalForm.date);
    const undo = persistWithUndo([{ ...finalForm, updatedAt: now }, ...withoutSameDate], `${originalDate ? "Edited" : "Added"} entry for ${fmtDateFull(finalForm.date)}`);
    setDialogOpen(false);
    setOriginalDate(null);
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function remove(date: string) {
    const undo = persistWithUndo(entries.filter((e) => e.date !== date), `Deleted entry for ${fmtDateFull(date)}`);
    setConfirmDeleteDate(null);
    toast({
      title: "Entry deleted",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function handleExport() {
    const { filename, content } = buildDailyGewsCSVExport();
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  // Primary capture path: append one reflection to today's entry (creating it if needed), in the
  // selected category. The category stays selected so several of the same kind can be logged in a row.
  function addReflection() {
    const text = composerDraft.trim();
    if (!text) return;
    const today = todayStr();
    const existing = entries.find((e) => e.date === today);
    const base = existing ? { ...existing } : emptyEntry(today);
    const updated: GewsEntry = {
      ...base,
      [composerCategory]: [...base[composerCategory], { text, attachments: composerAttachments }],
      updatedAt: new Date().toISOString(),
    };
    persistWithUndo([updated, ...entries.filter((e) => e.date !== today)], "Reflection added");
    setComposerDraft("");
    setComposerAttachments([]);
  }

  function lineKey(date: string, cat: GewsCategory, idx: number) {
    return `${date}:${cat}:${idx}`;
  }

  function startInlineEdit(date: string, cat: GewsCategory, idx: number, text: string) {
    setEditingKey(lineKey(date, cat, idx));
    setEditingText(text);
  }

  function cancelInlineEdit() {
    setEditingKey(null);
    setEditingText("");
  }

  function saveInlineEdit(date: string, cat: GewsCategory, idx: number) {
    const text = editingText.trim();
    if (!text) { cancelInlineEdit(); return; }
    const next = entries.map((e) =>
      e.date !== date ? e : { ...e, [cat]: e[cat].map((l, i) => (i === idx ? { ...l, text } : l)), updatedAt: new Date().toISOString() },
    );
    persistWithUndo(next, "Reflection edited");
    cancelInlineEdit();
  }

  function recategorizeLine(date: string, cat: GewsCategory, idx: number, newCat: GewsCategory) {
    if (newCat === cat) return;
    const next = entries.map((e) => {
      if (e.date !== date) return e;
      const line = e[cat][idx];
      return { ...e, [cat]: e[cat].filter((_, i) => i !== idx), [newCat]: [...e[newCat], line], updatedAt: new Date().toISOString() };
    });
    persistWithUndo(next, "Reflection recategorized");
  }

  function deleteLine(date: string, cat: GewsCategory, idx: number) {
    const next = entries.map((e) =>
      e.date !== date ? e : { ...e, [cat]: e[cat].filter((_, i) => i !== idx), updatedAt: new Date().toISOString() },
    );
    persistWithUndo(next, "Reflection deleted");
  }

  return (
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="Gratitudes · Wins · Exciteds · Sadnesses"
        title="Daily GEWS,"
        emphasis="one entry a day."
        copy="A short daily check-in: what you're grateful for, what went well, what you're excited about, and what's weighing on you."
        statValue={`${sortedDesc.length} ${sortedDesc.length === 1 ? "day" : "days"}`}
        statLabel={`${totalLines} reflection${totalLines === 1 ? "" : "s"} kept`}
      />
      <RelatedJournalNav />

      {/* Composer — one category, one reflection at a time */}
      <div className="mb-6 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-[17px] shadow-[var(--jrnl-shadow)]">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <strong className="text-[13px] text-[var(--jrnl-ink)]">{CATEGORY_META[composerCategory].prompt}</strong>
          <span className="text-[11px] text-[var(--jrnl-muted)]">Enter to add · Shift+Enter for a new line</span>
        </div>
        <div className="flex items-start gap-2">
          <GewsCategoryPicker value={composerCategory} onChange={setComposerCategory} size="md" />
          <div className="min-w-0 flex-1">
            <AttachmentArea attachments={composerAttachments} onChange={setComposerAttachments} showHint={false}>
              <Textarea
                value={composerDraft}
                onChange={(e) => setComposerDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addReflection(); }
                }}
                placeholder={CATEGORY_META[composerCategory].prompt}
                rows={1}
                className="min-h-[44px] max-h-[130px] resize-y border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
              />
            </AttachmentArea>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--jrnl-muted)]">
            <Paperclip aria-hidden className="h-3.5 w-3.5" /> Attach a file
          </span>
          <Button onClick={addReflection} className="bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
            <Plus className="mr-1.5 h-4 w-4" /> Add reflection
          </Button>
        </div>
      </div>

      {/* Search + Undo/Redo/Export */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your reflections…"
            aria-label="Search daily reflections"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            disabled={!lastUndo}
            onClick={() => lastUndo?.undo()}
            title={lastUndo?.label || "No changes to undo"}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
          >
            <Undo2 className="mr-1.5 h-4 w-4" /> Undo
          </Button>
          <Button
            variant="outline"
            disabled={!lastRedo}
            onClick={() => lastRedo?.redo()}
            title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
          >
            <Redo2 className="mr-1.5 h-4 w-4" /> Redo
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={entries.length === 0}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]"
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <p className="dash-mono mb-3 normal-case text-[var(--jrnl-muted)]">
        {filteredDays.length} {filteredDays.length === 1 ? "day" : "days"} logged
        {search.trim() && ` matching "${search.trim()}"`}
      </p>

      {/* History — individual reflections, grouped by day */}
      {filteredDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <HeartHandshake aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-sage)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "Nothing found here." : "Make room for the first check-in."}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try another word or clear your search." : "Four honest lines can change the shape of a day."}
          </p>
          {!search.trim() && (
            <Button onClick={openAdd} className="mt-4 bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]">
              <Plus className="mr-1.5 h-4 w-4" /> Open today's check-in
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDays.map((e) => {
            const lines = CATEGORY_ORDER.flatMap((cat) => e[cat].map((line, idx) => ({ cat, idx, line })));
            return (
              <article
                key={e.date}
                className="rounded-lg border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="jrnl-display text-[19px] text-[var(--jrnl-ink)]">{fmtDateFull(e.date)}</h3>
                    <p className="mt-0.5 text-[11px] text-[var(--jrnl-muted)]">
                      {lines.length} reflection{lines.length === 1 ? "" : "s"}
                      {e.updatedAt && ` · saved ${fmtTime(e.updatedAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => openEdit(e)}
                      className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                      title="Edit day"
                      aria-label={`Edit ${fmtDateFull(e.date)}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteDate(e.date)}
                      className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                      title="Delete day"
                      aria-label={`Delete ${fmtDateFull(e.date)}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {lines.length === 0 ? (
                  <p className="mt-2 text-xs italic text-[var(--jrnl-muted)]">Empty entry — click Edit to add lines.</p>
                ) : (
                  <div className="mt-2 divide-y divide-[var(--jrnl-line)]">
                    {lines.map(({ cat, idx, line }) => {
                      const meta = CATEGORY_META[cat];
                      const Icon = meta.icon;
                      const key = lineKey(e.date, cat, idx);
                      const isEditing = editingKey === key;
                      return (
                        <div key={key} className="group flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                          <span
                            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                            style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
                          >
                            <Icon aria-hidden className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="dash-mono normal-case" style={{ color: meta.color }}>{meta.label}</span>
                            {isEditing ? (
                              <div className="mt-1 flex items-start gap-2">
                                <Input
                                  value={editingText}
                                  onChange={(ev) => setEditingText(ev.target.value)}
                                  onKeyDown={(ev) => {
                                    if (ev.key === "Enter") { ev.preventDefault(); saveInlineEdit(e.date, cat, idx); }
                                    if (ev.key === "Escape") { ev.preventDefault(); cancelInlineEdit(); }
                                  }}
                                  autoFocus
                                  className="h-8 flex-1 border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] text-[var(--jrnl-ink)]"
                                />
                                <button onClick={() => saveInlineEdit(e.date, cat, idx)} title="Save" className="text-emerald-500 hover:text-emerald-400">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={cancelInlineEdit} title="Cancel" className="text-[var(--jrnl-muted)] hover:text-red-400">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap text-[13px] text-[var(--jrnl-ink)]">{line.text}</p>
                                {line.attachments && line.attachments.length > 0 && (
                                  <div className="mt-1">
                                    <AttachmentArea attachments={line.attachments} onChange={() => {}} disabled showHint={false}>
                                      {null}
                                    </AttachmentArea>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                              <button
                                onClick={() => startInlineEdit(e.date, cat, idx, line.text)}
                                title="Edit reflection"
                                className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <GewsCategoryPicker
                                value={cat}
                                onChange={(newCat) => recategorizeLine(e.date, cat, idx, newCat)}
                                size="sm"
                                bare
                              />
                              <button
                                onClick={() => deleteLine(e.date, cat, idx)}
                                title="Delete reflection"
                                className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={swipeStyle} className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <div ref={isMobile ? swipeCallbackRef : undefined} className="contents">
          {isMobile && (
            <div className="flex justify-center pb-2 -mt-1">
              <div className="w-12 h-1.5 rounded-full bg-[var(--jrnl-line)]" />
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="jrnl-display text-xl text-[var(--jrnl-ink)] flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-[var(--jrnl-rose)]" />
              {originalDate ? "Edit Daily GEWS Entry" : "New Daily GEWS Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gews-date">Date</Label>
              <Input
                id="gews-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-[200px]"
              />
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="space-y-2 border-t border-[var(--jrnl-line)] pt-3">
                  <Label className="flex items-center gap-1.5" style={{ color: meta.color }}>
                    <Icon className="h-4 w-4" /> {meta.label}
                  </Label>
                  {form[cat].length > 0 && (
                    <ul className="space-y-1">
                      {form[cat].map((item, idx) => {
                        const isEditingLine = editingLine?.cat === cat && editingLine.idx === idx;
                        return (
                          <li key={idx} className="flex items-start justify-between gap-2 bg-[var(--jrnl-paper-2)] border border-[var(--jrnl-line)] rounded-lg px-3 py-1.5 text-sm text-[var(--jrnl-ink)]">
                            {isEditingLine ? (
                              <>
                                <Input
                                  value={editingLineText}
                                  onChange={(e) => setEditingLineText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); saveLineEdit(); }
                                    if (e.key === "Escape") { e.preventDefault(); cancelLineEdit(); }
                                  }}
                                  autoFocus
                                  className="flex-1 h-7 bg-[var(--jrnl-paper)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)]"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={saveLineEdit} title="Save" className="text-emerald-400 hover:text-emerald-300">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={cancelLineEdit} title="Cancel" className="text-[var(--jrnl-muted)] hover:text-red-400">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <span>{item.text}</span>
                                  {item.attachments && item.attachments.length > 0 && (
                                    <div className="mt-1.5">
                                      <AttachmentArea attachments={item.attachments} onChange={() => {}} disabled showHint={false}>
                                        {null}
                                      </AttachmentArea>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startLineEdit(cat, idx)} title="Edit" className="text-[var(--jrnl-muted)] hover:text-[var(--jrnl-rose)]">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => removeItem(cat, idx)} title="Remove" className="text-[var(--jrnl-muted)] hover:text-red-400">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex gap-2 items-start">
                    <AttachmentArea
                      attachments={draftAttachments[cat]}
                      onChange={(next) => setDraftAttachments({ ...draftAttachments, [cat]: next })}
                      showHint={false}
                      className="flex-1"
                    >
                      <Input
                        value={drafts[cat]}
                        onChange={(e) => setDrafts({ ...drafts, [cat]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(cat); } }}
                        onBlur={() => addItem(cat)}
                        placeholder={meta.placeholder}
                        className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)] pr-10"
                      />
                    </AttachmentArea>
                    <Button type="button" variant="outline" onClick={() => addItem(cat)} className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[var(--jrnl-sage)] hover:bg-[var(--jrnl-sage-deep)] text-white" disabled={!form.date}>
              {originalDate ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteDate} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--jrnl-muted)]">
            {confirmDeleteDate && `This will remove the Daily GEWS entry for ${fmtDateFull(confirmDeleteDate)}.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteDate && remove(confirmDeleteDate)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </JournalShell>
  );
}
