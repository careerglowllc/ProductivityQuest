import { useState, useEffect } from "react";
import { Activity, CheckCircle2, XCircle, Clock, Target, AlertCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Constants ───────────────────────────────────────────────
const GOAL_HOURS = 4;
const GOAL_DAYS = 22;
const STORAGE_KEY = "cpap-log-v1";

// Tracking period: May 29 2026 → Jun 27 2026 (30 days)
// Goal: 22 qualifying nights (≥4h) in the first 30 days — insurance compliance window
// Use local-time constructor to avoid UTC offset shifting dates (e.g. PST = UTC-7)
const PERIOD_START = new Date(2026, 4, 29); // May 29 2026 local midnight
const PERIOD_DAYS = 30;

function getDayKey(date: Date) {
  // Use local date parts to avoid UTC offset shifting the date string
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayLabel(offset: number) {
  const d = new Date(PERIOD_START);
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isToday(d: Date) {
  return getDayKey(d) === getDayKey(new Date());
}

function isPast(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  return dd < today;
}

// ── Types ────────────────────────────────────────────────────
type DayLog = {
  hours: string; // free-form input, e.g. "5.5" or "4h30m"
  note?: string;
};

type LogMap = Record<string, DayLog>; // key = "YYYY-MM-DD"

// Parse hour string → decimal hours (supports "4h30m", "4.5", "4:30", "270" (minutes), plain numbers)
function parseHours(raw: string): number | null {
  if (!raw.trim()) return null;
  // "Xh Ym" or "XhYm"
  const hm = raw.match(/^(\d+(?:\.\d+)?)h\s*(\d+)m?$/i);
  if (hm) return parseFloat(hm[1]) + parseInt(hm[2]) / 60;
  // "X:YY"
  const colon = raw.match(/^(\d+):(\d{1,2})$/);
  if (colon) return parseInt(colon[1]) + parseInt(colon[2]) / 60;
  // plain decimal / integer
  const plain = parseFloat(raw);
  if (!isNaN(plain)) return plain;
  return null;
}

function formatHoursDisplay(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// ── UTC-key migration ─────────────────────────────────────────
// Before commit 7e25f22, getDayKey used toISOString() (UTC). In PST (UTC-7),
// entries saved in the evening could be keyed one day ahead (e.g. 10pm May 29 →
// stored as "2026-05-30"). This migration shifts those keys back by 1 day so
// the entries are visible again under the correct local-date keys.
function migrateUtcKeys(raw: LogMap): LogMap {
  const MIGRATION_KEY = "cpap-utc-migration-v1";
  if (localStorage.getItem(MIGRATION_KEY)) return raw;

  // Build set of valid period keys (local dates)
  const validKeys = new Set<string>();
  for (let i = 0; i < PERIOD_DAYS; i++) {
    const d = new Date(PERIOD_START);
    d.setDate(d.getDate() + i);
    validKeys.add(getDayKey(d));
  }

  const migrated = { ...raw };
  let changed = false;

  for (const key of Object.keys(raw)) {
    // If this key doesn't belong to any valid period date, it's likely a UTC-shifted key.
    // Try shifting it back 1 day to recover the intended local date.
    if (!validKeys.has(key)) {
      const parts = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (parts) {
        const d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
        d.setDate(d.getDate() - 1); // shift back one day
        const corrected = getDayKey(d);
        if (validKeys.has(corrected) && !migrated[corrected]) {
          migrated[corrected] = raw[key];
          delete migrated[key];
          changed = true;
        }
      }
    }
  }

  if (changed) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch {}
  }
  try { localStorage.setItem(MIGRATION_KEY, "1"); } catch {}
  return migrated;
}

// ── Component ────────────────────────────────────────────────
export default function CPAPPage() {
  const [log, setLog] = useState<LogMap>(() => {
    try {
      const raw: LogMap = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return migrateUtcKeys(raw);
    } catch { return {}; }
  });
  const [editing, setEditing] = useState<string | null>(null); // day key being edited
  const [inputVal, setInputVal] = useState("");
  const [noteVal, setNoteVal] = useState("");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
  }, [log]);

  // Compute stats
  const days = Array.from({ length: PERIOD_DAYS }, (_, i) => getDayLabel(i));
  const loggedDays = days.filter(d => {
    const entry = log[getDayKey(d)];
    if (!entry) return false;
    const h = parseHours(entry.hours);
    return h !== null && h >= GOAL_HOURS;
  });
  const qualifyingDays = loggedDays.length;
  const totalHours = days.reduce((sum, d) => {
    const entry = log[getDayKey(d)];
    if (!entry) return sum;
    const h = parseHours(entry.hours);
    return sum + (h ?? 0);
  }, 0);
  const daysLogged = days.filter(d => log[getDayKey(d)]?.hours).length;
  const progressPct = Math.min(100, (qualifyingDays / GOAL_DAYS) * 100);
  const goalMet = qualifyingDays >= GOAL_DAYS;

  // Days remaining (future days including today)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endDate = new Date(PERIOD_START); endDate.setDate(endDate.getDate() + PERIOD_DAYS - 1);
  const daysLeft = days.filter(d => { const dd = new Date(d); dd.setHours(0,0,0,0); return dd >= today; }).length;
  const daysNeededStill = Math.max(0, GOAL_DAYS - qualifyingDays);

  // Skip budget: total allowed misses = 30 - 22 = 8
  const SKIPS_ALLOWED = PERIOD_DAYS - GOAL_DAYS;
  const strictlyPastDays = days.filter(d => isPast(d)); // days strictly before today
  const skipsUsed = strictlyPastDays.filter(d => getDayStatus(d) !== "qualifying").length;
  const skipsRemaining = Math.max(0, SKIPS_ALLOWED - skipsUsed);

  function openEdit(key: string) {
    setEditing(key);
    setInputVal(log[key]?.hours || "");
    setNoteVal(log[key]?.note || "");
  }

  function saveEdit(key: string) {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      // Clear entry
      setLog(prev => { const next = { ...prev }; delete next[key]; return next; });
    } else {
      setLog(prev => ({ ...prev, [key]: { hours: trimmed, note: noteVal.trim() || undefined } }));
    }
    setEditing(null);
  }

  function getDayStatus(d: Date): "qualifying" | "partial" | "empty" | "future" {
    const key = getDayKey(d);
    const entry = log[key];
    if (!entry?.hours) return isPast(d) || isToday(d) ? "empty" : "future";
    const h = parseHours(entry.hours);
    if (h === null) return "empty";
    return h >= GOAL_HOURS ? "qualifying" : "partial";
  }

  function exportCSV() {
    const rows: string[] = [
      ["Day #", "Date", "Day of Week", "Hours Logged (raw)", "Hours (decimal)", "Hours (formatted)", "Qualifies (≥4h)", "Status", "Notes"].join(","),
    ];
    days.forEach((d, i) => {
      const key = getDayKey(d);
      const entry = log[key];
      const rawHours = entry?.hours || "";
      const h = rawHours ? parseHours(rawHours) : null;
      const hDecimal = h !== null ? h.toFixed(2) : "";
      const hFormatted = h !== null ? formatHoursDisplay(h) : "";
      const qualifies = h !== null ? (h >= GOAL_HOURS ? "Yes" : "No") : "";
      const status = getDayStatus(d);
      const statusLabel = status === "qualifying" ? "Qualifying" : status === "partial" ? "Partial" : status === "future" ? "Future" : "Not Logged";
      const note = (entry?.note || "").replace(/,/g, ";").replace(/\n/g, " ");
      rows.push([
        i + 1,
        key,
        d.toLocaleDateString("en-US", { weekday: "long" }),
        rawHours,
        hDecimal,
        hFormatted,
        qualifies,
        statusLabel,
        `"${note}"`,
      ].join(","));
    });

    // Summary footer
    rows.push("");
    rows.push(["Summary", "", "", "", "", "", "", "", ""].join(","));
    rows.push(["Qualifying Days", qualifyingDays, "", "", "", "", "", "", ""].join(","));
    rows.push(["Goal", GOAL_DAYS, "", "", "", "", "", "", ""].join(","));
    rows.push(["Goal Met", goalMet ? "Yes" : "No", "", "", "", "", "", "", ""].join(","));
    rows.push(["Total Hours", totalHours.toFixed(2), "", "", "", "", "", "", ""].join(","));
    rows.push(["Days Logged", daysLogged, "", "", "", "", "", "", ""].join(","));
    rows.push(["Period", "May 29 – Jun 27 2026 (30 days)", "", "", "", "", "", "", ""].join(","));

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpap-log-${getDayKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">CPAP Compliance Tracker</h1>
            <p className="text-slate-400 text-sm">Goal: ≥{GOAL_HOURS}h/night · {GOAL_DAYS} qualifying days · May 29 – Jun 27, 2026</p>
          </div>
          {goalMet && (
            <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/40 text-sm px-3 py-1">
              🎉 Goal Met!
            </Badge>
          )}
          <button
            onClick={exportCSV}
            className={`${goalMet ? "" : "ml-auto"} flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/60 hover:bg-slate-600/60 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-sm font-medium transition-all`}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-800/60 border-cyan-500/20">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-3xl font-bold text-cyan-300">{qualifyingDays}</p>
              <p className="text-xs text-slate-400 mt-1">Qualifying Days</p>
              <p className="text-[10px] text-slate-500">of {GOAL_DAYS} needed</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-green-500/20">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-3xl font-bold text-green-300">{totalHours > 0 ? formatHoursDisplay(totalHours) : "—"}</p>
              <p className="text-xs text-slate-400 mt-1">Total Hours</p>
              <p className="text-[10px] text-slate-500">{daysLogged} days logged</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-yellow-500/20">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-3xl font-bold text-yellow-300">{daysNeededStill}</p>
              <p className="text-xs text-slate-400 mt-1">Days Still Needed</p>
              <p className="text-[10px] text-slate-500">{daysLeft} days left</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-purple-500/20">
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-3xl font-bold text-purple-300">{progressPct.toFixed(0)}%</p>
              <p className="text-xs text-slate-400 mt-1">Progress</p>
              <p className="text-[10px] text-slate-500">toward {GOAL_DAYS}-day goal</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <Card className="bg-slate-800/60 border-cyan-500/20">
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 font-medium">Compliance Progress</span>
              <span className="text-sm font-bold text-cyan-300">{qualifyingDays} / {GOAL_DAYS} qualifying days</span>
            </div>
            <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${goalMet ? "bg-green-500" : "bg-cyan-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {!goalMet && daysLeft > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">
                Need <span className="text-yellow-300 font-semibold">{daysNeededStill}</span> more qualifying nights in the next <span className="text-cyan-300 font-semibold">{daysLeft}</span> days
                {daysNeededStill <= daysLeft
                  ? " — on track ✓"
                  : " — ⚠️ behind pace"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Skip Budget */}
        <Card className={`bg-slate-800/60 ${skipsRemaining === 0 ? "border-red-500/50" : skipsRemaining <= 2 ? "border-red-500/30" : skipsRemaining <= 4 ? "border-yellow-500/30" : "border-green-500/20"}`}>
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 font-medium">⛔ Skip Budget</span>
              <span className={`text-sm font-bold ${skipsRemaining === 0 ? "text-red-400" : skipsRemaining <= 2 ? "text-red-400" : skipsRemaining <= 4 ? "text-yellow-400" : "text-green-400"}`}>
                {skipsRemaining} skip{skipsRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${skipsRemaining === 0 ? "bg-red-600" : skipsRemaining <= 2 ? "bg-red-500" : skipsRemaining <= 4 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${(skipsRemaining / SKIPS_ALLOWED) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              <span className="text-slate-300 font-medium">{skipsUsed}</span> of <span className="text-slate-300 font-medium">{SKIPS_ALLOWED}</span> allowed skips used
              {" · "}
              {skipsRemaining === 0
                ? <span className="text-red-400 font-semibold">⛔ No skips left — must qualify every remaining night!</span>
                : skipsRemaining <= 2
                ? <span className="text-red-400 font-semibold">⚠️ Nearly out — use remaining skips carefully</span>
                : skipsRemaining <= 4
                ? <span className="text-yellow-400">Use cautiously — {skipsRemaining} day{skipsRemaining !== 1 ? "s" : ""} left to miss</span>
                : <span className="text-green-400">{skipsRemaining} day{skipsRemaining !== 1 ? "s" : ""} you can still miss</span>
              }
            </p>
          </CardContent>
        </Card>

        {/* Day grid */}
        <Card className="bg-slate-800/60 border-slate-700/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" /> Daily Log
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Click any day to enter your CPAP usage. Enter hours as: <code className="bg-slate-700 px-1 rounded text-cyan-300">5.5</code> · <code className="bg-slate-700 px-1 rounded text-cyan-300">4h30m</code> · <code className="bg-slate-700 px-1 rounded text-cyan-300">4:30</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {days.map((d, i) => {
                const key = getDayKey(d);
                const status = getDayStatus(d);
                const entry = log[key];
                const h = entry?.hours ? parseHours(entry.hours) : null;
                const today_ = isToday(d);
                const future = status === "future";
                const isEditing = editing === key;

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 transition-all cursor-pointer select-none
                      ${today_ ? "ring-2 ring-cyan-400/60" : ""}
                      ${status === "qualifying" ? "border-green-500/40 bg-green-500/5 hover:bg-green-500/10" : ""}
                      ${status === "partial" ? "border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10" : ""}
                      ${status === "empty" && !today_ ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/8" : ""}
                      ${status === "empty" && today_ ? "border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10" : ""}
                      ${future ? "border-slate-700/40 bg-slate-800/30 hover:bg-slate-700/30" : ""}
                    `}
                    onClick={() => !isEditing && openEdit(key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-semibold ${today_ ? "text-cyan-300" : future ? "text-slate-500" : "text-slate-300"}`}>
                          Day {i + 1} {today_ && <span className="text-cyan-400">· Today</span>}
                        </p>
                        <p className={`text-[11px] ${future ? "text-slate-600" : "text-slate-400"}`}>{formatDate(d)}</p>
                      </div>
                      <div className="shrink-0">
                        {status === "qualifying" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                        {status === "partial" && <AlertCircle className="h-4 w-4 text-yellow-400" />}
                        {status === "empty" && !future && <XCircle className="h-4 w-4 text-red-400/60" />}
                        {future && !today_ && <Clock className="h-4 w-4 text-slate-600" />}
                      </div>
                    </div>

                    {/* Inline edit */}
                    {isEditing ? (
                      <div
                        className="mt-2 space-y-1.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={inputVal}
                          onChange={e => setInputVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(key); if (e.key === "Escape") setEditing(null); }}
                          placeholder="e.g. 5.5 or 4h30m"
                          className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <input
                          type="text"
                          value={noteVal}
                          onChange={e => setNoteVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(key); if (e.key === "Escape") setEditing(null); }}
                          placeholder="Optional note"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(key)}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg py-1 font-semibold transition-colors"
                          >Save</button>
                          <button
                            onClick={() => setEditing(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg py-1 transition-colors"
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      entry?.hours && (
                        <div className="mt-1.5">
                          <p className={`text-sm font-bold ${h !== null && h >= GOAL_HOURS ? "text-green-300" : "text-yellow-300"}`}>
                            {h !== null ? formatHoursDisplay(h) : entry.hours}
                            {h !== null && h >= GOAL_HOURS && <span className="text-green-500/70 text-[10px] font-normal ml-1">✓ qualifies</span>}
                            {h !== null && h < GOAL_HOURS && <span className="text-yellow-500/70 text-[10px] font-normal ml-1">need {formatHoursDisplay(GOAL_HOURS - h)} more</span>}
                          </p>
                          {entry.note && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{entry.note}</p>}
                        </div>
                      )
                    )}

                    {!isEditing && !entry?.hours && !future && (
                      <p className="text-[10px] text-slate-500 mt-1.5">Tap to log usage</p>
                    )}
                    {!isEditing && !entry?.hours && future && (
                      <p className="text-[10px] text-slate-600 mt-1.5">Upcoming</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400 px-1">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Qualifying (≥{GOAL_HOURS}h)</div>
          <div className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-yellow-400" /> Partial (&lt;{GOAL_HOURS}h)</div>
          <div className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-red-400/60" /> Not logged</div>
          <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> Future</div>
        </div>
      </div>
    </div>
  );
}
