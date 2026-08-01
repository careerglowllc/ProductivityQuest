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
  Star,
  ArrowLeft,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEY = "food-in-cities-v1";

const ALL_TAGS = [
  "Fine Dining", "Casual", "Breakfast", "Lunch", "Dinner",
  "Street Food", "Diner / Dive", "Brunch", "Coffee / Cafe",
  "Dessert", "Bar / Drinks", "Fast Food", "Seafood",
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
  "Bar / Drinks":   "bg-slate-500/20 text-slate-300 border-slate-500/40",
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
];

// ── Component ────────────────────────────────────────────────
export default function FoodInCitiesPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  const [entries, setEntries] = useState<FoodEntry[]>(load);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEntry());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Seed entries once
  useEffect(() => {
    const key = "food-cities-seed-v1";
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

  // Persist
  useEffect(() => { save(entries); }, [entries]);

  // Filter
  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.name, e.city, e.address, e.thoughts, ...e.tags]
      .filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    const matchTag = !activeTag || e.tags.includes(activeTag);
    return matchSearch && matchTag;
  }).sort((a, b) => b.overallRating - a.overallRating);

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

          {/* Back */}
          <Link href="/explore">
            <a className="inline-flex items-center gap-2 text-slate-400 hover:text-pink-300 text-sm mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Explore
            </a>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Utensils className="h-10 w-10 text-pink-400" />
              <h1 className="text-4xl font-serif font-bold text-pink-100">Food in Cities</h1>
            </div>
            <p className="text-pink-200/70 text-lg">Standout meals & restaurants discovered around the world</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants, cities, tags…"
                className="pl-9 bg-slate-800/60 border-pink-600/30 text-pink-50 placeholder:text-slate-500"
              />
            </div>
            <Button onClick={openAdd} className="bg-pink-600 hover:bg-pink-500 text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add Entry
            </Button>
          </div>

          {/* Tag filter bar */}
          <div className="flex flex-wrap gap-2 mb-5">
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

          <p className="text-pink-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {activeTag && ` · tagged "${activeTag}"`}
          </p>

          {/* Empty state */}
          {filtered.length === 0 && (
            <Card className="bg-slate-800/60 border-2 border-pink-600/40">
              <CardContent className="p-12 text-center">
                <Utensils className="h-16 w-16 text-pink-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-pink-100 mb-1">
                  {search || activeTag ? "No matches" : "No entries yet"}
                </h3>
                <p className="text-pink-300/70 text-sm mb-5">
                  {search || activeTag ? "Try a different search or tag." : "Log your first memorable meal."}
                </p>
                {!search && !activeTag && (
                  <Button onClick={openAdd} className="bg-pink-600 hover:bg-pink-500 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Entry
                  </Button>
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
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="text-pink-50 font-semibold font-serif leading-snug">{e.name}</h3>
                        <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />{e.city}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-pink-300"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>

                    {/* Overall rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <StarDisplay value={e.overallRating} />
                      <span className="text-xs text-slate-500">overall</span>
                    </div>

                    {/* Sub-ratings */}
                    <div className="grid grid-cols-3 gap-1 mb-3 text-[11px] text-slate-400">
                      {([["🍽️ Food", e.stars.food], ["🎭 Ambience", e.stars.ambience], ["💰 Price", e.stars.price]] as [string, number][]).map(([label, val]) => (
                        <div key={label} className="bg-slate-900/40 rounded px-2 py-1">
                          <span className="block">{label}</span>
                          <span className="text-yellow-400 font-semibold">{val.toFixed(1)} ★</span>
                        </div>
                      ))}
                    </div>

                    {/* Thoughts */}
                    {e.thoughts && <p className="text-xs text-slate-400 line-clamp-3 mb-3">{e.thoughts}</p>}

                    {/* Tags */}
                    {e.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {e.tags.map((tag) => (
                          <span key={tag} className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${TAG_COLORS[tag] ?? "bg-slate-700/60 text-slate-300 border-slate-600/40"}`}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
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
                placeholder="e.g. July 2026, Summer 2025" className="bg-slate-800/50 border-pink-500/30 text-white" />
            </div>

            {/* Star ratings */}
            <div className="space-y-2">
              <Label className="text-pink-200 text-sm block">Ratings</Label>
              <div className="grid grid-cols-1 gap-2">
                {([
                  ["🍽️ Food Taste", "food"],
                  ["🎭 Ambience", "ambience"],
                  ["💰 Price (value)", "price"],
                ] as [string, keyof StarRatings][]).map(([label, field]) => (
                  <div key={field} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-300">{label}</span>
                    <StarPicker value={form.stars[field]} onChange={(v) => setStars(field, v)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">Overall avg: {avg(form.stars).toFixed(1)} / 5</p>
            </div>

            {/* Tags */}
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

            {/* Thoughts */}
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
