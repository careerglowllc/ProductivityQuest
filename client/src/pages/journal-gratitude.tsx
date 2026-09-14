import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Plus, Trash2, Search, Download, Pencil, Check, X, Undo2, Redo2 } from "lucide-react";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { EmojiPicker } from "@/components/emoji-picker";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-gratitude-v1";

type GratitudeEntry = {
  id: string;
  text: string;
  createdAt: string;
  emoji?: string;
  attachments?: QuestAttachment[];
};

function newId() {
  return `gratitude-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadEntries(): GratitudeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
export function buildGratitudeCSVExport(): CSVExport {
  const entries = loadEntries();
  const headers = ["Emoji", "Entry", "Date Added"];
  const rows = entries.map((e) => [e.emoji || "", e.text, fmtDate(e.createdAt)]);
  return { folder: "Journal", filename: "gratitude-journal.csv", content: rowsToCSV(headers, rows) };
}

export default function JournalGratitudePage() {
  const { toast, dismiss } = useToast();
  const [entries, setEntries] = useState<GratitudeEntry[]>(loadEntries);
  const [draft, setDraft] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<QuestAttachment[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editUpdateDate, setEditUpdateDate] = useState(false);
  const [editAttachments, setEditAttachments] = useState<QuestAttachment[]>([]);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);

  // Pick up entries added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setEntries(loadEntries())), []);

  function persist(next: GratitudeEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast,
  // and re-applied via the Redo button if that undo is triggered.
  function persistWithUndo(next: GratitudeEntry[], label: string) {
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

  function addEntry() {
    const text = draft.trim();
    if (!text) return;
    persist([{ id: newId(), text, createdAt: new Date().toISOString(), emoji: draftEmoji || undefined, attachments: draftAttachments }, ...entries]);
    setDraft("");
    setDraftEmoji("");
    setDraftAttachments([]);
  }

  function remove(id: string) {
    const undo = persistWithUndo(entries.filter((e) => e.id !== id), "Deleted gratitude entry");
    setConfirmDeleteId(null);
    toast({
      title: "Entry deleted",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function updateEmoji(id: string, emoji: string) {
    persistWithUndo(entries.map((e) => (e.id === id ? { ...e, emoji } : e)), "Changed emoji");
  }

  function startEdit(e: GratitudeEntry) {
    setEditingId(e.id);
    setEditDraft(e.text);
    setEditUpdateDate(false);
    setEditAttachments(e.attachments || []);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
    setEditUpdateDate(false);
    setEditAttachments([]);
  }

  function saveEdit(id: string) {
    const text = editDraft.trim();
    if (!text) return;
    const undo = persistWithUndo(entries.map((e) => (e.id === id ? { ...e, text, createdAt: editUpdateDate ? new Date().toISOString() : e.createdAt, attachments: editAttachments } : e)), "Edited gratitude entry");
    cancelEdit();
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function handleExport() {
    const { filename, content } = buildGratitudeCSVExport();
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    return e.text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="A practice of noticing"
        title="Gratitude,"
        emphasis="kept close."
        copy="A running record of the people, moments, and small wins that make an ordinary day worth remembering."
        statValue={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        statLabel="in this quiet collection"
      />
      <RelatedJournalNav />

      {/* Composer */}
      <div className="mb-6 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-[17px] shadow-[var(--jrnl-shadow)]">
        <div className="mb-2.5 flex items-center justify-between">
          <strong className="text-[13px] text-[var(--jrnl-ink)]">What is worth appreciating today?</strong>
          <span className="text-[11px] text-[var(--jrnl-muted)]">Press Enter to add</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
            <EmojiPicker value={draftEmoji} onChange={setDraftEmoji} size="md" />
          </span>
          <div className="min-w-0 flex-1">
            <AttachmentArea attachments={draftAttachments} onChange={setDraftAttachments} showHint={false}>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }}
                placeholder="I'm grateful for…"
                className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
              />
            </AttachmentArea>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={entries.length === 0}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]"
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => lastUndo?.undo()}
            variant="outline"
            disabled={!lastUndo}
            title={lastUndo?.label || "No changes to undo"}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
          >
            <Undo2 className="mr-1.5 h-4 w-4" /> Undo
          </Button>
          <Button
            onClick={() => lastRedo?.redo()}
            variant="outline"
            disabled={!lastRedo}
            title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"}
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)] disabled:opacity-40"
          >
            <Redo2 className="mr-1.5 h-4 w-4" /> Redo
          </Button>
          <Button onClick={addEntry} className="bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
            <Plus className="mr-1.5 h-4 w-4" /> Add entry
          </Button>
        </div>
      </div>

      {/* Search */}
      {entries.length > 0 && (
        <div className="relative mb-4">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your gratitude…"
            aria-label="Search gratitude entries"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
      )}

      <p className="dash-mono mb-3 normal-case text-[var(--jrnl-muted)]">
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        {search.trim() && ` matching "${search.trim()}"`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <Heart aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-rose)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "Nothing found here." : "Leave a first small note."}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try another word or clear your search." : "The best entries are often specific, ordinary, and true."}
          </p>
        </div>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {filtered.map((e) => (
            <article
              key={e.id}
              className="group flex items-start gap-3.5 rounded-lg border border-[var(--jrnl-line)] border-l-[3px] border-l-[var(--jrnl-rose)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)] focus-within:shadow-[var(--jrnl-shadow)]"
            >
              {editingId === e.id ? (
                <div className="min-w-0 flex-1 space-y-3">
                  <AttachmentArea attachments={editAttachments} onChange={setEditAttachments}>
                    <Textarea
                      value={editDraft}
                      onChange={(ev) => setEditDraft(ev.target.value)}
                      className="min-h-[80px] border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
                      autoFocus
                    />
                  </AttachmentArea>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--jrnl-muted)]">
                      <Checkbox checked={editUpdateDate} onCheckedChange={(c) => setEditUpdateDate(c === true)} />
                      Update date to today
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="border-[var(--jrnl-line)]">
                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button size="sm" className="bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]" onClick={() => saveEdit(e.id)}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Save changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--jrnl-rose-soft)] text-[var(--jrnl-rose)]"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <EmojiPicker value={e.emoji || ""} onChange={(emoji) => updateEmoji(e.id, emoji)} size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-[14px] text-[var(--jrnl-ink)]">{e.text}</p>
                    {e.attachments && e.attachments.length > 0 && (
                      <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                        <AttachmentArea attachments={e.attachments} onChange={() => {}} disabled showHint={false}>
                          {null}
                        </AttachmentArea>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--jrnl-muted)]">
                      <span>{fmtDate(e.createdAt)}</span>
                      <i aria-hidden className="h-[3px] w-[3px] rounded-full bg-[var(--jrnl-line)]" />
                      <span>Personal reflection</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      onClick={() => startEdit(e)}
                      className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(e.id)}
                      className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gratitude-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-6 shadow-[var(--jrnl-shadow)]"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="gratitude-delete-title" className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">Let this one go?</h2>
            <p className="mt-1 text-xs text-[var(--jrnl-muted)]">This gratitude entry will be removed from your collection. You can undo the change afterwards.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="border-[var(--jrnl-line)]">Keep entry</Button>
              <Button className="bg-[var(--jrnl-rose)] text-white hover:opacity-90" onClick={() => remove(confirmDeleteId)}>Delete entry</Button>
            </div>
          </div>
        </div>
      )}
    </JournalShell>
  );
}
