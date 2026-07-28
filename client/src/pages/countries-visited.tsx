import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Link } from "wouter";
import { ArrowLeft, Edit2, X, Plus, Trash2, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Numeric ISO 3166-1 → alpha-3 lookup for all seeded countries
const NUMERIC_TO_ALPHA3: Record<string, string> = {
  "484": "MEX", "528": "NLD", "056": "BEL", "372": "IRL", "276": "DEU",
  "392": "JPN", "156": "CHN", "704": "VNM", "764": "THA", "170": "COL",
  "616": "POL", "620": "PRT", "724": "ESP", "826": "GBR", "250": "FRA",
  "380": "ITA", "203": "CZE", "344": "HKG", "630": "PRI",
  "376": "ISR", "158": "TWN",
  "56": "BEL",
};

// All visited country ISO codes (HAW = Hawaii, tracked as own region)
const SEED_ISOS = [
  "MEX","NLD","BEL","IRL","DEU","JPN","CHN","VNM","THA","COL",
  "POL","PRT","ESP","GBR","FRA","ITA","CZE","HKG","PRI",
  "ISR","TWN","HAW",
];

// Display names
const ISO_NAMES: Record<string, string> = {
  MEX: "Mexico", NLD: "Netherlands", BEL: "Belgium", IRL: "Ireland",
  DEU: "Germany", JPN: "Japan", CHN: "China", VNM: "Vietnam",
  THA: "Thailand", COL: "Colombia", POL: "Poland", PRT: "Portugal",
  ESP: "Spain", GBR: "United Kingdom", FRA: "France", ITA: "Italy",
  CZE: "Czechia", HKG: "Hong Kong", PRI: "Puerto Rico",
  ISR: "Israel", TWN: "Taiwan", HAW: "Hawaii 🌺",
};

// Seeded visit dates (v2 migration)
const SEED_DATES: Record<string, string> = {
  MEX: "2024",
  CHN: "2023, 2024, 2025",
  HKG: "2024, 2025",
  ISR: "2024",
  TWN: "2022",
  JPN: "2023",
  VNM: "2022, 2025",
  PRT: "2023",
  CZE: "2023",
  POL: "2023",
  THA: "2022",
  HAW: "2024",
  PRI: "2024",
  COL: "2024, 2025, 2026",
  IRL: "2016",
  ITA: "2016",
  DEU: "2016",
  BEL: "2016",
  NLD: "2016",
};

interface CountryEntry {
  visitedAt: string;
  cities: string[];
  highlights: string[];
  lowlights: string[];
  lessons: string[];
}

type EditForm = CountryEntry & { name: string; iso: string };

const EMPTY_ENTRY = (): CountryEntry => ({
  visitedAt: "", cities: [], highlights: [], lowlights: [], lessons: [],
});

const ensure = (arr?: string[]) => (arr && arr.length ? arr : [""]);

function storageKey(iso: string) { return `country-${iso}`; }

export default function CountriesVisitedPage() {
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

  // Seeding / migration
  useEffect(() => {
    if (!isSuccess || seededRef.current) return;
    seededRef.current = true;
    const updates: Record<string, string> = {};

    // Always ensure all SEED_ISOS exist as entries
    for (const iso of SEED_ISOS) {
      if (!kvData[storageKey(iso)]) {
        updates[storageKey(iso)] = JSON.stringify(EMPTY_ENTRY());
      }
    }

    // v2 migration: apply known dates if not already applied
    if (!kvData["country-__v2"]) {
      for (const [iso, date] of Object.entries(SEED_DATES)) {
        const existing: CountryEntry = kvData[storageKey(iso)]
          ? JSON.parse(kvData[storageKey(iso)])
          : EMPTY_ENTRY();
        // Only set if visitedAt is blank
        if (!existing.visitedAt) {
          updates[storageKey(iso)] = JSON.stringify({ ...existing, visitedAt: date });
        }
      }
      updates["country-__v2"] = "1";
    }

    if (Object.keys(updates).length > 0) saveMutation.mutate({ updates });
  }, [isSuccess, kvData]);

  // Parse visited countries (exclude internal migration keys)
  const visitedMap: Record<string, CountryEntry> = {};
  for (const [k, v] of Object.entries(kvData)) {
    if (k.startsWith("country-") && !k.startsWith("country-__")) {
      try { visitedMap[k.slice(8)] = JSON.parse(v); } catch {}
    }
  }
  const visitedIsos = Object.keys(visitedMap);

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Selected country popup
  const [selected, setSelected] = useState<{ iso: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // Zoom/pan
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Name cache (preload with known names)
  const [nameCache, setNameCache] = useState<Record<string, string>>({ ...ISO_NAMES });

  const openCountry = (iso: string, name: string) => {
    setNameCache(c => ({ ...c, [iso]: name }));
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
    const entry: CountryEntry = {
      visitedAt: editForm.visitedAt,
      cities: clean(editForm.cities),
      highlights: clean(editForm.highlights),
      lowlights: clean(editForm.lowlights),
      lessons: clean(editForm.lessons),
    };
    saveMutation.mutate({ updates: { [storageKey(editForm.iso)]: JSON.stringify(entry) } });
    setEditing(false);
  };

  const removeCountry = (iso: string) => {
    saveMutation.mutate({ deletes: [storageKey(iso)] });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-sky-950 pb-24">
      {/* Header */}
      <div className={`${isMobile ? "px-4 pt-4" : "px-6 pt-20"} max-w-7xl mx-auto`}>
        <Link href="/explore">
          <a className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-300 text-sm mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Explore
          </a>
        </Link>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-sky-400" />
            <h1 className="text-2xl font-serif font-bold text-white">Countries Visited</h1>
          </div>
          <div className="text-sm text-sky-300 font-semibold">
            {visitedIsos.length} {visitedIsos.length === 1 ? "country" : "countries"}
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Click any country to log your visit. Highlighted = visited. Hover to see names.
        </p>
      </div>

      {/* Map */}
      <div className="relative w-full" style={{ height: isMobile ? "60vw" : "680px" }}>
        <ComposableMap
          projection="geoEqualEarth"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 195 }}
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
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  // world-atlas uses numeric ISO IDs; resolve to alpha-3
                  const numericId = String(geo.id ?? "");
                  const iso = NUMERIC_TO_ALPHA3[numericId] ?? geo.properties?.ISO_A3 ?? numericId;
                  const name = ISO_NAMES[iso] ?? geo.properties?.NAME ?? geo.properties?.name ?? iso;
                  const visited = Object.prototype.hasOwnProperty.call(visitedMap, iso);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => openCountry(iso, name)}
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
                          fill: isSelected ? "#0EA5E9" : visited ? "#38BDF8" : "#1e293b",
                          stroke: "#334155",
                          strokeWidth: 0.4,
                          outline: "none",
                          cursor: "pointer",
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#334155",
                          stroke: "#94a3b8",
                          strokeWidth: 0.6,
                          outline: "none",
                          cursor: "pointer",
                        },
                        pressed: {
                          fill: visited ? "#0EA5E9" : "#475569",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip */}
        {tooltip && !selected && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-600/60 shadow-lg whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: Math.max(0, tooltip.y - 32) }}
          >
            {tooltip.name}
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
            className="w-8 h-8 bg-slate-800/90 border border-slate-600 text-white rounded flex items-center justify-center text-lg hover:bg-slate-700">+</button>
          <button onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }))}
            className="w-8 h-8 bg-slate-800/90 border border-slate-600 text-white rounded flex items-center justify-center text-lg hover:bg-slate-700">−</button>
        </div>

        {/* Country popup */}
        {selected && !editing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92vw] max-w-md bg-slate-900/97 border border-sky-500/40 rounded-2xl shadow-2xl p-4 z-10"
            style={{ backdropFilter: "blur(12px)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                {selectedEntry?.visitedAt && <p className="text-sky-300 text-sm">📅 {selectedEntry.visitedAt}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={startEdit} className="p-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/40" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                {selectedEntry && (
                  <button onClick={() => removeCountry(selected.iso)} className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:bg-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedEntry ? (
              <div className="space-y-2.5 text-sm max-h-52 overflow-y-auto pr-1">
                {selectedEntry.cities?.length > 0 && (
                  <div>
                    <p className="text-sky-400 font-semibold text-xs uppercase tracking-wide mb-1">📍 Cities / Towns</p>
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
                {!selectedEntry.cities?.length && !selectedEntry.highlights?.length && !selectedEntry.lowlights?.length && !selectedEntry.lessons?.length && (
                  <p className="text-slate-500 text-sm">Tap ✏️ to add details about your visit.</p>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 border border-sky-500/30 rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">✏️ {editForm.name}</h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-sky-300 uppercase tracking-wide font-semibold mb-1 block">📅 When did you visit?</label>
              <Input value={editForm.visitedAt} onChange={e => setEditForm({ ...editForm, visitedAt: e.target.value })}
                placeholder="e.g. March 2019, Summer 2022" className="bg-slate-800/50 border-sky-500/30 text-white h-9 text-sm" />
            </div>

            {([
              { field: "cities" as const, label: "📍 Cities / Towns Visited", color: "text-sky-400", ph: "Add a city or town..." },
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
              <Button onClick={saveEdit} disabled={saveMutation.isPending} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white">
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
            Your Visited Countries ({visitedIsos.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {visitedIsos.sort().map(iso => (
              <button key={iso} onClick={() => openCountry(iso, nameCache[iso] ?? iso)}
                className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/30 transition-colors">
                {nameCache[iso] ?? iso}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
