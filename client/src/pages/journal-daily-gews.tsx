import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HeartHandshake, ArrowLeft, Plus, Pencil, Trash2, X, Sunrise, Trophy, Sparkle, CloudRain } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-daily-gews-v1";

type GewsCategory = "gratitudes" | "wins" | "exciteds" | "sadnesses";

type GewsEntry = {
  date: string; // YYYY-MM-DD
  gratitudes: string[];
  wins: string[];
  exciteds: string[];
  sadnesses: string[];
  updatedAt: string;
};

const CATEGORY_META: Record<GewsCategory, { label: string; icon: typeof Sunrise; color: string; placeholder: string }> = {
  gratitudes: { label: "Gratitudes", icon: Sunrise, color: "#FBBF24", placeholder: "Something you're grateful for…" },
  wins: { label: "Wins", icon: Trophy, color: "#34D399", placeholder: "Something that went well…" },
  exciteds: { label: "Exciteds", icon: Sparkle, color: "#60A5FA", placeholder: "Something you're excited about…" },
  sadnesses: { label: "Sadnesses", icon: CloudRain, color: "#F87171", placeholder: "Something that's weighing on you…" },
};
const CATEGORY_ORDER: GewsCategory[] = ["gratitudes", "wins", "exciteds", "sadnesses"];

function todayStr(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function emptyEntry(date: string): GewsEntry {
  return { date, gratitudes: [], wins: [], exciteds: [], sadnesses: [], updatedAt: "" };
}

function fmtDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function loadEntries(): GewsEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export default function JournalDailyGewsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<GewsEntry[]>(loadEntries);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [form, setForm] = useState<GewsEntry>(emptyEntry(todayStr()));
  const [drafts, setDrafts] = useState<Record<GewsCategory, string>>({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  function persist(next: GewsEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const sortedDesc = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  function openAdd() {
    setForm(emptyEntry(todayStr()));
    setDrafts({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
    setOriginalDate(null);
    setDialogOpen(true);
  }

  function openEdit(e: GewsEntry) {
    setForm({ ...e });
    setDrafts({ gratitudes: "", wins: "", exciteds: "", sadnesses: "" });
    setOriginalDate(e.date);
    setDialogOpen(true);
  }

  function addItem(cat: GewsCategory) {
    const val = drafts[cat].trim();
    if (!val) return;
    setForm({ ...form, [cat]: [...form[cat], val] });
    setDrafts({ ...drafts, [cat]: "" });
  }

  function removeItem(cat: GewsCategory, idx: number) {
    setForm({ ...form, [cat]: form[cat].filter((_, i) => i !== idx) });
  }

  function save() {
    if (!form.date) return;
    const now = new Date().toISOString();
    const withoutOld = originalDate ? entries.filter((e) => e.date !== originalDate) : entries;
    const withoutSameDate = withoutOld.filter((e) => e.date !== form.date);
    persist([{ ...form, updatedAt: now }, ...withoutSameDate]);
    setDialogOpen(false);
    setOriginalDate(null);
  }

  function remove(date: string) {
    persist(entries.filter((e) => e.date !== date));
    setConfirmDeleteDate(null);
  }

  const totalItems = (e: GewsEntry) => e.gratitudes.length + e.wins.length + e.exciteds.length + e.sadnesses.length;

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
              <HeartHandshake className="h-10 w-10 text-amber-400" />
              <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-yellow-100`}>Daily GEWS</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Gratitudes · Wins · Exciteds · Sadnesses — one entry per day</p>
          </div>

          <div className="flex justify-center mb-6">
            <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold">
              <Plus className="h-4 w-4 mr-1.5" /> New Entry
            </Button>
          </div>

          <p className="text-amber-300/60 text-sm mb-3">
            {sortedDesc.length} {sortedDesc.length === 1 ? "day" : "days"} logged
          </p>

          {/* List */}
          {sortedDesc.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-amber-600/40">
              <CardContent className="p-12 text-center">
                <HeartHandshake className="h-16 w-16 text-amber-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-100 mb-1">No entries yet</h3>
                <p className="text-amber-300/70 text-sm mb-5">Log today's gratitudes, wins, exciteds and sadnesses.</p>
                <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> New Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedDesc.map((e) => (
                <Card
                  key={e.date}
                  className="bg-slate-800/60 backdrop-blur-md border border-amber-600/30 hover:border-amber-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(e)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-amber-50 font-semibold font-serif">{fmtDateFull(e.date)}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteDate(e.date); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {CATEGORY_ORDER.map((cat) => {
                        const meta = CATEGORY_META[cat];
                        const Icon = meta.icon;
                        return (
                          <div key={cat} className="flex items-center gap-1.5 text-slate-400">
                            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                            <span>{meta.label} ({e[cat].length})</span>
                          </div>
                        );
                      })}
                    </div>
                    {totalItems(e) === 0 && (
                      <p className="mt-2 text-xs text-slate-500 italic">Empty entry — click to add.</p>
                    )}
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
              <HeartHandshake className="h-5 w-5 text-amber-400" />
              {originalDate ? "Edit Daily GEWS Entry" : "New Daily GEWS Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gews-date">Date</Label>
              <Input
                id="gews-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-slate-800/60 border-amber-600/30 text-amber-50 max-w-[200px]"
              />
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="space-y-2 border-t border-slate-700/40 pt-3">
                  <Label className="flex items-center gap-1.5" style={{ color: meta.color }}>
                    <Icon className="h-4 w-4" /> {meta.label}
                  </Label>
                  {form[cat].length > 0 && (
                    <ul className="space-y-1">
                      {form[cat].map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2 bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-1.5 text-sm text-slate-200">
                          <span className="flex-1">{item}</span>
                          <button onClick={() => removeItem(cat, idx)} className="text-slate-500 hover:text-red-400 shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={drafts[cat]}
                      onChange={(e) => setDrafts({ ...drafts, [cat]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(cat); } }}
                      placeholder={meta.placeholder}
                      className="bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500"
                    />
                    <Button type="button" variant="outline" onClick={() => addItem(cat)} className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white" disabled={!form.date}>
              {originalDate ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteDate} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="bg-slate-900 border border-amber-600/40 text-amber-50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            {confirmDeleteDate && `This will remove the Daily GEWS entry for ${fmtDateFull(confirmDeleteDate)}.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteDate && remove(confirmDeleteDate)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
