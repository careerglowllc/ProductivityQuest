import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Link } from "wouter";
import { ArrowLeft, Edit2, X, Plus, Trash2, Check, Map as MapIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { rowsToCSV, downloadCSV, type CSVExport } from "@/lib/csv-export";

// Same us-atlas source + FIPS→ISO table used by the Countries Visited world map, so a
// state marked visited here shows up there too (and vice versa) — both pages read/write
// the identical "country-US-XX" keys via /api/user-data.
const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// us-atlas FIPS → ISO for all 50 US states (+ DC). Alaska and Hawaii keep their legacy
// keys (ALA/HAW) to match the storage keys already used on the Countries Visited page.
const US_FIPS_TO_ISO: Record<string, string> = {
  "01": "US-AL", "02": "ALA",  "04": "US-AZ", "05": "US-AR", "06": "US-CA",
  "08": "US-CO", "09": "US-CT", "10": "US-DE", "11": "US-DC", "12": "US-FL",
  "13": "US-GA", "15": "HAW",  "16": "US-ID", "17": "US-IL", "18": "US-IN",
  "19": "US-IA", "20": "US-KS", "21": "US-KY", "22": "US-LA", "23": "US-ME",
  "24": "US-MD", "25": "US-MA", "26": "US-MI", "27": "US-MN", "28": "US-MS",
  "29": "US-MO", "30": "US-MT", "31": "US-NE", "32": "US-NV", "33": "US-NH",
  "34": "US-NJ", "35": "US-NM", "36": "US-NY", "37": "US-NC", "38": "US-ND",
  "39": "US-OH", "40": "US-OK", "41": "US-OR", "42": "US-PA", "44": "US-RI",
  "45": "US-SC", "46": "US-SD", "47": "US-TN", "48": "US-TX", "49": "US-UT",
  "50": "US-VT", "51": "US-VA", "53": "US-WA", "54": "US-WV", "55": "US-WI",
  "56": "US-WY",
};

const STATE_NAMES: Record<string, string> = {
  "US-AL": "Alabama", "US-AZ": "Arizona", "US-AR": "Arkansas", "US-CA": "California",
  "US-CO": "Colorado", "US-CT": "Connecticut", "US-DE": "Delaware", "US-DC": "Washington D.C.",
  "US-FL": "Florida", "US-GA": "Georgia", "US-ID": "Idaho", "US-IL": "Illinois",
  "US-IN": "Indiana", "US-IA": "Iowa", "US-KS": "Kansas", "US-KY": "Kentucky",
  "US-LA": "Louisiana", "US-ME": "Maine", "US-MD": "Maryland", "US-MA": "Massachusetts",
  "US-MI": "Michigan", "US-MN": "Minnesota", "US-MS": "Mississippi", "US-MO": "Missouri",
  "US-MT": "Montana", "US-NE": "Nebraska", "US-NV": "Nevada", "US-NH": "New Hampshire",
  "US-NJ": "New Jersey", "US-NM": "New Mexico", "US-NY": "New York", "US-NC": "North Carolina",
  "US-ND": "North Dakota", "US-OH": "Ohio", "US-OK": "Oklahoma", "US-OR": "Oregon",
  "US-PA": "Pennsylvania", "US-RI": "Rhode Island", "US-SC": "South Carolina", "US-SD": "South Dakota",
  "US-TN": "Tennessee", "US-TX": "Texas", "US-UT": "Utah", "US-VT": "Vermont",
  "US-VA": "Virginia", "US-WA": "Washington", "US-WV": "West Virginia",
  "US-WI": "Wisconsin", "US-WY": "Wyoming",
  HAW: "Hawaii 🌺", ALA: "Alaska ❄️",
};

const ALL_STATE_ISOS = Object.values(US_FIPS_TO_ISO);

interface StateEntry {
  visitedAt: string;
  cities: string[];
  highlights: string[];
  lowlights: string[];
  lessons: string[];
}

type EditForm = StateEntry & { name: string; iso: string };

const EMPTY_ENTRY = (): StateEntry => ({
  visitedAt: "", cities: [], highlights: [], lowlights: [], lessons: [],
});

const ensure = (arr?: string[]) => (arr && arr.length ? arr : [""]);

// Same "country-<iso>" key format the Countries Visited page uses — this is what keeps
// the two pages in sync (they're reading/writing the exact same backend records).
function storageKey(iso: string) { return `country-${iso}`; }

// Pure async builder (fetches its own data) so the Settings page's "Export All" master
// export can build this CSV without the US States Visited page being mounted.
export async function buildStatesVisitedCSVExport(): Promise<CSVExport> {
  const r = await fetch("/api/user-data", { credentials: "include" });
  const kvData: Record<string, string> = await r.json();
  const headers = ["State ISO", "State Name", "Visited At", "Cities", "Highlights", "Lowlights", "Lessons"];
  const rows: unknown[][] = [];
  for (const iso of ALL_STATE_ISOS) {
    const raw = kvData[storageKey(iso)];
    if (!raw) continue;
    let entry: StateEntry;
    try { entry = JSON.parse(raw); } catch { continue; }
    if (!entry.visitedAt && !(entry.cities && entry.cities.length)) continue;
    rows.push([
      iso, STATE_NAMES[iso] ?? iso, entry.visitedAt,
      (entry.cities || []).join("; "), (entry.highlights || []).join("; "),
      (entry.lowlights || []).join("; "), (entry.lessons || []).join("; "),
    ]);
  }
  rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  return { folder: "Travel", filename: "states-visited.csv", content: rowsToCSV(headers, rows) };
}

export default function USStatesVisitedPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  const { data: kvData = {}, isSuccess } = useQuery<Record<string, string>>({
    queryKey: ["/api/user-data"],
    queryFn: async () => {
      const r = await fetch("/api/user-data", { credentials: "include" });
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { updates?: Record<string, string>; deletes?: string[] }) =>
      apiRequest("PUT", "/api/user-data", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-data"] }),
  });

  // Ensure every state has at least an empty entry so it shows up as clickable/trackable.
  if (isSuccess && !seededRef.current) {
    seededRef.current = true;
    const updates: Record<string, string> = {};
    for (const iso of ALL_STATE_ISOS) {
      if (!kvData[storageKey(iso)]) {
        updates[storageKey(iso)] = JSON.stringify(EMPTY_ENTRY());
      }
    }
    if (Object.keys(updates).length > 0) {
      saveMutation.mutate({ updates });
    }
  }

  const visitedMap: Record<string, StateEntry> = {};
  for (const [k, v] of Object.entries(kvData)) {
    if (k.startsWith("country-") && !k.startsWith("country-__")) {
      try { visitedMap[k.slice(8)] = JSON.parse(v); } catch {}
    }
  }
  const visitedIsos = ALL_STATE_ISOS.filter(iso => {
    const e = visitedMap[iso];
    return e && (e.visitedAt || (e.cities && e.cities.length > 0));
  });

  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<{ iso: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });

  const openState = (iso: string, name: string) => {
    setSelected({ iso, name });
    setEditing(false);
    setTooltip(null);
  };

  const startEdit = () => {
    if (!selected) return;
    const existing = visitedMap[selected.iso] ?? EMPTY_ENTRY();
    setEditForm({
      visitedAt: existing.visitedAt,
      cities: ensure(existing.cities),
      highlights: ensure(existing.highlights),
      lowlights: ensure(existing.lowlights),
      lessons: ensure(existing.lessons),
      name: selected.name,
      iso: selected.iso,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editForm) return;
    const clean = (arr: string[]) => arr.filter(s => s.trim());
    const entry: StateEntry = {
      visitedAt: editForm.visitedAt,
      cities: clean(editForm.cities),
      highlights: clean(editForm.highlights),
      lowlights: clean(editForm.lowlights),
      lessons: clean(editForm.lessons),
    };
    saveMutation.mutate({ updates: { [storageKey(editForm.iso)]: JSON.stringify(entry) } });
    setEditing(false);
  };

  const clearState = (iso: string) => {
    saveMutation.mutate({ updates: { [storageKey(iso)]: JSON.stringify(EMPTY_ENTRY()) } });
    setSelected(null);
  };

  type BulletField = "cities" | "highlights" | "lowlights" | "lessons";
  const updateList = (field: BulletField, idx: number, val: string) => {
    if (!editForm) return;
    const arr = [...editForm[field]]; arr[idx] = val;
    setEditForm({ ...editForm, [field]: arr });
  };
  const addItem = (field: BulletField) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: [...editForm[field], ""] });
  };
  const removeItem = (field: BulletField, idx: number) => {
    if (!editForm) return;
    const arr = editForm[field].filter((_, i) => i !== idx);
    setEditForm({ ...editForm, [field]: arr.length ? arr : [""] });
  };

  const selectedEntry = selected ? visitedMap[selected.iso] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-violet-950 pb-24">
      <div className={`${isMobile ? "px-4 pt-4" : "px-6 pt-20"} max-w-7xl mx-auto`}>
        <Link href="/explore">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-violet-300 text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Explore
          </a>
        </Link>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <MapIcon className="h-6 w-6 text-violet-400" />
            <h1 className="text-2xl font-serif font-bold text-white">US States Visited</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { buildStatesVisitedCSVExport().then(exp => downloadCSV(exp.filename, exp.content)); }}
              className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <div className="text-sm text-violet-300 font-semibold">
              {visitedIsos.length} / 50 states
            </div>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Click any state to log your visit. Highlighted = visited. Synced with Countries Visited.
        </p>
      </div>

      <div className="relative w-full" style={{ height: isMobile ? "70vw" : "min(80vh, 900px)" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 900 }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={({ zoom, coordinates }: { zoom: number; coordinates: [number, number] }) =>
              setPosition({ zoom, coordinates })
            }
            minZoom={0.8}
            maxZoom={8}
          >
            <Geographies geography={US_ATLAS_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const fips = String(geo.id ?? "").padStart(2, "0");
                  const iso = US_FIPS_TO_ISO[fips];
                  if (!iso) return null;
                  const name = STATE_NAMES[iso] ?? iso;
                  const entry = visitedMap[iso];
                  const visited = !!(entry && (entry.visitedAt || entry.cities?.length));
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey ?? iso}
                      geography={geo}
                      onClick={() => openState(iso, name)}
                      onMouseEnter={(e: any) => {
                        const svgRect = e.target?.ownerSVGElement?.getBoundingClientRect?.();
                        setTooltip({
                          name,
                          x: svgRect ? e.clientX - svgRect.left : 0,
                          y: svgRect ? e.clientY - svgRect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        default: {
                          fill: visited ? "#A78BFA" : "#1e293b",
                          stroke: isSelected ? "#A78BFA" : visited ? "#4c1d95" : "#4a5568",
                          strokeWidth: isSelected ? (visited ? 0 : 2) : 0.6,
                          outline: "none",
                          cursor: "pointer",
                          filter: isSelected && !visited ? "drop-shadow(0 0 4px #A78BFA)" : "none",
                        },
                        hover: {
                          fill: visited ? "#C4B5FD" : "#312e5f",
                          stroke: visited ? "#4c1d95" : "#A78BFA",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: { fill: visited ? "#8B5CF6" : "#312e5f", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && !selected && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600/60 shadow-lg whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: Math.max(0, tooltip.y - 32) }}
          >
            {tooltip.name}
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col items-center gap-1 z-10 select-none">
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Zoom in"
          >+</button>
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }))}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-white rounded-lg flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 shadow-lg transition-colors"
            title="Zoom out"
          >−</button>
          <div className="w-9 h-px bg-slate-600 my-0.5" />
          <button
            onClick={() => setPosition({ coordinates: [0, 0], zoom: 1 })}
            className="w-9 h-9 bg-slate-800/95 border border-slate-600 text-slate-400 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-slate-700 hover:text-white active:scale-95 shadow-lg transition-colors"
            title="Reset view"
          >⌂</button>
        </div>

        {/* State popup */}
        {selected && !editing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92vw] max-w-md bg-slate-900/97 border border-violet-500/40 rounded-2xl shadow-2xl p-4 z-10"
            style={{ backdropFilter: "blur(12px)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                {selectedEntry?.visitedAt && <p className="text-violet-300 text-sm">📅 {selectedEntry.visitedAt}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={startEdit} className="p-1.5 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/40" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                {selectedEntry && (selectedEntry.visitedAt || selectedEntry.cities?.length > 0) && (
                  <button onClick={() => clearState(selected.iso)} className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40" title="Mark as not visited">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:bg-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedEntry && (selectedEntry.visitedAt || selectedEntry.cities?.length > 0 || selectedEntry.highlights?.length > 0) ? (
              <div className="space-y-2.5 text-sm max-h-52 overflow-y-auto pr-1">
                {selectedEntry.cities?.length > 0 && (
                  <div>
                    <p className="text-violet-400 font-semibold text-xs uppercase tracking-wide mb-1">📍 Cities / Towns</p>
                    <p className="text-slate-300">{selectedEntry.cities.join(", ")}</p>
                  </div>
                )}
                {selectedEntry.highlights?.length > 0 && (
                  <div>
                    <p className="text-green-400 font-semibold text-xs uppercase tracking-wide mb-1">✨ Highlights</p>
                    {selectedEntry.highlights.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
                {selectedEntry.lowlights?.length > 0 && (
                  <div>
                    <p className="text-orange-400 font-semibold text-xs uppercase tracking-wide mb-1">😬 Lowlights</p>
                    {selectedEntry.lowlights.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
                {selectedEntry.lessons?.length > 0 && (
                  <div>
                    <p className="text-purple-400 font-semibold text-xs uppercase tracking-wide mb-1">💡 Lessons Learned</p>
                    {selectedEntry.lessons.map((h, i) => <p key={i} className="text-slate-300 pl-2">• {h}</p>)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Tap ✏️ to log this visit.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit panel */}
      {editing && editForm && (
        <div
          className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center"} justify-center`}
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(false); }}
        >
          <div className={`w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 border border-violet-500/30 ${isMobile ? "rounded-t-3xl" : "rounded-2xl"} p-5 max-h-[88vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">✏️ {editForm.name}</h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-violet-300 uppercase tracking-wide font-semibold mb-1 block">📅 When did you visit?</label>
              <Input value={editForm.visitedAt} onChange={e => setEditForm({ ...editForm, visitedAt: e.target.value })}
                placeholder="e.g. March 2019, Summer 2022" className="bg-slate-800/50 border-violet-500/30 text-white h-9 text-sm" />
            </div>

            {([
              { field: "cities" as const, label: "📍 Cities / Towns Visited", color: "text-violet-400", ph: "Add a city or town..." },
              { field: "highlights" as const, label: "✨ Highlights", color: "text-green-400", ph: "Add a highlight..." },
              { field: "lowlights" as const, label: "😬 Lowlights", color: "text-orange-400", ph: "Add a lowlight..." },
              { field: "lessons" as const, label: "💡 Lessons Learned", color: "text-purple-400", ph: "Add a lesson..." },
            ]).map(({ field, label, color, ph }) => (
              <div key={field} className="mb-4">
                <label className={`text-xs uppercase tracking-wide font-semibold mb-1.5 block ${color}`}>{label}</label>
                {editForm[field].map((item, idx) => (
                  <div key={idx} className="flex gap-1.5 mb-1.5">
                    <Input value={item} onChange={e => updateList(field, idx, e.target.value)}
                      placeholder={ph} className="bg-slate-800/50 border-slate-600/40 text-white h-8 text-sm flex-1" />
                    <button onClick={() => removeItem(field, idx)} className="p-1.5 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => addItem(field)} className={`text-xs flex items-center gap-1 mt-0.5 ${color} hover:opacity-75`}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={saveMutation.isPending} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white">
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Visited chips */}
      {visitedIsos.length > 0 && (
        <div className={`${isMobile ? "px-4" : "px-6"} max-w-7xl mx-auto mt-6`}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Your Visited States ({visitedIsos.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {visitedIsos.map(iso => (
              <button key={iso} onClick={() => openState(iso, STATE_NAMES[iso] ?? iso)}
                className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-sm hover:bg-violet-500/30 transition-colors">
                {STATE_NAMES[iso] ?? iso}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
