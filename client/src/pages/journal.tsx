import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Download,
  FileSpreadsheet,
  FileType,
  FileArchive,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { rowsToCSV, type CSVExport } from "@/lib/csv-export";
import { buildDailyGewsCSVExport } from "@/pages/journal-daily-gews";
import { buildGratitudeCSVExport } from "@/pages/journal-gratitude";
import { buildExcitementCSVExport } from "@/pages/journal-excitement";
import { buildEmpoweringThoughtsCSVExport } from "@/pages/journal-empowering-thoughts";
import { buildWeeklyPlanningCSVExport } from "@/pages/journal-weekly-planning";
import { buildReferenceBeliefsCSVExport } from "@/pages/reference-beliefs";
import { JournalShell, JournalHero, RelatedJournalNav } from "@/components/journal-ui";

// ── Constants ───────────────────────────────────────────────
const STORAGE_KEY = "journal-v1";

// ── Types ────────────────────────────────────────────────────
type Essay = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const EMPTY: Essay = { id: "", title: "", body: "", createdAt: "", updatedAt: "" };


// ── Helpers ──────────────────────────────────────────────────
function newId() {
  return `essay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

function snippet(s: string, n = 140) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Pure builder (no side effects) so a master "Export all journal sections" zip can reuse it.
export function buildJournalCSVExport(): CSVExport {
  const essays: Essay[] = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  })();
  const headers = ["Title", "Body", "Words", "Date Added", "Last Modified"];
  const rows = essays.map((e) => [e.title, e.body, wordCount(e.body), fmtDate(e.createdAt), fmtDate(e.updatedAt)]);
  return { folder: "Journal", filename: "journal-essays.csv", content: rowsToCSV(headers, rows) };
}

// CSV — one row per essay
function exportCSV(essays: Essay[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Title", "Body", "Words", "Date Added", "Last Modified"];
  const rows = essays.map((e) =>
    [e.title, e.body, wordCount(e.body), fmtDate(e.createdAt), fmtDate(e.updatedAt)].map(esc).join(",")
  );
  const csv = [headers.map(esc).join(","), ...rows].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `journal_${stamp()}.csv`);
}

// Word — HTML wrapped as .doc (opens natively in Word / Pages / Google Docs)
function exportWord(essays: Essay[]) {
  const body = essays
    .map(
      (e) => `
      <h1 style="font-family:Georgia,serif;color:#1a1a1a;">${escapeHtml(e.title)}</h1>
      <p style="color:#666;font-size:11px;">${wordCount(e.body)} words · Updated ${fmtDate(e.updatedAt)}</p>
      <div style="font-family:Calibri,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(e.body)}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #ccc;" />`
    )
    .join("");
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Journal</title></head><body>${body}</body></html>`;
  downloadBlob(new Blob([html], { type: "application/msword" }), `journal_${stamp()}.doc`);
}

// PDF — true client-side document (jsPDF, lazy-loaded)
async function exportPDF(essays: Essay[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  essays.forEach((e, idx) => {
    if (idx > 0) { doc.addPage(); y = margin; }
    doc.setFont("times", "bold").setFontSize(20);
    doc.splitTextToSize(e.title || "Untitled", maxW).forEach((line: string) => {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); y += 26;
    });
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(120);
    doc.text(`${wordCount(e.body)} words · Updated ${fmtDate(e.updatedAt)}`, margin, y);
    y += 22;
    doc.setFontSize(12).setTextColor(20);
    doc.splitTextToSize(e.body || "", maxW).forEach((line: string) => {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); y += 16;
    });
  });
  doc.save(`journal_${stamp()}.pdf`);
}

// ── Component ────────────────────────────────────────────────
export default function JournalPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [essays, setEssays] = useState<Essay[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Essay>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportingAll, setExportingAll] = useState(false);

  // Pick up essays added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => {
    try {
      setEssays(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch { /* ignore */ }
  }), []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(essays));
    } catch {}
  }, [essays]);

  const filtered = essays
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [e.title, e.body].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const someSelected = selected.size > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      allSelected ? new Set() : new Set(filtered.map((e) => e.id))
    );
  }

  // Export the selected essays, or all filtered if none are selected.
  function handleExport(kind: "csv" | "pdf" | "word") {
    const target = someSelected ? filtered.filter((e) => selected.has(e.id)) : filtered;
    if (target.length === 0) return;
    if (kind === "csv") exportCSV(target);
    else if (kind === "word") exportWord(target);
    else void exportPDF(target);
  }

  // Bundles every journal section (this hub's essays + all 6 sub-journals) into one zip,
  // so you don't have to visit each page individually to back everything up.
  async function exportAllJournal() {
    setExportingAll(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const exports = [
        buildJournalCSVExport(),
        buildDailyGewsCSVExport(),
        buildGratitudeCSVExport(),
        buildExcitementCSVExport(),
        buildEmpoweringThoughtsCSVExport(),
        buildWeeklyPlanningCSVExport(),
        buildReferenceBeliefsCSVExport(),
      ];
      for (const exp of exports) {
        zip.folder(exp.folder)!.file(exp.filename, exp.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `journal-export-${stamp()}.zip`);
      toast({ title: "Export complete!", description: `Bundled all ${exports.length} journal sections into a zip.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setExportingAll(false);
    }
  }

  function openAdd() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(e: Essay) {
    setForm({ ...e });
    setEditingId(e.id);
    setDialogOpen(true);
  }

  function save() {
    const title = form.title.trim() || "Untitled";
    const now = new Date().toISOString();
    if (editingId) {
      setEssays((prev) => prev.map((e) => (e.id === editingId ? { ...form, title, updatedAt: now } : e)));
    } else {
      setEssays((prev) => [{ ...form, title, id: newId(), createdAt: now, updatedAt: now }, ...prev]);
    }
    setDialogOpen(false);
    setEditingId(null);
  }

  function remove(id: string) {
    setEssays((prev) => prev.filter((e) => e.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <JournalShell>
      <JournalHero
        eyebrow="Your written essays & reflections"
        title="Journal,"
        emphasis="in your own words."
        copy="Long-form essays, reflections, and stories — the ideas worth writing all the way out."
        statValue={`${essays.length} ${essays.length === 1 ? "essay" : "essays"}`}
        statLabel="written so far"
      />
      <RelatedJournalNav />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles & text…"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
        <Button
          onClick={openAdd}
          className="shrink-0 bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New essay
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={filtered.length === 0}
              className="shrink-0 border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export{someSelected ? ` (${selected.size})` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-ink)]">
            <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer hover:bg-[var(--jrnl-sage-soft)]">
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer hover:bg-[var(--jrnl-sage-soft)]">
              <FileText className="h-4 w-4 mr-2 text-red-500" /> Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("word")} className="cursor-pointer hover:bg-[var(--jrnl-sage-soft)]">
              <FileType className="h-4 w-4 mr-2 text-blue-500" /> Export as Word
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); if (!exportingAll) void exportAllJournal(); }}
              disabled={exportingAll}
              className="cursor-pointer hover:bg-[var(--jrnl-sage-soft)]"
            >
              {exportingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-[var(--jrnl-sage-deep)]" />
              ) : (
                <FileArchive className="h-4 w-4 mr-2 text-[var(--jrnl-sage-deep)]" />
              )}
              {exportingAll ? "Exporting all sections…" : "Export all journal sections (zip)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Count + select all */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="dash-mono normal-case text-[var(--jrnl-muted)]">
          {filtered.length} {filtered.length === 1 ? "essay" : "essays"}
          {someSelected && ` · ${selected.size} selected`}
          {search.trim() && ` matching “${search.trim()}”`}
        </p>
        {filtered.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="dash-focus flex items-center gap-1.5 text-xs text-[var(--jrnl-muted)] transition-colors hover:text-[var(--jrnl-sage-deep)]"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-[var(--jrnl-sage)]" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <FileText aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-sage)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "No matches" : "Your journal is empty"}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim()
              ? "Try a different search term."
              : "Start your first essay to capture an idea, story, or reflection."}
          </p>
          {!search.trim() && (
            <Button onClick={openAdd} className="mt-4 bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]">
              <Plus className="mr-1.5 h-4 w-4" /> New essay
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <article
              key={e.id}
              className={`group cursor-pointer rounded-lg border bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)] ${
                selected.has(e.id) ? "border-[var(--jrnl-rose)] ring-1 ring-[var(--jrnl-rose)]/40" : "border-[var(--jrnl-line)]"
              }`}
              onClick={() => openEdit(e)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }}
                    className="dash-focus mt-0.5 shrink-0 text-[var(--jrnl-muted)] hover:text-[var(--jrnl-sage-deep)]"
                    title={selected.has(e.id) ? "Deselect" : "Select"}
                  >
                    {selected.has(e.id) ? (
                      <CheckSquare className="h-4 w-4 text-[var(--jrnl-rose)]" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <h3 className="jrnl-display truncate text-[19px] text-[var(--jrnl-ink)]">{e.title}</h3>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 min-h-[3.5rem] text-sm text-[var(--jrnl-muted)] line-clamp-3">
                {snippet(e.body) || "Empty essay — click to write…"}
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--jrnl-muted)]">
                <span>{wordCount(e.body)} words</span>
                <span>· Updated {fmtDate(e.updatedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="jrnl-display text-xl text-[var(--jrnl-ink)] flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--jrnl-rose)]" />
              {editingId ? "Edit Essay" : "New Essay"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-[var(--jrnl-muted)] text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Essay title"
                className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] mt-1 text-lg jrnl-display"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[var(--jrnl-muted)] text-xs">Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your essay…"
                className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] mt-1 min-h-[320px] leading-relaxed"
              />
              <p className="text-[11px] text-[var(--jrnl-muted)] mt-1">{wordCount(form.body)} words</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[var(--jrnl-muted)] hover:text-[var(--jrnl-ink)] hover:bg-[var(--jrnl-paper-2)]">
              Cancel
            </Button>
            <Button onClick={save} className="bg-[var(--jrnl-sage)] hover:bg-[var(--jrnl-sage-deep)] text-white">
              {editingId ? "Save Changes" : "Create Essay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete essay?</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--jrnl-muted)] text-sm">
            This will permanently remove{" "}
            <span className="font-semibold text-[var(--jrnl-ink)]">{essays.find((e) => e.id === confirmDeleteId)?.title}</span>.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-[var(--jrnl-muted)] hover:text-[var(--jrnl-ink)] hover:bg-[var(--jrnl-paper-2)]">
              Cancel
            </Button>
            <Button onClick={() => confirmDeleteId && remove(confirmDeleteId)} className="bg-red-600 hover:bg-red-500 text-white">
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </JournalShell>
  );
}
