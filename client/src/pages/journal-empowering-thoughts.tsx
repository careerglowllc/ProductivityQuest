import { useState } from "react";
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
import { Sparkles, ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-empowering-thoughts-v1";

type Thought = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

const EMPTY: Thought = { id: "", title: "", description: "", createdAt: "", updatedAt: "" };

function newId() {
  return `thought-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadThoughts(): Thought[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export default function JournalEmpoweringThoughtsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const [thoughts, setThoughts] = useState<Thought[]>(loadThoughts);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Thought>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function persist(next: Thought[]) {
    setThoughts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const filtered = thoughts
    .filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [t.title, t.description].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  function openAdd() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(t: Thought) {
    setForm({ ...t });
    setEditingId(t.id);
    setDialogOpen(true);
  }

  function save() {
    const title = form.title.trim() || "Untitled Thought";
    const now = new Date().toISOString();
    if (editingId) {
      persist(thoughts.map((t) => (t.id === editingId ? { ...form, title, updatedAt: now } : t)));
    } else {
      persist([{ ...form, title, id: newId(), createdAt: now, updatedAt: now }, ...thoughts]);
    }
    setDialogOpen(false);
    setEditingId(null);
  }

  function remove(id: string) {
    persist(thoughts.filter((t) => t.id !== id));
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
          <Link href="/journal">
            <a className="inline-flex items-center gap-1 text-yellow-200/70 hover:text-yellow-100 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Journal
            </a>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="h-10 w-10 text-amber-400" />
              <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-yellow-100`}>
                Current Empowering Thoughts/Beliefs
              </h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Thoughts and beliefs you're actively reinforcing right now</p>
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
              <Plus className="h-4 w-4 mr-1.5" /> New Entry
            </Button>
          </div>

          <p className="text-amber-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-amber-600/40">
              <CardContent className="p-12 text-center">
                <Sparkles className="h-16 w-16 text-amber-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-100 mb-1">
                  {search.trim() ? "No matches" : "No empowering thoughts yet"}
                </h3>
                <p className="text-amber-300/70 text-sm mb-5">
                  {search.trim() ? "Try a different search term." : "Add a thought or belief you want to keep reinforcing."}
                </p>
                {!search.trim() && (
                  <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> New Entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <Card
                  key={t.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-amber-600/30 hover:border-amber-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(t)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-amber-50 font-semibold font-serif">{t.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(t); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(t.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-400 whitespace-pre-wrap">
                      {t.description || "No description yet — click to add one…"}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">Updated {fmtDate(t.updatedAt)}</p>
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
              <Sparkles className="h-5 w-5 text-amber-400" />
              {editingId ? "Edit Thought" : "New Empowering Thought"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="thought-title">Title</Label>
              <Input
                id="thought-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. I am capable of figuring things out"
                className="bg-slate-800/60 border-amber-600/30 text-amber-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thought-description">Description</Label>
              <Textarea
                id="thought-description"
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Why this thought matters to you, evidence that supports it, when to remember it…"
                className="bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white">
              {editingId ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border border-amber-600/40 text-amber-50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">This can't be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && remove(confirmDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
