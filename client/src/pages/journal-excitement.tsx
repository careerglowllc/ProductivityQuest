import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, ArrowLeft, Plus, Trash2, Search, Download, Pencil, Check, X, Undo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { EmojiPicker } from "@/components/emoji-picker";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-excitement-v1";

type ExcitementEntry = {
  id: string;
  text: string;
  createdAt: string;
  emoji?: string;
};

function newId() {
  return `excitement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadEntries(): ExcitementEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
export function buildExcitementCSVExport(): CSVExport {
  const entries = loadEntries();
  const headers = ["Emoji", "Entry", "Date Added"];
  const rows = entries.map((e) => [e.emoji || "", e.text, fmtDate(e.createdAt)]);
  return { folder: "Journal", filename: "excitement-journal.csv", content: rowsToCSV(headers, rows) };
}

export default function JournalExcitementPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const { toast, dismiss } = useToast();
  const [entries, setEntries] = useState<ExcitementEntry[]>(loadEntries);
  const [draft, setDraft] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editUpdateDate, setEditUpdateDate] = useState(false);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);

  // Pick up entries added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setEntries(loadEntries())), []);

  function persist(next: ExcitementEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast.
  function persistWithUndo(next: ExcitementEntry[], label: string) {
    const previous = entries;
    persist(next);
    const undo = () => {
      persist(previous);
      setLastUndo(null);
      toast({ title: "Change undone", duration: 2000 });
    };
    setLastUndo({ label, undo });
    return undo;
  }

  function addEntry() {
    const text = draft.trim();
    if (!text) return;
    persist([{ id: newId(), text, createdAt: new Date().toISOString(), emoji: draftEmoji || undefined }, ...entries]);
    setDraft("");
    setDraftEmoji("");
  }

  function remove(id: string) {
    const undo = persistWithUndo(entries.filter((e) => e.id !== id), "Deleted excitement entry");
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

  function startEdit(e: ExcitementEntry) {
    setEditingId(e.id);
    setEditDraft(e.text);
    setEditUpdateDate(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
    setEditUpdateDate(false);
  }

  function saveEdit(id: string) {
    const text = editDraft.trim();
    if (!text) return;
    const undo = persistWithUndo(entries.map((e) => (e.id === id ? { ...e, text, createdAt: editUpdateDate ? new Date().toISOString() : e.createdAt } : e)), "Edited excitement entry");
    cancelEdit();
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function handleExport() {
    const { filename, content } = buildExcitementCSVExport();
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    return e.text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/journal">
            <a className="inline-flex items-center gap-1 text-yellow-200/70 hover:text-yellow-100 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Journal
            </a>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Zap className="h-10 w-10 text-orange-400" />
              <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-yellow-100`}>
                Excitement Journal
              </h1>
            </div>
            <p className="text-yellow-200/70 text-lg">A running list of things you're excited about</p>
          </div>

          {/* Quick-add */}
          <div className="flex gap-2 mb-6">
            <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
              <EmojiPicker value={draftEmoji} onChange={setDraftEmoji} size="md" />
            </span>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }}
              placeholder="I'm excited about…"
              className="flex-1 bg-slate-800/60 border-orange-600/30 text-orange-50 placeholder:text-slate-500"
            />
            <Button onClick={addEntry} className="bg-orange-600 hover:bg-orange-500 text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={entries.length === 0}
              className="bg-slate-800/60 border-orange-600/40 text-orange-200 hover:bg-orange-600/20 hover:text-orange-100 hover:border-orange-500/60 shrink-0"
            >
              <Download className="h-4 w-4 mr-1.5" /> Export CSV
            </Button>
            <Button
              onClick={() => lastUndo?.undo()}
              variant="outline"
              disabled={!lastUndo}
              title={lastUndo?.label || "No changes to undo"}
              className={`shrink-0 ${lastUndo ? "border-orange-500/60 text-orange-300 hover:bg-orange-600/20 hover:text-orange-100" : "border-slate-700 text-slate-600"}`}
            >
              <Undo2 className="h-4 w-4 mr-1.5" /> Undo
            </Button>
          </div>

          {/* Search */}
          {entries.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="pl-9 bg-slate-800/60 border-orange-600/30 text-orange-50 placeholder:text-slate-500"
              />
            </div>
          )}

          <p className="text-orange-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-orange-600/40">
              <CardContent className="p-12 text-center">
                <Zap className="h-16 w-16 text-orange-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-orange-100 mb-1">
                  {search.trim() ? "No matches" : "No excitement entries yet"}
                </h3>
                <p className="text-orange-300/70 text-sm">
                  {search.trim() ? "Try a different search term." : "Add something you're excited about above."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <Card
                  key={e.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-orange-600/30 hover:border-orange-500/60 transition-colors group"
                >
                  {editingId === e.id ? (
                    <CardContent className="p-4 space-y-3">
                      <Textarea
                        value={editDraft}
                        onChange={(ev) => setEditDraft(ev.target.value)}
                        className="bg-slate-900/60 border-orange-600/30 text-orange-50 placeholder:text-slate-500 min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="flex items-center gap-2 text-xs text-orange-200/70 cursor-pointer">
                          <Checkbox checked={editUpdateDate} onCheckedChange={(c) => setEditUpdateDate(c === true)} />
                          Update date to today
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white" onClick={() => saveEdit(e.id)}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="shrink-0" onClick={(ev) => ev.stopPropagation()}>
                          <EmojiPicker value={e.emoji || ""} onChange={(emoji) => updateEmoji(e.id, emoji)} size="sm" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-orange-50 whitespace-pre-wrap">{e.text}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{fmtDate(e.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEdit(e)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-orange-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(e.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDeleteId(null)}>
          <Card
            className="bg-slate-900 border border-orange-600/40 text-orange-50 max-w-sm w-full"
            onClick={(ev) => ev.stopPropagation()}
          >
            <CardContent className="p-5">
              <p className="mb-4">Delete this excitement entry?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                <Button
                  className="bg-red-600 hover:bg-red-500 text-white"
                  onClick={() => remove(confirmDeleteId)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
