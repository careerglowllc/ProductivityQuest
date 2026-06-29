import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckSquare,
  Square,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

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
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

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
    <div
      className={`min-h-screen ${
        isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <BookOpen className="h-10 w-10 text-amber-400" />
              <h1 className="text-4xl font-serif font-bold text-yellow-100">Journal</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Your written essays &amp; reflections</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles & text…"
                className="pl-9 bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={openAdd}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New Essay
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={filtered.length === 0}
                  className="bg-slate-800/60 border-amber-600/40 text-amber-200 hover:bg-amber-600/20 hover:text-amber-100 hover:border-amber-500/60 shrink-0"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Export{someSelected ? ` (${selected.size})` : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-amber-600/30 text-amber-50">
                <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-400" /> Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700">
                  <FileText className="h-4 w-4 mr-2 text-red-400" /> Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("word")} className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700">
                  <FileType className="h-4 w-4 mr-2 text-blue-400" /> Export as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Count + select all */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-amber-300/60 text-sm">
              {filtered.length} {filtered.length === 1 ? "essay" : "essays"}
              {someSelected && ` · ${selected.size} selected`}
              {search.trim() && ` matching “${search.trim()}”`}
            </p>
            {filtered.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-amber-300/80 hover:text-amber-100 transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-amber-600/40">
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 text-amber-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-100 mb-1">
                  {search.trim() ? "No matches" : "Your journal is empty"}
                </h3>
                <p className="text-amber-300/70 text-sm mb-5">
                  {search.trim()
                    ? "Try a different search term."
                    : "Start your first essay to capture an idea, story, or reflection."}
                </p>
                {!search.trim() && (
                  <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> New Essay
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((e) => (
                <Card
                  key={e.id}
                  className={`bg-slate-800/60 backdrop-blur-md border transition-colors group cursor-pointer ${
                    selected.has(e.id)
                      ? "border-amber-500/70 ring-1 ring-amber-500/40"
                      : "border-amber-600/30 hover:border-amber-500/60"
                  }`}
                  onClick={() => openEdit(e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }}
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-amber-300"
                          title={selected.has(e.id) ? "Deselect" : "Select"}
                        >
                          {selected.has(e.id) ? (
                            <CheckSquare className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                        <h3 className="text-amber-50 font-semibold font-serif truncate">{e.title}</h3>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-3 min-h-[3.5rem]">
                      {snippet(e.body) || "Empty essay — click to write…"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{wordCount(e.body)} words</span>
                      <span>· Updated {fmtDate(e.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border border-amber-600/40 text-amber-50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-amber-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              {editingId ? "Edit Essay" : "New Essay"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-amber-200/80 text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Essay title"
                className="bg-slate-800 border-slate-700 text-amber-50 mt-1 text-lg font-serif"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-amber-200/80 text-xs">Body</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your essay…"
                className="bg-slate-800 border-slate-700 text-amber-50 mt-1 min-h-[320px] leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">{wordCount(form.body)} words</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-300 hover:text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white">
              {editingId ? "Save Changes" : "Create Essay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border border-red-600/40 text-amber-50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-200">Delete essay?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            This will permanently remove{" "}
            <span className="font-semibold text-white">{essays.find((e) => e.id === confirmDeleteId)?.title}</span>.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-slate-300 hover:text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={() => confirmDeleteId && remove(confirmDeleteId)} className="bg-red-600 hover:bg-red-500 text-white">
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
