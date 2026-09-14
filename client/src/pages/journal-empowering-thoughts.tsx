import { useState, useEffect } from "react";
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
import { Sparkles, Plus, Pencil, Trash2, Search, Undo2, Redo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { useSwipeDownToClose } from "@/hooks/use-swipe-down-to-close";
import { rowsToCSV, type CSVExport } from "@/lib/csv-export";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-empowering-thoughts-v1";

type Thought = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  attachments?: QuestAttachment[];
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

// Pure builder (no side effects) so the Journal hub's/Settings' "Export All" master export can reuse it.
export function buildEmpoweringThoughtsCSVExport(): CSVExport {
  const thoughts = loadThoughts();
  const headers = ["Title", "Description", "Date Added", "Last Modified"];
  const rows = thoughts.map((t) => [t.title, t.description, fmtDate(t.createdAt), fmtDate(t.updatedAt)]);
  return { folder: "Journal", filename: "empowering-thoughts.csv", content: rowsToCSV(headers, rows) };
}

export default function JournalEmpoweringThoughtsPage() {
  const isMobile = useIsMobile();
  const { toast, dismiss } = useToast();
  const [thoughts, setThoughts] = useState<Thought[]>(loadThoughts);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Thought>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);
  const { swipeCallbackRef, style: swipeStyle } = useSwipeDownToClose(dialogOpen, setDialogOpen, isMobile);

  // Pick up thoughts added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setThoughts(loadThoughts())), []);

  function persist(next: Thought[]) {
    setThoughts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast,
  // and re-applied via the Redo button if that undo is triggered.
  function persistWithUndo(next: Thought[], label: string) {
    const previous = thoughts;
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
    const wasEditing = !!editingId;
    const undo = wasEditing
      ? persistWithUndo(thoughts.map((t) => (t.id === editingId ? { ...form, title, updatedAt: now } : t)), "Edited empowering thought")
      : persistWithUndo([{ ...form, title, id: newId(), createdAt: now, updatedAt: now }, ...thoughts], "Added empowering thought");
    setDialogOpen(false);
    setEditingId(null);
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function remove(id: string) {
    const undo = persistWithUndo(thoughts.filter((t) => t.id !== id), "Deleted empowering thought");
    setConfirmDeleteId(null);
    toast({
      title: "Entry deleted",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  return (
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="What you're reinforcing right now"
        title="Empowering thoughts,"
        emphasis="on repeat."
        copy="The beliefs you're actively choosing to reinforce — revisit and rewrite them as you grow."
        statValue={`${thoughts.length} ${thoughts.length === 1 ? "entry" : "entries"}`}
        statLabel="in this collection"
      />
      <RelatedJournalNav />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles & descriptions…"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
        <Button onClick={openAdd} className="shrink-0 bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
          <Plus className="mr-1.5 h-4 w-4" /> New entry
        </Button>
        <Button
          onClick={() => lastUndo?.undo()}
          variant="outline"
          disabled={!lastUndo}
          title={lastUndo?.label || "No changes to undo"}
          className="shrink-0 border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
        >
          <Undo2 className="mr-1.5 h-4 w-4" /> Undo
        </Button>
        <Button
          onClick={() => lastRedo?.redo()}
          variant="outline"
          disabled={!lastRedo}
          title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"}
          className="shrink-0 border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
        >
          <Redo2 className="mr-1.5 h-4 w-4" /> Redo
        </Button>
      </div>

      <p className="dash-mono mb-3 normal-case text-[var(--jrnl-muted)]">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        {search.trim() && ` matching "${search.trim()}"`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <Sparkles aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-sage)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "No matches" : "No empowering thoughts yet"}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try a different search term." : "Add a thought or belief you want to keep reinforcing."}
          </p>
          {!search.trim() && (
            <Button onClick={openAdd} className="mt-4 bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]">
              <Plus className="mr-1.5 h-4 w-4" /> New entry
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="group cursor-pointer rounded-lg border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)]"
              onClick={() => openEdit(t)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="jrnl-display text-[19px] text-[var(--jrnl-ink)]">{t.title}</h3>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); openEdit(t); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(t.id); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--jrnl-muted)]">
                {t.description || "No description yet — click to add one…"}
              </p>
              {t.attachments && t.attachments.length > 0 && (
                <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                  <AttachmentArea attachments={t.attachments} onChange={() => {}} disabled showHint={false}>
                    {null}
                  </AttachmentArea>
                </div>
              )}
              <p className="mt-2 text-[11px] text-[var(--jrnl-muted)]">Updated {fmtDate(t.updatedAt)}</p>
            </article>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={swipeStyle} className="bg-slate-900 border border-amber-600/40 text-amber-50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div ref={isMobile ? swipeCallbackRef : undefined} className="contents">
          {isMobile && (
            <div className="flex justify-center pb-2 -mt-1">
              <div className="w-12 h-1.5 rounded-full bg-amber-200/30" />
            </div>
          )}
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
              <AttachmentArea
                attachments={form.attachments || []}
                onChange={(next) => setForm({ ...form, attachments: next })}
              >
                <Textarea
                  id="thought-description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Why this thought matters to you, evidence that supports it, when to remember it…"
                  className="bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500 pr-10"
                />
              </AttachmentArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white">
              {editingId ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border border-amber-600/40 text-amber-50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">This entry will be removed (you can undo right after).</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && remove(confirmDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </JournalShell>
  );
}
