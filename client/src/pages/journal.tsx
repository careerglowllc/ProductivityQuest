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
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
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
          </div>

          {/* Count */}
          <p className="text-amber-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "essay" : "essays"}
            {search.trim() && ` matching “${search.trim()}”`}
          </p>

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
                  className="bg-slate-800/60 backdrop-blur-md border border-amber-600/30 hover:border-amber-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-amber-50 font-semibold font-serif truncate">{e.title}</h3>
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
