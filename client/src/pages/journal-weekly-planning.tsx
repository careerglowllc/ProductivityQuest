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
import { ClipboardList, ArrowLeft, Plus, Pencil, Trash2, Download, Search, Undo2, Redo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { useSwipeDownToClose } from "@/hooks/use-swipe-down-to-close";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-weekly-planning-v1";

type WeeklyPlan = {
  id: string;
  date: string; // YYYY-MM-DD — the week this plan covers
  description: string; // thoughts & reflections
  attachments?: QuestAttachment[];
  createdAt: string;
  updatedAt: string;
};

function todayStr(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function emptyPlan(date: string): WeeklyPlan {
  return { id: "", date, description: "", createdAt: "", updatedAt: "" };
}

function newId() {
  return `weekly-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadPlans(): WeeklyPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
export function buildWeeklyPlanningCSVExport(): CSVExport {
  const plans = loadPlans();
  const headers = ["Week Of", "Reflections", "Last Updated"];
  const rows = [...plans]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [fmtDateFull(p.date), p.description, fmtDate(p.updatedAt)]);
  return { folder: "Journal", filename: "weekly-deep-planning.csv", content: rowsToCSV(headers, rows) };
}

export default function JournalWeeklyPlanningPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const { toast, dismiss } = useToast();
  const [plans, setPlans] = useState<WeeklyPlan[]>(loadPlans);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [form, setForm] = useState<WeeklyPlan>(emptyPlan(todayStr()));
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);
  const { swipeCallbackRef, style: swipeStyle } = useSwipeDownToClose(dialogOpen, setDialogOpen, isMobile);

  // Pick up plans added on another device (e.g. mobile) without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setPlans(loadPlans())), []);

  function persist(next: WeeklyPlan[]) {
    setPlans(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // Snapshot the current list before a mutation so it can be restored via the Undo button/toast,
  // and re-applied via the Redo button if that undo is triggered.
  function persistWithUndo(next: WeeklyPlan[], label: string) {
    const previous = plans;
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

  const filtered = plans
    .filter((p) => (search.trim() ? p.description.toLowerCase().includes(search.trim().toLowerCase()) : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  function openAdd() {
    // If today already has a plan, open it for editing instead of a blank form —
    // otherwise saving would silently wipe out whatever was already written today.
    const today = todayStr();
    const existing = plans.find((p) => p.date === today);
    if (existing) {
      openEdit(existing);
      return;
    }
    setForm(emptyPlan(today));
    setOriginalDate(null);
    setDialogOpen(true);
  }

  function openEdit(p: WeeklyPlan) {
    setForm({ ...p });
    setOriginalDate(p.date);
    setDialogOpen(true);
  }

  function save() {
    if (!form.date) return;
    const now = new Date().toISOString();
    const withoutOld = originalDate ? plans.filter((p) => p.date !== originalDate) : plans;
    const withoutSameDate = withoutOld.filter((p) => p.date !== form.date);
    const undo = persistWithUndo(
      [{ ...form, id: form.id || newId(), createdAt: form.createdAt || now, updatedAt: now }, ...withoutSameDate],
      `${originalDate ? "Edited" : "Added"} weekly plan for ${fmtDateFull(form.date)}`,
    );
    setDialogOpen(false);
    setOriginalDate(null);
    toast({
      title: "Changes saved",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function remove(date: string) {
    const undo = persistWithUndo(plans.filter((p) => p.date !== date), `Deleted weekly plan for ${fmtDateFull(date)}`);
    setConfirmDeleteDate(null);
    toast({
      title: "Entry deleted",
      duration: 5000,
      action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction>,
    });
  }

  function handleExport() {
    const { filename, content } = buildWeeklyPlanningCSVExport();
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
              <ClipboardList className="h-10 w-10 text-amber-400" />
              <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-yellow-100`}>Weekly Deep Planning</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">One deep-dive reflection &amp; plan per week</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reflections…"
                className="pl-9 bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500"
              />
            </div>
            <Button onClick={openAdd} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> New Entry
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={plans.length === 0}
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
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>

          {/* List */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-amber-600/40">
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-16 w-16 text-amber-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-amber-100 mb-1">
                  {search.trim() ? "No matches" : "No weekly plans yet"}
                </h3>
                <p className="text-amber-300/70 text-sm mb-5">
                  {search.trim() ? "Try a different search term." : "Start this week's deep planning session."}
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
              {filtered.map((p) => (
                <Card
                  key={p.date}
                  className="bg-slate-800/60 backdrop-blur-md border border-amber-600/30 hover:border-amber-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-amber-50 font-semibold font-serif">{fmtDateFull(p.date)}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(p); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteDate(p.date); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-400 whitespace-pre-wrap">
                      {p.description || "No reflections yet — click to add some…"}
                    </p>
                    {p.attachments && p.attachments.length > 0 && (
                      <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                        <AttachmentArea attachments={p.attachments} onChange={() => {}} disabled showHint={false}>
                          {null}
                        </AttachmentArea>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-500">Updated {fmtDate(p.updatedAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

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
              <ClipboardList className="h-5 w-5 text-amber-400" />
              {originalDate ? "Edit Weekly Plan" : "New Weekly Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="weekly-plan-date">Date</Label>
              <Input
                id="weekly-plan-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-slate-800/60 border-amber-600/30 text-amber-50 max-w-[200px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weekly-plan-description">Thoughts &amp; Reflections</Label>
              <AttachmentArea
                attachments={form.attachments || []}
                onChange={(next) => setForm({ ...form, attachments: next })}
              >
                <Textarea
                  id="weekly-plan-description"
                  rows={10}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What went well this week? What's the plan for next week? Deep-dive on goals, priorities, and lessons learned…"
                  className="bg-slate-800/60 border-amber-600/30 text-amber-50 placeholder:text-slate-500 pr-10"
                />
              </AttachmentArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-500 text-white" disabled={!form.date}>
              {originalDate ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteDate} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="bg-slate-900 border border-amber-600/40 text-amber-50 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            {confirmDeleteDate && `This will remove the weekly plan for ${fmtDateFull(confirmDeleteDate)}.`}
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
