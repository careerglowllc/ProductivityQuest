import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { Weight, ArrowLeft, TrendingUp, ListChecks, CalendarDays, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  type BodyWeightEntry,
  loadBodyWeightLog,
  upsertBodyWeightEntry,
  deleteBodyWeightEntry,
  loadCalorieLog,
  ensureCalorieLogSeeded,
  type CalorieDayLog,
} from "@/lib/calorie-log";

// ─────────────────────────────────────────────────────────────────────────────
// Body Weight Log
// Persisted under the synced "workout-" localStorage prefix (see
// client/src/lib/calorie-log.ts + client/src/lib/synced-storage.ts). Mirrors
// the Calorie Log dashboard's layout, with an optional overlay to compare
// weight trend against calorie intake.
// ─────────────────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

const EMPTY_FORM = { date: todayStr(), weightLb: "", notes: "" };

export default function FitnessWeightPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();
  const [log, setLog] = useState<BodyWeightEntry[]>(() => loadBodyWeightLog());
  const [calorieEntries] = useState<CalorieDayLog[]>(() => {
    ensureCalorieLogSeeded();
    return loadCalorieLog();
  });
  const [showCalorieOverlay, setShowCalorieOverlay] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  function openAdd() {
    setForm({ ...EMPTY_FORM, date: todayStr() });
    setEditingDate(null);
    setDialogOpen(true);
  }

  function openEdit(e: BodyWeightEntry) {
    setForm({ date: e.date, weightLb: String(e.weightLb), notes: e.notes ?? "" });
    setEditingDate(e.date);
    setDialogOpen(true);
  }

  function handleSave() {
    const weightLb = parseFloat(form.weightLb);
    if (!form.date || !Number.isFinite(weightLb) || weightLb <= 0) return;
    // Editing a different date than originally opened (manual override) — drop the old entry first
    if (editingDate && editingDate !== form.date) {
      deleteBodyWeightEntry(editingDate);
    }
    const next = upsertBodyWeightEntry({ date: form.date, weightLb, notes: form.notes.trim() || undefined });
    setLog(next);
    setDialogOpen(false);
  }

  function handleDelete(date: string) {
    setLog(deleteBodyWeightEntry(date));
    setConfirmDeleteDate(null);
  }

  const sortedLog = useMemo(() => [...log].sort((a, b) => a.date.localeCompare(b.date)), [log]);
  const tableSortedDesc = useMemo(() => [...sortedLog].sort((a, b) => b.date.localeCompare(a.date)), [sortedLog]);

  const caloriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of calorieEntries) map.set(c.date, c.calories);
    return map;
  }, [calorieEntries]);

  const chartData = useMemo(
    () =>
      sortedLog.map((e) => ({
        date: e.date,
        label: formatDateShort(e.date),
        weight: e.weightLb,
        calories: caloriesByDate.get(e.date) ?? null,
      })),
    [sortedLog, caloriesByDate]
  );

  const summary = useMemo(() => {
    const n = sortedLog.length;
    const first = sortedLog[0];
    const last = sortedLog[n - 1];
    const change = n >= 2 ? last.weightLb - first.weightLb : 0;
    const avg = n ? sortedLog.reduce((s, e) => s + e.weightLb, 0) / n : 0;
    return { days: n, first, last, change, avg };
  }, [sortedLog]);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-cyan-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : "pt-2"} pb-24 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-16 w-1 h-1 bg-cyan-200 rounded-full animate-pulse" />
        <div className="absolute top-32 right-24 w-1 h-1 bg-amber-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-56 left-1/3 w-1 h-1 bg-emerald-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className={`relative ${isMobile ? "max-w-5xl mx-auto px-4 pt-4" : "max-w-5xl mx-auto px-6 pt-10"}`}>
        <Link href="/fitness">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Fitness
          </a>
        </Link>

        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Weight className="h-7 w-7 text-cyan-400" />
            <h1 className={`${isMobile ? "text-2xl" : "text-4xl"} font-serif font-bold text-white tracking-wide`}>
              Weight Log
            </h1>
            <Weight className="h-7 w-7 text-cyan-400" />
          </div>
          <p className="text-slate-400 italic text-sm">Track body weight over time — compare against calorie intake</p>
        </div>

        <div className="flex justify-center mb-8">
          <Button onClick={openAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5">
            <Plus className="h-4 w-4" /> Log Weight
          </Button>
        </div>

        {/* Summary stat cards */}
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 mb-8`}>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{summary.days}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Days Logged</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-300">{summary.last ? `${summary.last.weightLb} lb` : "—"}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Latest Weight</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <p className="text-2xl font-bold text-amber-300">{summary.days ? `${summary.avg.toFixed(1)} lb` : "—"}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Average</p>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center">
            <p className={`text-2xl font-bold ${summary.change < 0 ? "text-emerald-300" : summary.change > 0 ? "text-red-300" : "text-violet-300"}`}>
              {summary.days >= 2 ? `${summary.change > 0 ? "+" : ""}${summary.change.toFixed(1)} lb` : "—"}
            </p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">Net Change</p>
          </div>
        </div>

        {/* Trend chart with calorie overlay */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 text-white font-bold">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Weight Trend
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
              <span
                className="flex items-center justify-center h-4 w-4 rounded border transition-colors"
                style={
                  showCalorieOverlay
                    ? { backgroundColor: "#F87171", borderColor: "#F87171" }
                    : { backgroundColor: "transparent", borderColor: "#475569" }
                }
                onClick={() => setShowCalorieOverlay((v) => !v)}
              >
                {showCalorieOverlay && <span className="text-[10px] leading-none text-slate-950 font-bold">✓</span>}
              </span>
              <input type="checkbox" className="sr-only" checked={showCalorieOverlay} onChange={() => setShowCalorieOverlay((v) => !v)} />
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors flex items-center gap-1">
                <Layers className="h-3 w-3 text-rose-400" /> Overlay Calories
              </span>
            </label>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: "100%", height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#94A3B8", fontSize: 11 }}
                    label={{ value: "Weight (lb)", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 11 }}
                    domain={["dataMin - 3", "dataMax + 3"]}
                  />
                  {showCalorieOverlay && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      label={{ value: "Calories (kcal)", angle: 90, position: "insideRight", fill: "#64748B", fontSize: 11 }}
                      domain={["dataMin - 200", "dataMax + 200"]}
                    />
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#E2E8F0" }}
                    formatter={(value: number, name: string) =>
                      name === "calories"
                        ? [value != null ? `${value.toLocaleString()} kcal` : "No log", "Calories"]
                        : [`${value} lb`, "Weight"]
                    }
                    labelFormatter={(_label, payload) => (payload && payload[0] ? formatDateFull(payload[0].payload.date) : "")}
                  />
                  {showCalorieOverlay && <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />}
                  <Line yAxisId="left" type="monotone" dataKey="weight" name="weight" stroke="#22D3EE" strokeWidth={2.5} dot={{ r: 3, fill: "#22D3EE" }} activeDot={{ r: 5 }} />
                  {showCalorieOverlay && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="calories"
                      name="calories"
                      stroke="#F87171"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={{ r: 2.5, fill: "#F87171" }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No weight entries logged yet. Tap "Log Weight" to add your first one.</p>
          )}
        </div>

        {/* Daily log table */}
        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <ListChecks className="h-4 w-4 text-cyan-400" />
            Daily Log
          </div>
          {tableSortedDesc.length > 0 ? (
            <div className="rounded-xl border border-slate-700/60 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date</span>
                    </th>
                    <th className="text-right px-3 py-2 font-medium">Weight</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Notes</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSortedDesc.map((e) => (
                    <tr key={e.date} className="border-t border-slate-800/80 hover:bg-slate-800/30 align-top">
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap font-medium">{formatDateShort(e.date)}</td>
                      <td className="px-3 py-2 text-right text-cyan-300 font-semibold">{e.weightLb} lb</td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell max-w-md">{e.notes}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-cyan-300">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteDate(e.date)} className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 border border-slate-700/40 rounded-xl">No entries yet.</p>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-10">
          Enable "Overlay Calories" on the chart to see your weight trend side-by-side with logged daily calories.
        </p>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDate ? "Edit Weight Entry" : "Log Weight"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="weight-date">Date</Label>
              <Input id="weight-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight-lb">Weight (lb)</Label>
              <Input id="weight-lb" type="number" step="0.1" min="0" placeholder="e.g. 182.4" value={form.weightLb}
                onChange={(e) => setForm({ ...form, weightLb: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight-notes">Notes (optional)</Label>
              <Textarea id="weight-notes" rows={2} placeholder="Morning weigh-in, after workout, etc." value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white" disabled={!form.date || !form.weightLb}>
              {editingDate ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDeleteDate} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            {confirmDeleteDate && `This will remove the weight entry for ${formatDateFull(confirmDeleteDate)}.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteDate && handleDelete(confirmDeleteDate)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
