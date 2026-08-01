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
  Utensils,
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
const STORAGE_KEY = "food-in-cities-v1";

// ── Regions ───────────────────────────────────────────────────
// SVG paths (viewBox 0 0 100 100) — simplified state silhouettes
const REGION_SVG_PATHS: Record<string, string> = {
  // California silhouette (simplified)
  "bay-area":       "M 52,4 L 68,6 L 74,14 L 76,24 L 72,34 L 70,48 L 65,60 L 60,72 L 52,84 L 40,90 L 30,84 L 24,72 L 22,58 L 24,44 L 20,32 L 24,18 L 34,8 Z",
  "central-valley": "M 52,4 L 68,6 L 74,14 L 76,24 L 72,34 L 70,48 L 65,60 L 60,72 L 52,84 L 40,90 L 30,84 L 24,72 L 22,58 L 24,44 L 20,32 L 24,18 L 34,8 Z",
  // Nevada silhouette (trapezoid with angled bottom-left)
  "reno":           "M 20,6 L 80,6 L 86,18 L 86,76 L 52,94 L 20,76 Z",
};

// Highlight polygons showing the sub-region within the state shape
const REGION_HIGHLIGHT_PATHS: Record<string, string> = {
  // Bay Area — coastal/southern CA blob
  "bay-area":       "M 36,52 L 44,48 L 52,50 L 56,58 L 52,68 L 44,72 L 36,68 L 30,60 Z",
  // Central Valley — interior CA band
  "central-valley": "M 38,22 L 62,24 L 66,36 L 64,52 L 58,62 L 42,62 L 34,52 L 32,36 Z",
  // Reno — upper-left portion of Nevada
  "reno":           "M 22,10 L 52,10 L 52,46 L 30,50 L 22,40 Z",
};

const REGIONS = [
  {
    id: "bay-area",
    label: "Bay Area",
    emoji: "🌉",
    description: "San Jose, Los Altos, SF & surrounds",
    color: "#38bdf8",
    ringColor: "rgba(56,189,248,0.22)",
    stateName: "California",
    citiesMatch: [
      "san jose", "los altos", "livermore", "san francisco", "oakland",
      "berkeley", "fremont", "palo alto", "santa clara", "sunnyvale",
      "mountain view", "milpitas", "campbell", "saratoga", "cupertino",
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
  "Fine Dining", "Casual", "Breakfast", "Lunch", "Dinner",
  "Street Food", "Diner / Dive", "Brunch", "Coffee / Cafe",
  "Dessert", "Ice Cream", "Bar / Drinks", "Fast Food", "Seafood",
  "Steakhouse", "Sandwich / Deli",
  "Elote", "Tacos",
  "American", "Italian", "Japanese", "Mexican", "Chinese",
  "Vietnamese", "Thai", "Indian", "Mediterranean", "French",
  "Korean", "Middle Eastern", "Latin",
];

const TAG_COLORS: Record<string, string> = {
  "Fine Dining":    "bg-violet-500/20 text-violet-300 border-violet-500/40",
  "Casual":         "bg-sky-500/20 text-sky-300 border-sky-500/40",
  "Breakfast":      "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "Lunch":          "bg-teal-500/20 text-teal-300 border-teal-500/40",
  "Dinner":         "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  "Street Food":    "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "Diner / Dive":   "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "Brunch":         "bg-pink-500/20 text-pink-300 border-pink-500/40",
  "Coffee / Cafe":  "bg-rose-500/20 text-rose-300 border-rose-500/40",
  "Dessert":        "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  "Ice Cream":      "bg-sky-300/20 text-sky-200 border-sky-300/40",
  "Bar / Drinks":   "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "Fast Food":      "bg-red-400/20 text-red-300 border-red-400/40",
  "Elote":          "bg-yellow-700/20 text-yellow-300 border-yellow-700/40",
  "Tacos":          "bg-lime-600/20 text-lime-300 border-lime-600/40",
  "Steakhouse":     "bg-red-800/20 text-red-300 border-red-800/40",
  "Sandwich / Deli":"bg-amber-700/20 text-amber-300 border-amber-700/40",
  "American":       "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Italian":        "bg-green-500/20 text-green-300 border-green-500/40",
  "Japanese":       "bg-red-500/20 text-red-300 border-red-500/40",
  "Mexican":        "bg-lime-500/20 text-lime-300 border-lime-500/40",
  "Chinese":        "bg-red-600/20 text-red-300 border-red-600/40",
  "Vietnamese":     "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "Thai":           "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  "Indian":         "bg-orange-600/20 text-orange-300 border-orange-600/40",
  "Mediterranean":  "bg-sky-600/20 text-sky-300 border-sky-600/40",
  "French":         "bg-blue-600/20 text-blue-300 border-blue-600/40",
  "Korean":         "bg-purple-500/20 text-purple-300 border-purple-500/40",
  "Middle Eastern": "bg-amber-600/20 text-amber-300 border-amber-600/40",
  "Latin":          "bg-yellow-600/20 text-yellow-300 border-yellow-600/40",
};

// ── Types ────────────────────────────────────────────────────
interface StarRatings {
  food: number;    // 0–5
  ambience: number;
  price: number;
}

interface FoodEntry {
  id: string;
  name: string;         // restaurant name
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

function emptyEntry(): Omit<FoodEntry, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "", city: "", address: "",
    overallRating: 0,
    stars: { food: 0, ambience: 0, price: 0 },
    thoughts: "", tags: [], visitedAt: "",
  };
}

function load(): FoodEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function save(entries: FoodEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function avg(s: StarRatings): number {
  return Math.round(((s.food + s.ambience + s.price) / 3) * 10) / 10;
}

function deriveRegions(entry: FoodEntry): string[] {
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
  entries: FoodEntry[];
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
            {/* Glow on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 30%, ${region.ringColor} 0%, transparent 70%)` }}
            />

            {/* State SVG silhouette */}
            <div className="absolute right-3 top-3 opacity-25 group-hover:opacity-40 transition-opacity duration-200 pointer-events-none">
              <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
                {/* State outline */}
                <path
                  d={shapePath}
                  stroke={region.color}
                  strokeWidth="2.5"
                  fill={region.ringColor}
                />
                {/* Sub-region highlight */}
                {highlightPath && (
                  <path
                    d={highlightPath}
                    fill={region.color}
                    opacity="0.5"
                  />
                )}
              </svg>
            </div>

            {/* Content */}
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
                  {count} {count === 1 ? "place" : "places"}
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
const SEED_ENTRIES: FoodEntry[] = [
  {
    id: "food-eos-nyx-sanjose",
    name: "Eos & Nyx",
    city: "San Jose, CA",
    address: "201 S. Second St. Ste. 120, San Jose, CA 95113",
    overallRating: 3.6,
    stars: { food: 3.8, ambience: 4, price: 3 },
    thoughts: "Good food but small portions and a little overpriced. Ambience is good inside but bad outside. Comes with little complimentary sides which is a nice touch. Not a bad place but wouldn't go again over better options.",
    tags: ["Fine Dining", "American", "Dinner"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-cafe-rosalena-sanjose",
    name: "Cafe Rosalena",
    city: "San Jose, CA",
    address: "1077 The Alameda, San Jose, CA",
    overallRating: 2.7,
    stars: { food: 3, ambience: 2, price: 3 },
    thoughts: "Known for their big and famous breakfast burritos. Ton of filling and great value. Taste is fine, hits the spot, but not amazing or the best breakfast burrito I've had.",
    tags: ["Breakfast", "Casual", "Diner / Dive", "American"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-giving-pies-sanjose",
    name: "The Giving Pies",
    city: "San Jose, CA",
    address: "569 W Alma Ave, San Jose, CA 95125",
    overallRating: 3.2,
    stars: { food: 4.5, ambience: 2.5, price: 2.5 },
    thoughts: "Pies are mediocre but great coffee. Not worth it for a regular drip coffee, but their specialty drinks are the move — London Fog, vanilla chai, cookie butter latte. Can be made not overly sweet but still really good.",
    tags: ["Coffee / Cafe", "Dessert", "Casual"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-metro-balderas-sanjose",
    name: "Metro Balderas Taqueria",
    city: "San Jose, CA",
    address: "300 Willow St, San Jose, CA 95110",
    overallRating: 3.3,
    stars: { food: 4.3, ambience: 2, price: 3.5 },
    thoughts: "Solid authentic burritos. Very Hispanic neighborhood, feels like a real local spot. Good value and quality for what it is.",
    tags: ["Mexican", "Tacos", "Casual", "Street Food"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-la-original-paleteria-sanjose",
    name: "La Original Paleteria y Neveria",
    city: "San Jose, CA",
    address: "273 Willow St, San Jose, CA 95120",
    overallRating: 3.2,
    stars: { food: 4.5, ambience: 2, price: 3 },
    thoughts: "Authentic Mexican ice cream/paleteria vibes. Really good elote — one of the better ones. Solid Mexican ice cream and cold banana-type treats. Very niche place but great for what it does.",
    tags: ["Mexican", "Ice Cream", "Elote", "Dessert", "Casual"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-american-italian-deli-losaltos",
    name: "The American Italian Deli",
    city: "Los Altos, CA",
    address: "139 Main St, Los Altos, CA 94022",
    overallRating: 3.6,
    stars: { food: 4.2, ambience: 3, price: 3.5 },
    thoughts: "Nostalgic for me — been around since I was a kid. Solid deli and sandwich place, nothing flashy but consistently good. A classic.",
    tags: ["Sandwich / Deli", "Italian", "American", "Casual", "Lunch"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-western-village-steakhouse-sparks",
    name: "Western Village Steakhouse",
    city: "Sparks, NV",
    address: "815 Nichols Blvd, Sparks, NV 89434",
    overallRating: 4.7,
    stars: { food: 5, ambience: 4.5, price: 4.5 },
    thoughts: "Best restaurant I've had in my life, or at least up there. Insanely good quality across the board — great drinks, great food, great sides. Fun tableside 'on fire' coffee show. Complimentary palate cleansers throughout. For anniversaries they give you a free little dessert and a photo. Amazing price given the food quality.",
    tags: ["Steakhouse", "Fine Dining", "American", "Dinner"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "food-cattlemens-ca",
    name: "Cattlemens",
    city: "Multiple Locations, CA",
    address: "2882 Kitty Hawk Rd, Livermore, CA 94551 · 2000 Taylor Rd, Roseville, CA 95678 · 250 Dorset Dr, Dixon, CA 95620",
    overallRating: 3.8,
    stars: { food: 4.4, ambience: 3, price: 4 },
    thoughts: "The best place for a mid-range steakhouse vibe. Buffalo wings, prime rib tacos, steak, sweet potato, apple pie — solid great-tasting variety at very reasonable prices. Appetizers are the best part but the steaks are solid too. Great bang for your buck.",
    tags: ["Steakhouse", "American", "Dinner", "Casual"],
    visitedAt: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
];

// ── Component ────────────────────────────────────────────────
export default function FoodInCitiesPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  const [entries, setEntries] = useState<FoodEntry[]>(load);

  // "map" = region picker, "list" = entries for a region
  const [view, setView]                         = useState<"map" | "list">("map");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [search, setSearch]                     = useState("");
  const [activeTag, setActiveTag]               = useState<string | null>(null);
  const [sortBy, setSortBy]                     = useState<"food" | "ambience" | "price" | "overall">("food");
  const [dialogOpen, setDialogOpen]             = useState(false);
  const [editingId, setEditingId]               = useState<string | null>(null);
  const [form, setForm]                         = useState(emptyEntry());
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);

  // Seed once
  useEffect(() => {
    const key = "food-cities-seed-v4";
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
    if (sortBy === "overall")   return b.overallRating - a.overallRating;
    if (sortBy === "food")      return b.stars.food - a.stars.food;
    if (sortBy === "ambience")  return b.stars.ambience - a.stars.ambience;
    if (sortBy === "price")     return b.stars.price - a.stars.price;
    return 0;
  });

  function selectRegion(id: string) {
    setSelectedRegionId(id);
    setSearch("");
    setActiveTag(null);
    setSortBy("food");
    setView("list");
  }

  function backToMap() {
    setView("map");
    setSelectedRegionId(null);
    setSearch("");
    setActiveTag(null);
    setSortBy("food");
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyEntry());
    setDialogOpen(true);
  }

  function openEdit(e: FoodEntry) {
    setEditingId(e.id);
    setForm({ ...e });
    setDialogOpen(true);
  }

  function saveEntry() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const overall = avg(form.stars);
    setEntries((prev) => {
      let next: FoodEntry[];
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
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-pink-950" : "bg-gray-50"} ${!isMobile ? "pt-16" : ""} pb-24`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Back nav */}
          {view === "map" ? (
            <Link href="/explore">
              <a className="inline-flex items-center gap-2 text-slate-400 hover:text-pink-300 text-sm mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Explore
              </a>
            </Link>
          ) : (
            <button onClick={backToMap}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-pink-300 text-sm mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Map
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Utensils className="h-10 w-10 text-pink-400" />
              <h1 className="text-4xl font-serif font-bold text-pink-100">Food in Cities</h1>
            </div>
            <p className="text-pink-200/70 text-lg">Standout meals & restaurants discovered around the world</p>
          </div>

          {/* ── MAP VIEW ── */}
          {view === "map" && (
            <div>
              <p className="text-center text-slate-400 text-sm mb-6">Select a region to explore</p>
              <RegionPickerView entries={entries} onSelect={selectRegion} />
              <div className="flex justify-center mt-6">
                <button onClick={openAdd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm transition-colors">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm transition-colors shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search restaurants, tags…"
                  className="pl-9 bg-slate-800/60 border-pink-600/30 text-pink-50 placeholder:text-slate-500" />
              </div>

              {/* Tag filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setActiveTag(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === null ? "bg-pink-500/30 text-pink-200 border-pink-500/60" : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
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
                  ["🍽️ Food",      "food"],
                  ["🎭 Ambience",  "ambience"],
                  ["💰 Value",     "price"],
                  ["⭐ Overall",   "overall"],
                ] as [string, typeof sortBy][]).map(([label, key]) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${sortBy === key ? "bg-pink-500/30 text-pink-200 border-pink-500/60" : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:text-slate-300"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-pink-300/60 text-sm mb-3">
                {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                {activeTag && ` · tagged "${activeTag}"`}
              </p>

              {/* Empty */}
              {filtered.length === 0 && (
                <Card className="bg-slate-800/60 border-2 border-pink-600/40">
                  <CardContent className="p-12 text-center">
                    <Utensils className="h-16 w-16 text-pink-400/40 mx-auto mb-4" />
                    <h3 className="text-lg font-serif font-bold text-pink-100 mb-1">
                      {search || activeTag ? "No matches" : `No entries in ${selectedRegion.label} yet`}
                    </h3>
                    <p className="text-pink-300/70 text-sm mb-5">
                      {search || activeTag ? "Try a different search or tag." : "Be the first to log a meal here."}
                    </p>
                    {!search && !activeTag && (
                      <button onClick={openAdd}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm transition-colors">
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
                      className="bg-slate-800/60 border border-pink-600/30 hover:border-pink-500/60 transition-colors group cursor-pointer"
                      onClick={() => openEdit(e)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="text-pink-50 font-semibold font-serif leading-snug">{e.name}</h3>
                            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />{e.city}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-pink-300">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <StarDisplay value={e.stars.food} />
                          <span className="text-xs text-slate-500">food</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 mb-3 text-[11px] text-slate-400">
                          {([["🍽️ Food", e.stars.food], ["🎭 Ambience", e.stars.ambience], ["💰 Value", e.stars.price]] as [string, number][]).map(([label, val]) => (
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
        <DialogContent className="bg-slate-900 border-pink-600/40 text-pink-50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-pink-100">
              {editingId ? "Edit Entry" : "New Food Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-pink-200 text-sm mb-1.5 block">Restaurant Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Eos & Nyx" className="bg-slate-800/50 border-pink-500/30 text-white" />
              </div>
              <div>
                <Label className="text-pink-200 text-sm mb-1.5 block">City</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. San Jose, CA" className="bg-slate-800/50 border-pink-500/30 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-pink-200 text-sm mb-1.5 block">Address</Label>
              <Input value={form.address || ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address" className="bg-slate-800/50 border-pink-500/30 text-white" />
            </div>
            <div>
              <Label className="text-pink-200 text-sm mb-1.5 block">When did you visit?</Label>
              <Input value={form.visitedAt || ""} onChange={(e) => setForm((f) => ({ ...f, visitedAt: e.target.value }))}
                placeholder="e.g. July 2026" className="bg-slate-800/50 border-pink-500/30 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-pink-200 text-sm block">Ratings</Label>
              <div className="grid grid-cols-1 gap-2">
                {([
                  ["🍽️ Food Taste", "food"],
                  ["🎭 Ambience", "ambience"],
                  ["💰 Value", "price"],
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
              <Label className="text-pink-200 text-sm mb-2 block">Tags</Label>
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
              <Label className="text-pink-200 text-sm mb-1.5 block">Thoughts</Label>
              <Textarea value={form.thoughts} onChange={(e) => setForm((f) => ({ ...f, thoughts: e.target.value }))}
                placeholder="What did you think? Highlights, lowlights, would you return?"
                className="bg-slate-800/50 border-pink-500/30 text-white min-h-[100px] text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">Cancel</Button>
            <Button onClick={saveEntry} disabled={!form.name.trim()} className="bg-pink-600 hover:bg-pink-500 text-white">
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
