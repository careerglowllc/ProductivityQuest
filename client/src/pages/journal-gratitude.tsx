import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-gratitude-v1";

type GratitudeEntry = {
  id: string;
  text: string;
  createdAt: string;
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

export default function JournalGratitudePage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<GratitudeEntry[]>(loadEntries);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function persist(next: GratitudeEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function addEntry() {
    const text = draft.trim();
    if (!text) return;
    persist([{ id: newId(), text, createdAt: new Date().toISOString() }, ...entries]);
    setDraft("");
  }

  function remove(id: string) {
    persist(entries.filter((e) => e.id !== id));
    setConfirmDeleteId(null);
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
              <Heart className="h-10 w-10 text-pink-400" />
              <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-yellow-100`}>
                Gratitude Journal
              </h1>
            </div>
            <p className="text-yellow-200/70 text-lg">A running list of things you're grateful for</p>
          </div>

          {/* Quick-add */}
          <div className="flex gap-2 mb-6">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }}
              placeholder="I'm grateful for…"
              className="flex-1 bg-slate-800/60 border-pink-600/30 text-pink-50 placeholder:text-slate-500"
            />
            <Button onClick={addEntry} className="bg-pink-600 hover:bg-pink-500 text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add
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
                className="pl-9 bg-slate-800/60 border-pink-600/30 text-pink-50 placeholder:text-slate-500"
              />
            </div>
          )}

          <p className="text-pink-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-pink-600/40">
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 text-pink-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-pink-100 mb-1">
                  {search.trim() ? "No matches" : "No gratitude entries yet"}
                </h3>
                <p className="text-pink-300/70 text-sm">
                  {search.trim() ? "Try a different search term." : "Add something you're grateful for above."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((e) => (
                <Card
                  key={e.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-pink-600/30 hover:border-pink-500/60 transition-colors group"
                >
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-pink-50 whitespace-pre-wrap">{e.text}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{fmtDate(e.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => setConfirmDeleteId(e.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </CardContent>
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
            className="bg-slate-900 border border-pink-600/40 text-pink-50 max-w-sm w-full"
            onClick={(ev) => ev.stopPropagation()}
          >
            <CardContent className="p-5">
              <p className="mb-4">Delete this gratitude entry?</p>
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
