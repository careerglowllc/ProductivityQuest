import { useState, useCallback, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO numeric → ISO alpha-3 mapping for react-simple-maps
// We store data keyed by alpha-3 (e.g. "country-USA")
const NUM_TO_A3: Record<string, string> = {};

interface CountryEntry {
  visitedAt: string;   // e.g. "March 2019"
  highlights: string[];
  lowlights: string[];
  lessons: string[];
}

type EditForm = CountryEntry & { name: string; iso: string };

const EMPTY_ENTRY = (): CountryEntry => ({
  visitedAt: "",
  highlights: [""],
  lowlights: [""],
  lessons: [""],
});

function storageKey(iso: string) {
  return `country-${iso}`;
}

export default function CountriesVisitedPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // All user KV data
  const { data: kvData = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/user-data"],
    queryFn: async () => {
      const r = await fetch("/api/user-data", { credentials: "include" });
      return r.json();
    },
  });

  // Parse visited countries from kvData
  const visitedMap: Record<string, CountryEntry> = {};
  for (const [k, v] of Object.entries(kvData)) {
    if (k.startsWith("country-")) {
      try { visitedMap[k.slice(8)] = JSON.parse(v); } catch {}
    }
  }
  const visitedIsos = Object.keys(visitedMap);

  const saveMutation = useMutation({
    mutationFn: async (payload: { updates?: Record<string, string>; deletes?: string[] }) => {
      return apiRequest("PUT", "/api/user-data", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-data"] });
    },
  });

  // Selected country for popup
  const [selected, setSelected] = useState<{ iso: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // Zoom/pan state
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Cache country names as we encounter them (iso → display name)
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const openCountry = (iso: string, name: string) => {
    setNameCache(c => ({ ...c, [iso]: name }));
    setSelected({ iso, name });
    setEditing(false);
  };

  const startEdit = () => {
    if (!selected) return;
    const existing = visitedMap[selected.iso] ?? EMPTY_ENTRY();
    setEditForm({
      ...existing,
      highlights: existing.highlights.length ? existing.highlights : [""],
      lowlights: existing.lowlights.length ? existing.lowlights : [""],
      lessons: existing.lessons.length ? existing.lessons : [""],
      name: selected.name,
      iso: selected.iso,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editForm) return;
    const entry: CountryEntry = {
      visitedAt: editForm.visitedAt,
      highlights: editForm.highlights.filter(s => s.trim()),
      lowlights: editForm.lowlights.filter(s => s.trim()),
      lessons: editForm.lessons.filter(s => s.trim()),
    };
    saveMutation.mutate({
      updates: { [storageKey(editForm.iso)]: JSON.stringify(entry) },
    });
    setEditing(false);
  };

  const removeCountry = (iso: string) => {
    saveMutation.mutate({ deletes: [storageKey(iso)] });
    setSelected(null);
  };

  const updateList = (field: "highlights" | "lowlights" | "lessons", idx: number, val: string) => {
    if (!editForm) return;
    const arr = [...editForm[field]];
    arr[idx] = val;
    setEditForm({ ...editForm, [field]: arr });
  };
  const addItem = (field: "highlights" | "lowlights" | "lessons") => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: [...editForm[field], ""] });
  };
  const removeItem = (field: "highlights" | "lowlights" | "lessons", idx: number) => {
    if (!editForm) return;
    const arr = editForm[field].filter((_, i) => i !== idx);
    setEditForm({ ...editForm, [field]: arr.length ? arr : [""] });
  };

  const isVisited = (iso: string) => visitedIsos.includes(iso);

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
          Click any country to log your visit. Highlighted countries are ones you've been to.
        </p>
      </div>

      {/* Map */}
      <div className="relative w-full" style={{ height: isMobile ? "55vw" : "520px" }}>
        <ComposableMap
          projection="geoEqualEarth"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 160 }}
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
                  const iso = geo.properties.ISO_A3 ?? geo.id;
                  const visited = isVisited(iso);
                  const isSelected = selected?.iso === iso;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => openCountry(iso, geo.properties.NAME ?? geo.properties.name ?? iso)}
                      style={{
                        default: {
                          fill: visited ? "#38BDF8" : "#1e293b",
                          stroke: "#334155",
                          strokeWidth: 0.4,
                          outline: "none",
                          cursor: "pointer",
                          opacity: isSelected ? 1 : visited ? 0.9 : 0.85,
                        },
                        hover: {
                          fill: visited ? "#7DD3FC" : "#334155",
                          stroke: "#64748b",
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

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
            className="w-8 h-8 bg-slate-800/90 border border-slate-600 text-white rounded flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
          >+</button>
          <button
            onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }))}
            className="w-8 h-8 bg-slate-800/90 border border-slate-600 text-white rounded flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
          >−</button>
        </div>

        {/* Country popup */}
        {selected && !editing && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90vw] max-w-md bg-slate-900/95 border border-sky-500/40 rounded-2xl shadow-2xl p-4 z-10"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                {selectedEntry?.visitedAt && (
                  <p className="text-sky-300 text-sm">📅 {selectedEntry.visitedAt}</p>
                )}
                {!selectedEntry && (
                  <p className="text-slate-500 text-xs mt-0.5">Not visited yet</p>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={startEdit}
                  className="p-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/40 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {selectedEntry && (
                  <button
                    onClick={() => removeCountry(selected.iso)}
                    className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
                    title="Remove visit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedEntry ? (
              <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {selectedEntry.highlights.length > 0 && (
                  <div>
                    <p className="text-green-400 font-semibold text-xs uppercase tracking-wide mb-1">✨ Highlights</p>
                    {selectedEntry.highlights.map((h, i) => (
                      <p key={i} className="text-slate-300 pl-2">• {h}</p>
                    ))}
                  </div>
                )}
                {selectedEntry.lowlights.length > 0 && (
                  <div>
                    <p className="text-orange-400 font-semibold text-xs uppercase tracking-wide mb-1">😬 Lowlights</p>
                    {selectedEntry.lowlights.map((h, i) => (
                      <p key={i} className="text-slate-300 pl-2">• {h}</p>
                    ))}
                  </div>
                )}
                {selectedEntry.lessons.length > 0 && (
                  <div>
                    <p className="text-purple-400 font-semibold text-xs uppercase tracking-wide mb-1">💡 Lessons Learned</p>
                    {selectedEntry.lessons.map((h, i) => (
                      <p key={i} className="text-slate-300 pl-2">• {h}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Tap the edit button to log your visit details.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit panel — slides up from bottom */}
      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-800 border border-sky-500/30 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                ✏️ {editForm.name}
              </h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visit date */}
            <div className="mb-4">
              <label className="text-xs text-sky-300 uppercase tracking-wide font-semibold mb-1 block">📅 When did you visit?</label>
              <Input
                value={editForm.visitedAt}
                onChange={e => setEditForm({ ...editForm, visitedAt: e.target.value })}
                placeholder="e.g. March 2019, Summer 2022"
                className="bg-slate-800/50 border-sky-500/30 text-white h-9 text-sm"
              />
            </div>

            {/* Bullet list helper */}
            {(["highlights", "lowlights", "lessons"] as const).map(field => {
              const labels: Record<string, string> = {
                highlights: "✨ Highlights",
                lowlights: "😬 Lowlights",
                lessons: "💡 Lessons Learned",
              };
              const colors: Record<string, string> = {
                highlights: "text-green-400",
                lowlights: "text-orange-400",
                lessons: "text-purple-400",
              };
              return (
                <div key={field} className="mb-4">
                  <label className={`text-xs uppercase tracking-wide font-semibold mb-1 block ${colors[field]}`}>
                    {labels[field]}
                  </label>
                  {editForm[field].map((item, idx) => (
                    <div key={idx} className="flex gap-1.5 mb-1.5">
                      <Input
                        value={item}
                        onChange={e => updateList(field, idx, e.target.value)}
                        placeholder={`Add ${field.slice(0, -1)}...`}
                        className="bg-slate-800/50 border-slate-600/40 text-white h-8 text-sm flex-1"
                      />
                      <button
                        onClick={() => removeItem(field, idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addItem(field)}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              );
            })}

            <div className="flex gap-2 mt-2">
              <Button
                onClick={saveEdit}
                disabled={saveMutation.isPending}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visited list below map */}
      {visitedIsos.length > 0 && (
        <div className={`${isMobile ? "px-4" : "px-6"} max-w-7xl mx-auto mt-6`}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Your Visited Countries</h3>
          <div className="flex flex-wrap gap-2">
            {visitedIsos.map(iso => (
              <button
                key={iso}
                onClick={() => openCountry(iso, nameCache[iso] ?? iso)}
                className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/30 transition-colors"
              >
                {nameCache[iso] ?? iso}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
