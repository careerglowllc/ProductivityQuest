import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { BookMarked, ArrowLeft, Plus, Pencil, Trash2, Download, Search, Undo2, Redo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-reference-beliefs-v2";
// Older single-textarea version of this page — migrated into one belief entry below.
const LEGACY_STORAGE_KEY = "journal-reference-beliefs-v1";

type Belief = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

const EMPTY: Belief = { id: "", title: "", description: "", createdAt: "", updatedAt: "" };

function newId() {
  return `belief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadBeliefs(): Belief[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // One-time migration from the old free-text version, so nothing already written is lost.
  try {
    const legacyText = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyText && legacyText.trim()) {
      const now = new Date().toISOString();
      return [{ id: newId(), title: "Imported Notes", description: legacyText, createdAt: now, updatedAt: now }];
    }
  } catch { /* ignore */ }
  return [];
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
export function buildReferenceBeliefsCSVExport(): CSVExport {
  const beliefs = loadBeliefs();
  const headers = ["Title", "Description", "Date Added", "Last Modified"];
  const rows = beliefs.map((b) => [b.title, b.description, fmtDate(b.createdAt), fmtDate(b.updatedAt)]);
  return { folder: "Journal", filename: "reference-beliefs.csv", content: rowsToCSV(headers, rows) };
}

export default function ReferenceBeliefsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const { toast, dismiss } = useToast();
  const [beliefs, setBeliefs] = useState<Belief[]>(loadBeliefs);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Belief>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);

  // Pick up beliefs added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setBeliefs(loadBeliefs())), []);

  function persist(next: Belief[]) {
    setBeliefs(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast,
  // and re-applied via the Redo button if that undo is triggered.
  function persistWithUndo(next: Belief[], label: string) {
    const previous = beliefs;
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

  const filtered = beliefs
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [b.title, b.description].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  function openAdd() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(b: Belief) {
    setForm({ ...b });
    setEditingId(b.id);
    setDialogOpen(true);
  }

  function save() {
    const title = form.title.trim() || "Untitled Belief";
    const now = new Date().toISOString();
    const undo = editingId
      ? persistWithUndo(beliefs.map((b) => (b.id === editingId ? { ...form, title, updatedAt: now } : b)), "Edited belief")
      : persistWithUndo([{ ...form, title, id: newId(), createdAt: now, updatedAt: now }, ...beliefs], "Added belief");
    setDialogOpen(false);
    setEditingId(null);
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function remove(id: string) {
    const undo = persistWithUndo(beliefs.filter((b) => b.id !== id), "Deleted belief");
    setConfirmDeleteId(null);
    toast({
      title: "Belief deleted",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function handleExport() {
    const { filename, content } = buildReferenceBeliefsCSVExport();
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Link href="/journal">
            <a className="inline-flex items-center gap-1 text-yellow-200/70 hover:text-yellow-100 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Journal
            </a>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <BookMarked className="h-10 w-10 text-amber-400" />
              <h1 className="text-4xl font-serif font-bold text-yellow-100">Reference Beliefs</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">A running list of your principles &amp; reference notes</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles & descriptions…"
                className="pl-9 bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500"
              />
            </div>
            <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> New Belief
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={filtered.length === 0}
              className="bg-slate-800/60 border-amber-600/40 text-amber-200 hover:bg-amber-600/20 hover:text-amber-100 hover:border-amber-500/60 shrink-0"
            >
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            <Button
              onClick={() => lastUndo?.undo()}
              variant="outline"
              disabled={!lastUndo}
              title={lastUndo?.label || "No changes to undo"}
              className={`shrink-0 ${lastUndo ? "border-amber-500/60 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100" : "border-slate-700 text-slate-600"}`}
            >
              <Undo2 className="h-4 w-4 mr-1.5" /> Undo
            </Button>
            <Button
              onClick={() => lastRedo?.redo()}
              variant="outline"
              disabled={!lastRedo}
              title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"}
              className={`shrink-0 ${lastRedo ? "border-amber-500/60 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100" : "border-slate-700 text-slate-600"}`}
            >
              <Redo2 className="h-4 w-4 mr-1.5" /> Redo
            </Button>
          </div>

          <p className="text-amber-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "belief" : "beliefs"}
            {search.trim() && ` matching “${search.trim()}”`}
          </p>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-amber-600/40">
              <CardContent className="p-12 text-center">
                <BookMarked className="h-16 w-16 text-amber-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-100 mb-1">
                  {search.trim() ? "No matches" : "No beliefs recorded yet"}
                </h3>
                <p className="text-amber-300/70 text-sm mb-5">
                  {search.trim() ? "Try a different search term." : "Add your first principle or reference belief."}
                </p>
                {!search.trim() && (
                  <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> New Belief
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => (
                <Card
                  key={b.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-amber-600/30 hover:border-amber-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(b)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-amber-50 font-semibold font-serif">{b.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(b); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(b.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-400 whitespace-pre-wrap">
                      {b.description || "No description yet — click to add one…"}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">Updated {fmtDate(b.updatedAt)}</p>
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
              <BookMarked className="h-5 w-5 text-amber-400" />
              {editingId ? "Edit Belief" : "New Belief"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-amber-200/80 text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Always compound before consuming"
                className="bg-slate-800 border-slate-700 text-amber-50 mt-1 text-lg font-serif"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-amber-200/80 text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Write the detailed explanation of this belief…"
                className="bg-slate-800 border-slate-700 text-amber-50 mt-1 min-h-[260px] leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-300 hover:text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white">
              {editingId ? "Save Changes" : "Create Belief"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border border-red-600/40 text-amber-50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-200">Delete belief?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            This will remove{" "}
            <span className="font-semibold text-white">{beliefs.find((b) => b.id === confirmDeleteId)?.title}</span> (you can undo right after).
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
