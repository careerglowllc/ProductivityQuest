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
import { ClipboardList, Plus, Pencil, Trash2, Download, Search, Undo2, Redo2 } from "lucide-react";
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
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="One deep-dive session a week"
        title="Weekly planning,"
        emphasis="done deeply."
        copy="Step back once a week to reflect on what happened and plan what's next, with real intention."
        statValue={`${plans.length} ${plans.length === 1 ? "week" : "weeks"}`}
        statLabel="planned so far"
      />
      <RelatedJournalNav />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reflections…"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
        <Button onClick={openAdd} className="shrink-0 bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
          <Plus className="mr-1.5 h-4 w-4" /> New entry
        </Button>
        <Button
          onClick={handleExport}
          variant="outline"
          disabled={plans.length === 0}
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
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        {search.trim() && ` matching "${search.trim()}"`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <ClipboardList aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-sage)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "No matches" : "No weekly plans yet"}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try a different search term." : "Start this week's deep planning session."}
          </p>
          {!search.trim() && (
            <Button onClick={openAdd} className="mt-4 bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]">
              <Plus className="mr-1.5 h-4 w-4" /> New entry
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <article
              key={p.date}
              className="group cursor-pointer rounded-lg border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)]"
              onClick={() => openEdit(p)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="jrnl-display text-[19px] text-[var(--jrnl-ink)]">{fmtDateFull(p.date)}</h3>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); openEdit(p); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteDate(p.date); }}
                    className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--jrnl-muted)]">
                {p.description || "No reflections yet — click to add some…"}
              </p>
              {p.attachments && p.attachments.length > 0 && (
                <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                  <AttachmentArea attachments={p.attachments} onChange={() => {}} disabled showHint={false}>
                    {null}
                  </AttachmentArea>
                </div>
              )}
              <p className="mt-2 text-[11px] text-[var(--jrnl-muted)]">Updated {fmtDate(p.updatedAt)}</p>
            </article>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={swipeStyle} className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <div ref={isMobile ? swipeCallbackRef : undefined} className="contents">
          {isMobile && (
            <div className="flex justify-center pb-2 -mt-1">
              <div className="w-12 h-1.5 rounded-full bg-[var(--jrnl-line)]" />
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="jrnl-display text-xl text-[var(--jrnl-ink)] flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[var(--jrnl-rose)]" />
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
                className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] max-w-[200px]"
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
                  className="bg-[var(--jrnl-paper-2)] border-[var(--jrnl-line)] text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)] pr-10"
                />
              </AttachmentArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[var(--jrnl-sage)] hover:bg-[var(--jrnl-sage-deep)] text-white" disabled={!form.date}>
              {originalDate ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteDate} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="bg-[var(--jrnl-paper)] border border-[var(--jrnl-line)] text-[var(--jrnl-ink)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--jrnl-muted)]">
            {confirmDeleteDate && `This will remove the weekly plan for ${fmtDateFull(confirmDeleteDate)}.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteDate && remove(confirmDeleteDate)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </JournalShell>
  );
}
