import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FerrisWheel,
  Search,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEY = "activities-in-cities-v1";

// ── Regions ───────────────────────────────────────────────────
// SVG paths (viewBox 0 0 100 100) — simplified state silhouettes
const REGION_SVG_PATHS: Record<string, string> = {
  "bay-area":       "M 52,4 L 68,6 L 74,14 L 76,24 L 72,34 L 70,48 L 65,60 L 60,72 L 52,84 L 40,90 L 30,84 L 24,72 L 22,58 L 24,44 L 20,32 L 24,18 L 34,8 Z",
  "central-valley": "M 52,4 L 68,6 L 74,14 L 76,24 L 72,34 L 70,48 L 65,60 L 60,72 L 52,84 L 40,90 L 30,84 L 24,72 L 22,58 L 24,44 L 20,32 L 24,18 L 34,8 Z",
  "reno":           "M 20,6 L 80,6 L 86,18 L 86,76 L 52,94 L 20,76 Z",
};

const REGION_HIGHLIGHT_PATHS: Record<string, string> = {
  "bay-area":       "M 36,52 L 44,48 L 52,50 L 56,58 L 52,68 L 44,72 L 36,68 L 30,60 Z",
  "central-valley": "M 38,22 L 62,24 L 66,36 L 64,52 L 58,62 L 42,62 L 34,52 L 32,36 Z",
  "reno":           "M 22,10 L 52,10 L 52,46 L 30,50 L 22,40 Z",
};

const REGIONS = [
  {
    id: "bay-area",
    label: "Bay Area",
    emoji: "🌉",
    description: "San Jose, Berkeley, SF & surrounds",
    color: "#fb923c",
    ringColor: "rgba(251,146,60,0.22)",
    stateName: "California",
    citiesMatch: [
      "san jose", "los altos", "livermore", "san francisco", "oakland",
      "berkeley", "fremont", "palo alto", "santa clara", "sunnyvale",
      "mountain view", "milpitas", "campbell", "saratoga", "cupertino",
      "woodside", "half moon bay", "santa cruz", "capitola", "pacifica",
    ],
  },
  {
    id: "central-valley",
    label: "Central Valley",
    emoji: "🌾",
    description: "Sacramento, Roseville, Dixon, Stockton & surrounds",
    color: "#f59e0b",
    ringColor: "rgba(245,158,11,0.22)",
    stateName: "California",
    citiesMatch: [
      "sacramento", "roseville", "rocklin", "dixon", "stockton", "modesto",
      "elk grove", "davis", "woodland", "vacaville", "fairfield", "vallejo",
      "folsom", "rancho cordova", "citrus heights", "auburn",
    ],
  },
  {
    id: "reno",
    label: "Reno / Nevada",
    emoji: "🎰",
    description: "Reno, Sparks, Carson City & Nevada",
    color: "#a855f7",
    ringColor: "rgba(168,85,247,0.22)",
    stateName: "Nevada",
    citiesMatch: ["reno", "sparks", "carson city", ", nv", "nevada"],
  },
];

const ALL_TAGS = [
  "Garden / Historic Site", "Mini Golf", "Arcade", "Comedy Show", "Live Music",
  "Hike", "Beach", "Tour", "Museum", "Amusement Park", "Outdoor", "Indoor",
  "Date Idea", "Free Sometimes",
];

const TAG_COLORS: Record<string, string> = {
  "Garden / Historic Site": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "Mini Golf":              "bg-lime-500/20 text-lime-300 border-lime-500/40",
  "Arcade":                 "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  "Comedy Show":            "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "Live Music":             "bg-purple-500/20 text-purple-300 border-purple-500/40",
  "Hike":                   "bg-green-500/20 text-green-300 border-green-500/40",
  "Beach":                  "bg-sky-500/20 text-sky-300 border-sky-500/40",
  "Tour":                   "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  "Museum":                 "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Amusement Park":         "bg-red-500/20 text-red-300 border-red-500/40",
  "Outdoor":                "bg-teal-500/20 text-teal-300 border-teal-500/40",
  "Indoor":                 "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "Date Idea":              "bg-pink-500/20 text-pink-300 border-pink-500/40",
  "Free Sometimes":         "bg-orange-400/20 text-orange-300 border-orange-400/40",
};

// ── Types ────────────────────────────────────────────────────
interface StarRatings {
  fun: number;         // 0–5
  atmosphere: number;
  value: number;
}

interface ActivityEntry {
  id: string;
  name: string;         // activity / venue name
  city: string;         // city / location
  address?: string;
  overallRating: number; // 0–5 (auto-avg or manual)
  stars: StarRatings;
  thoughts: string;
  tags: string[];
  visitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function emptyEntry(): Omit<ActivityEntry, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "", city: "", address: "",
    overallRating: 0,
    stars: { fun: 0, atmosphere: 0, value: 0 },
    thoughts: "", tags: [], visitedAt: "",
  };
}

function load(): ActivityEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function save(entries: ActivityEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function avg(s: StarRatings): number {
  return Math.round(((s.fun + s.atmosphere + s.value) / 3) * 10) / 10;
}

// ── Tag → emoji mapping (first match wins) ────────────────────
const TAG_EMOJI: [string, string][] = [
  ["Mini Golf",              "⛳"],
  ["Arcade",                 "🕹️"],
  ["Comedy Show",            "🎤"],
  ["Live Music",             "🎸"],
  ["Garden / Historic Site", "🌷"],
  ["Hike",                   "🥾"],
  ["Beach",                  "🏖️"],
  ["Tour",                   "🧭"],
  ["Museum",                 "🖼️"],
  ["Amusement Park",         "🎡"],
  ["Outdoor",                "🌳"],
  ["Indoor",                 "🏠"],
  ["Date Idea",              "💞"],
];

function entryEmoji(tags: string[]): string {
  for (const [tag, emoji] of TAG_EMOJI) {
    if (tags.includes(tag)) return emoji;
  }
  return "🎡";
}

function deriveRegions(entry: ActivityEntry): string[] {
  const text = (entry.city + " " + (entry.address ?? "")).toLowerCase();
  const matched = REGIONS.filter((r) => r.citiesMatch.some((c) => text.includes(c))).map((r) => r.id);
  return matched.length > 0 ? matched : ["other"];
}

// ── Star display ─────────────────────────────────────────────
function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(value);
        const half   = !filled && i < value;
        return (
          <span key={i} className={`text-sm ${filled ? "text-yellow-400" : half ? "text-yellow-400/60" : "text-slate-600"}`}>
            ★
          </span>
        );
      })}
      <span className="text-xs text-slate-400 ml-1">{value.toFixed(1)}</span>
    </span>
  );
}

// ── Star picker ──────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`text-xl transition-colors ${n <= value ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400/50"}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

// ── Region picker (replaces map) ──────────────────────────────
function RegionPickerView({
  entries,
  onSelect,
}: {
  entries: ActivityEntry[];
  onSelect: (regionId: string) => void;
}) {
  const countFor = (id: string) => entries.filter((e) => deriveRegions(e).includes(id)).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
      {REGIONS.map((region) => {
        const count = countFor(region.id);
        const shapePath    = REGION_SVG_PATHS[region.id];
        const highlightPath = REGION_HIGHLIGHT_PATHS[region.id];
        return (
          <button
            key={region.id}
            onClick={() => onSelect(region.id)}
            className="group relative rounded-2xl border overflow-hidden text-left transition-all duration-200 hover:scale-[1.03] active:scale-95 hover:shadow-xl"
            style={{
              borderColor: `${region.color}44`,
              background: `linear-gradient(145deg, rgba(13,20,42,0.97) 0%, rgba(10,15,30,0.97) 100%)`,
              minHeight: 180,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 30%, ${region.ringColor} 0%, transparent 70%)` }}
            />

            <div className="absolute right-3 top-3 opacity-25 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none">
              <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
                <path
                  d={shapePath}
                  stroke={region.color}
                  strokeWidth="2.5"
                  fill={region.ringColor}
                />
                {highlightPath && (
                  <path
                    d={highlightPath}
                    fill={region.color}
                    opacity="0.5"
                  />
                )}
              </svg>
            </div>

            <div className="relative z-10 p-4 flex flex-col h-full">
              <div className="text-3xl mb-2">{region.emoji}</div>
              <div className="font-bold text-base leading-tight mb-0.5" style={{ color: region.color }}>
                {region.label}
              </div>
              <div className="text-[11px] text-slate-500 mb-3 leading-snug">{region.description}</div>

              <div className="mt-auto flex items-center justify-between">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ color: region.color, borderColor: `${region.color}44`, background: region.ringColor }}
                >
                  {count} {count === 1 ? "activity" : "activities"}
                </span>
                <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-sm">→</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Seeded entries ───────────────────────────────────────────
const SEED_ENTRIES: ActivityEntry[] = [
  {
    id: "activity-filoli-woodside",
    name: "Filoli",
    city: "Woodside, CA",
    address: "86 Cañada Rd, Woodside, CA 94062",
    overallRating: 4.5,
    stars: { fun: 4.3, atmosphere: 5, value: 4 },
    thoughts: "A beautiful little old house and gardens area — historic estate with gorgeous grounds. Sometimes free to visit, other times there's an admission fee, so check before going. Great low-key, scenic outing or date idea.",
    tags: ["Garden / Historic Site", "Outdoor", "Date Idea", "Free Sometimes"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-standup-comedy-sushi-bayarea",
    name: "Sushi Dinner + Stand-Up Comedy Show",
    city: "Bay Area, CA",
    overallRating: 4.3,
    stars: { fun: 4.5, atmosphere: 4, value: 4.5 },
    thoughts: "Stand-up comedy shows pop up all around the Bay Area and are often free or very cheap. Pair one with sushi beforehand for a great low-cost, high-fun night out — food and a good laugh in one evening.",
    tags: ["Comedy Show", "Date Idea", "Free Sometimes"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-urban-putt-berkeley",
    name: "Urban Putt",
    city: "Berkeley, CA",
    address: "2526 Durant Ave, Berkeley, CA 94704",
    overallRating: 4.4,
    stars: { fun: 4.6, atmosphere: 4.5, value: 3.8 },
    thoughts: "Really fun indoor mini-golf in downtown Berkeley with creative, quirky course design and cool themed obstacles. Great low-key activity for a group or a date.",
    tags: ["Mini Golf", "Indoor", "Date Idea"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-golfland-sunnyvale",
    name: "Golfland Mini-Golf",
    city: "Sunnyvale, CA",
    overallRating: 4.1,
    stars: { fun: 4.3, atmosphere: 4, value: 4 },
    thoughts: "Fun mini-golf area with an arcade inside — good combo of outdoor putting and indoor arcade games all in one spot.",
    tags: ["Mini Golf", "Arcade", "Outdoor", "Indoor"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-dave-and-busters-milpitas",
    name: "Dave & Buster's",
    city: "Milpitas, CA",
    overallRating: 4,
    stars: { fun: 4.2, atmosphere: 4, value: 3.5 },
    thoughts: "Fun little arcade area. Try to get whoever you're with to do the human crane machine thing — it's a fun little bit and a great topic to talk about afterward.",
    tags: ["Arcade", "Indoor", "Date Idea"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-capitola-beach-santacruz",
    name: "Capitola Beach",
    city: "Capitola, CA",
    overallRating: 4.3,
    stars: { fun: 4.2, atmosphere: 4.5, value: 4.5 },
    thoughts: "A nice beach in the Santa Cruz area — colorful beach town, good walk along the water, and a relaxed low-key vibe.",
    tags: ["Beach", "Outdoor"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    id: "activity-half-moon-bay-coastal-hike",
    name: "Half Moon Bay Coastal Trail Hike",
    city: "Half Moon Bay, CA",
    overallRating: 4.5,
    stars: { fun: 4.3, atmosphere: 4.8, value: 5 },
    thoughts: "Not the beach itself, but a hike along the coastline here is really beautiful, especially on a sunny day. Ocean views the whole way — a great free outdoor activity.",
    tags: ["Hike", "Beach", "Outdoor", "Free Sometimes"],
    visitedAt: "",
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
];

// ── Component ────────────────────────────────────────────────
export default function ActivitiesInCitiesPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  const [entries, setEntries] = useState<ActivityEntry[]>(load);

  // "map" = region picker, "list" = entries for a region
  const [view, setView]                         = useState<"map" | "list">("map");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [search, setSearch]                     = useState("");
  const [activeTag, setActiveTag]               = useState<string | null>(null);
  const [sortBy, setSortBy]                     = useState<"fun" | "atmosphere" | "value" | "overall">("fun");
  const [dialogOpen, setDialogOpen]             = useState(false);
  const [editingId, setEditingId]               = useState<string | null>(null);
  const [form, setForm]                         = useState(emptyEntry());
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);

  // Seed once
  useEffect(() => {
    const key = "activities-cities-seed-v1";
    if (localStorage.getItem(key)) return;
    setEntries((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      const toAdd = SEED_ENTRIES.filter((e) => !ids.has(e.id));
      const next = toAdd.length ? [...toAdd, ...prev] : prev;
      save(next);
      return next;
    });
    localStorage.setItem(key, "1");
  }, []);

  useEffect(() => { save(entries); }, [entries]);

  const selectedRegion = REGIONS.find((r) => r.id === selectedRegionId) ?? null;

  // Entries for selected region, filtered by search + tag
  const regionEntries = selectedRegionId
    ? entries.filter((e) => deriveRegions(e).includes(selectedRegionId))
    : entries;

  const filtered = regionEntries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.name, e.city, e.address, e.thoughts, ...e.tags]
      .filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    const matchTag = !activeTag || e.tags.includes(activeTag);
    return matchSearch && matchTag;
  }).sort((a, b) => {
    if (sortBy === "overall")    return b.overallRating - a.overallRating;
    if (sortBy === "fun")        return b.stars.fun - a.stars.fun;
    if (sortBy === "atmosphere") return b.stars.atmosphere - a.stars.atmosphere;
    if (sortBy === "value")      return b.stars.value - a.stars.value;
    return 0;
  });

  function selectRegion(id: string) {
    setSelectedRegionId(id);
    setSearch("");
    setActiveTag(null);
    setSortBy("fun");
    setView("list");
  }

  function backToMap() {
    setView("map");
    setSelectedRegionId(null);
    setSearch("");
    setActiveTag(null);
    setSortBy("fun");
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyEntry());
    setDialogOpen(true);
  }

  function openEdit(e: ActivityEntry) {
    setEditingId(e.id);
    setForm({ ...e });
    setDialogOpen(true);
  }

  function saveEntry() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const overall = avg(form.stars);
    setEntries((prev) => {
      let next: ActivityEntry[];
      if (editingId) {
        next = prev.map((e) => e.id === editingId ? { ...e, ...form, overallRating: overall, updatedAt: now } : e);
      } else {
        next = [{ ...form, overallRating: overall, id: crypto.randomUUID(), createdAt: now, updatedAt: now }, ...prev];
      }
      save(next);
      return next;
    });
    setDialogOpen(false);
  }

  function remove(id: string) {
    setEntries((prev) => { const next = prev.filter((e) => e.id !== id); save(next); return next; });
    setConfirmDeleteId(null);
  }

  function toggleTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }));
  }

  const setStars = (field: keyof StarRatings, v: number) =>
    setForm((f) => ({ ...f, stars: { ...f.stars, [field]: v } }));

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-orange-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : ""} pb-24`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Back nav */}
          {view === "map" ? (
            <Link href="/explore">
              <a className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-300 text-sm mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Explore
              </a>
            </Link>
          ) : (
            <button onClick={backToMap}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-300 text-sm mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Map
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <FerrisWheel className="h-10 w-10 text-orange-400" />
              <h1 className="text-4xl font-serif font-bold text-orange-100">Activities in Cities</h1>
            </div>
            <p className="text-orange-200/70 text-lg">Memorable things you've done city by city — tours, shows, adventures & more</p>
          </div>

          {/* ── MAP VIEW ── */}
          {view === "map" && (
            <div>
              <p className="text-center text-slate-400 text-sm mb-6">Select a region to explore</p>
              <RegionPickerView entries={entries} onSelect={selectRegion} />
              <div className="flex justify-center mt-6">
                <button onClick={openAdd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors">
                  <Plus className="h-4 w-4" /> Add New Entry
                </button>
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && selectedRegion && (
            <div>
              {/* Region header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl text-2xl border"
                    style={{ borderColor: `${selectedRegion.color}44`, background: selectedRegion.ringColor }}>
                    {selectedRegion.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold" style={{ color: selectedRegion.color }}>
                      {selectedRegion.label}
                    </h2>
                    <p className="text-xs text-slate-500">{selectedRegion.description}</p>
                  </div>
                </div>
                <button onClick={openAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search activities, tags…"
                  className="pl-9 bg-slate-800/60 border-orange-600/30 text-orange-50 placeholder:text-slate-500" />
              </div>

              {/* Tag filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setActiveTag(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === null ? "bg-orange-500/30 text-orange-200 border-orange-500/60" : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
                  All
                </button>
                {ALL_TAGS.map((tag) => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === tag ? (TAG_COLORS[tag] ?? "bg-slate-700 text-white border-slate-500") : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
                    {tag}
                  </button>
                ))}
              </div>

              {/* Sort pills */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[11px] text-slate-500 uppercase tracking-wide">Sort by:</span>
                {([
                  ["🎉 Fun",        "fun"],
                  ["🎭 Atmosphere", "atmosphere"],
                  ["💰 Value",      "value"],
                  ["⭐ Overall",    "overall"],
                ] as [string, typeof sortBy][]).map(([label, key]) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sortBy === key ? "bg-orange-500/30 text-orange-200 border-orange-500/60" : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-orange-300/60 text-sm mb-3">
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                {activeTag && ` · tagged "${activeTag}"`}
              </p>

              {/* Empty */}
              {filtered.length === 0 && (
                <Card className="bg-slate-800/60 border-2 border-orange-600/40">
                  <CardContent className="p-12 text-center">
                    <FerrisWheel className="h-16 w-16 text-orange-400/40 mx-auto mb-4" />
                    <h3 className="text-lg font-serif font-bold text-orange-100 mb-1">
                      {search || activeTag ? "No matches" : `No entries in ${selectedRegion.label} yet`}
                    </h3>
                    <p className="text-orange-300/70 text-sm mb-5">
                      {search || activeTag ? "Try a different search or tag." : "Be the first to log an activity here."}
                    </p>
                    {!search && !activeTag && (
                      <button onClick={openAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors">
                        <Plus className="h-4 w-4" /> Add Entry
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Entry grid */}
              {filtered.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {filtered.map((e) => (
                    <Card key={e.id}
                      className="bg-slate-800/60 border border-orange-600/30 hover:border-orange-500/60 transition-colors group cursor-pointer"
                      onClick={() => openEdit(e)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="text-orange-50 font-semibold font-serif leading-snug flex items-center gap-1.5">
                              <span>{entryEmoji(e.tags)}</span>
                              {e.name}
                            </h3>
                            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />{e.city}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-orange-300">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <StarDisplay value={e.stars.fun} />
                          <span className="text-xs text-slate-500">fun</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 mb-3 text-[11px] text-slate-400">
                          {([["🎉 Fun", e.stars.fun], ["🎭 Atmosphere", e.stars.atmosphere], ["💰 Value", e.stars.value]] as [string, number][]).map(([label, val]) => (
                            <div key={label} className="bg-slate-900/40 rounded px-2 py-1">
                              <span className="block">{label}</span>
                              <span className="text-yellow-400 font-semibold">{val.toFixed(1)} ★</span>
                            </div>
                          ))}
                        </div>

                        {e.thoughts && <p className="text-xs text-slate-400 line-clamp-3 mb-3">{e.thoughts}</p>}

                        {e.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {e.tags.map((tag) => (
                              <span key={tag} className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${TAG_COLORS[tag] ?? "bg-slate-700/60 text-slate-300 border-slate-600/40"}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-orange-600/40 text-orange-50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-orange-100">
              {editingId ? "Edit Entry" : "New Activity Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-orange-200 text-sm mb-1.5 block">Activity Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Filoli" className="bg-slate-800/50 border-orange-500/30 text-white" />
              </div>
              <div>
                <Label className="text-orange-200 text-sm mb-1.5 block">City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Woodside, CA" className="bg-slate-800/50 border-orange-500/30 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Address</Label>
              <Input value={form.address || ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address" className="bg-slate-800/50 border-orange-500/30 text-white" />
            </div>
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">When did you go?</Label>
              <Input value={form.visitedAt || ""} onChange={(e) => setForm((f) => ({ ...f, visitedAt: e.target.value }))}
                placeholder="e.g. July 2026" className="bg-slate-800/50 border-orange-500/30 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-orange-200 text-sm block">Ratings</Label>
              <div className="grid grid-cols-1 gap-2">
                {([
                  ["🎉 Fun", "fun"],
                  ["🎭 Atmosphere", "atmosphere"],
                  ["💰 Value", "value"],
                ] as [string, keyof StarRatings][]).map(([label, field]) => (
                  <div key={field} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-300">{label}</span>
                    <StarPicker value={form.stars[field]} onChange={(v) => setStars(field, v)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">Overall avg: {avg(form.stars).toFixed(1)} / 5</p>
            </div>
            <div>
              <Label className="text-orange-200 text-sm mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.tags.includes(tag) ? (TAG_COLORS[tag] ?? "bg-slate-700 text-white border-slate-500") : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Thoughts</Label>
              <Textarea value={form.thoughts} onChange={(e) => setForm((f) => ({ ...f, thoughts: e.target.value }))}
                placeholder="What did you think? Highlights, lowlights, would you go again?"
                className="bg-slate-800/50 border-orange-500/30 text-white min-h-[100px] text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">Cancel</Button>
            <Button onClick={saveEntry} disabled={!form.name.trim()} className="bg-orange-600 hover:bg-orange-500 text-white">
              {editingId ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-red-600/40 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-red-300">Delete entry?</DialogTitle></DialogHeader>
          <p className="text-slate-400 text-sm py-2">This can't be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-slate-400">Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && remove(confirmDeleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
