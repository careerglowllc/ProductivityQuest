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
import { BookMarked, Plus, Pencil, Trash2, Download, Search, Undo2, Redo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { useSwipeDownToClose } from "@/hooks/use-swipe-down-to-close";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";

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
  attachments?: QuestAttachment[];
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
  const { swipeCallbackRef, style: swipeStyle } = useSwipeDownToClose(dialogOpen, setDialogOpen, isMobile);

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
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="Principles worth returning to"
        title="Reference beliefs,"
        emphasis="on file."
        copy="A running list of your principles and reference notes — the things worth re-reading when you need them."
        statValue={`${beliefs.length} ${beliefs.length === 1 ? "belief" : "beliefs"}`}
        statLabel="on record"
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
          <Plus className="mr-1.5 h-4 w-4" /> New belief
        </Button>
        <Button
          onClick={handleExport}
          variant="outline"
          disabled={filtered.length === 0}
          className="shrink-0 border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]"
        >
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
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
        {filtered.length} {filtered.length === 1 ? "belief" : "beliefs"}
        {search.trim() && ` matching “${search.trim()}”`}
      </p>

          {/* List */}
          {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <BookMarked aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-sage)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "No matches" : "No beliefs recorded yet"}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try a different search term." : "Add your first principle or reference belief."}
          </p>
          {!search.trim() && (
            <Button onClick={openAdd} className="mt-4 bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]">
              <Plus className="mr-1.5 h-4 w-4" /> New belief
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <article
              key={b.id}
              className="group cursor-pointer rounded-lg border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)]"
              onClick={() => openEdit(b)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="jrnl-display text-[19px] text-[var(--jrnl-ink)]">{b.title}</h3>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); openEdit(b); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(b.id); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--jrnl-muted)]">
                {b.description || "No description yet — click to add one…"}
              </p>
              {b.attachments && b.attachments.length > 0 && (
                <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                  <AttachmentArea attachments={b.attachments} onChange={() => {}} disabled showHint={false}>
                    {null}
                  </AttachmentArea>
                </div>
              )}
              <p className="mt-2 text-[11px] text-[var(--jrnl-muted)]">Updated {fmtDate(b.updatedAt)}</p>
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
              <AttachmentArea
                attachments={form.attachments || []}
                onChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
              >
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Write the detailed explanation of this belief…"
                  className="bg-slate-800 border-slate-700 text-amber-50 mt-1 min-h-[260px] leading-relaxed pr-10"
                />
              </AttachmentArea>
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
          </div>
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
    </JournalShell>
  );
}
