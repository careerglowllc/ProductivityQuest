import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChefHat,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Clock,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// ── Constants ────────────────────────────────────────────────
const STORAGE_KEY = "recipes-v1";

const ALL_TAGS = [
  "Quick", "Healthy", "Keto", "Vegetarian", "Vegan",
  "High Protein", "Meal Prep", "Comfort Food", "Breakfast",
  "Lunch", "Dinner", "Snack", "Dessert", "Budget",
];

const TAG_COLORS: Record<string, string> = {
  Quick:        "bg-sky-500/20 text-sky-300 border-sky-500/40",
  Healthy:      "bg-green-500/20 text-green-300 border-green-500/40",
  Keto:         "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Vegetarian:   "bg-lime-500/20 text-lime-300 border-lime-500/40",
  Vegan:        "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "High Protein":"bg-orange-500/20 text-orange-300 border-orange-500/40",
  "Meal Prep":  "bg-violet-500/20 text-violet-300 border-violet-500/40",
  "Comfort Food":"bg-rose-500/20 text-rose-300 border-rose-500/40",
  Breakfast:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  Lunch:        "bg-teal-500/20 text-teal-300 border-teal-500/40",
  Dinner:       "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  Snack:        "bg-pink-500/20 text-pink-300 border-pink-500/40",
  Dessert:      "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
  Budget:       "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
};

// ── Types ────────────────────────────────────────────────────
interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string;   // free-text, newline-separated
  instructions: string;  // free-text
  prepTime: string;      // e.g. "10 min"
  cookTime: string;      // e.g. "20 min"
  servings: string;      // e.g. "4"
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function emptyRecipe(): Omit<Recipe, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "", description: "", ingredients: "", instructions: "",
    prepTime: "", cookTime: "", servings: "", tags: [],
  };
}

function loadRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecipes(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

// ── Recipe emoji picker ──────────────────────────────────────
const EMOJI_RULES: [RegExp, string][] = [
  [/chicken\s*milanese|schnitzel|breaded\s*chicken/i, "🍗"],
  [/chicken/i, "🍗"],
  [/salmon|tuna|cod|tilapia|halibut|fish\s*taco/i, "🐟"],
  [/shrimp|prawn|lobster|crab|seafood/i, "🦐"],
  [/steak|beef|brisket|ribeye|sirloin/i, "🥩"],
  [/burger|hamburger/i, "🍔"],
  [/pizza/i, "🍕"],
  [/pasta|spaghetti|lasagna|fettuccine|penne|carbonara|bolognese/i, "🍝"],
  [/sushi|roll|maki|nigiri/i, "🍣"],
  [/taco|burrito|quesadilla|enchilada/i, "🌮"],
  [/soup|chili|stew|bisque|chowder/i, "🍲"],
  [/salad/i, "🥗"],
  [/sandwich|sub|wrap|panini/i, "🥪"],
  [/egg|omelette|omelet|frittata|quiche/i, "🍳"],
  [/pancake|waffle/i, "🥞"],
  [/bread|baguette|focaccia|sourdough/i, "🍞"],
  [/rice|fried\s*rice|risotto|paella/i, "🍚"],
  [/curry/i, "🍛"],
  [/noodle|ramen|pho|udon|pad\s*thai/i, "🍜"],
  [/dumpling|gyoza|potsticker/i, "🥟"],
  [/stir.?fry/i, "🥘"],
  [/roast|turkey|pork|lamb|chop/i, "🍖"],
  [/hot\s*dog|sausage|bratwurst/i, "🌭"],
  [/avocado|guacamole/i, "🥑"],
  [/potato|fries|hash\s*brown/i, "🥔"],
  [/broccoli|veggie|vegetable/i, "🥦"],
  [/corn/i, "🌽"],
  [/mushroom/i, "🍄"],
  [/lemon|lime/i, "🍋"],
  [/strawberry/i, "🍓"],
  [/banana|smoothie/i, "🍌"],
  [/apple|applesauce/i, "🍎"],
  [/mango/i, "🥭"],
  [/chocolate|brownie|fudge/i, "🍫"],
  [/cake|cupcake/i, "🎂"],
  [/cookie|biscuit/i, "🍪"],
  [/pie|tart/i, "🥧"],
  [/ice\s*cream|gelato|sorbet/i, "🍦"],
  [/donut|doughnut/i, "🍩"],
  [/muffin/i, "🧁"],
  [/granola|oatmeal|oat/i, "🥣"],
  [/yogurt/i, "🥛"],
  [/cheese/i, "🧀"],
  [/bacon/i, "🥓"],
  [/hot\s*sauce|salsa/i, "🌶️"],
];

function recipeEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return "🍽️"; // generic fallback
}

// ── Component ────────────────────────────────────────────────
export default function RecipesPage() {
  const isMobile = useIsMobile();
  const { isDark } = useTheme();

  const [recipes, setRecipes] = useState<Recipe[]>(loadRecipes);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Seed built-in recipes once
  useEffect(() => {
    const seedKey = "recipes-seed-v1";
    if (localStorage.getItem(seedKey)) return;
    const existing = loadRecipes();
    if (!existing.some((r) => r.name === "Chicken Milanese")) {
      const now = new Date().toISOString();
      const milanese: Recipe = {
        id: crypto.randomUUID(),
        name: "Chicken Milanese",
        description: "Crispy breaded chicken cutlets — quick to make, delicious served with pasta or an arugula salad and lemon wedges.",
        ingredients: [
          "2 large eggs",
          "Kosher salt and ground black pepper to taste",
          "¾ cup all-purpose flour",
          "1 cup Italian seasoned bread crumbs",
          "2 skinless, boneless chicken breast halves, thinly sliced",
          "¼ cup vegetable oil for frying",
          "1 lemon, cut into wedges",
        ].join("\n"),
        instructions: [
          "1. Preheat the oven to 200°F (95°C).",
          "2. Beat eggs with salt and pepper in a shallow dish. Spread flour in another shallow dish and bread crumbs in a third.",
          "3. Working one piece at a time, press chicken into flour and shake off excess. Dip into beaten egg, then press into bread crumbs. Toss lightly between your hands so excess falls away. Place on a plate — do not stack.",
          "4. Heat vegetable oil in a large skillet over medium heat. Pan-fry chicken in batches of 2–3 pieces until golden brown and cooked through, 2–4 minutes per side. Internal temperature should reach 165°F (74°C).",
          "5. Transfer cooked pieces to a baking sheet and keep warm in the oven while cooking the rest.",
          "6. Serve with lemon wedges.",
        ].join("\n"),
        prepTime: "15 min",
        cookTime: "15 min",
        servings: "4",
        tags: ["Quick", "High Protein", "Dinner", "Lunch"],
        createdAt: now,
        updatedAt: now,
      };
      const updated = [milanese, ...existing];
      saveRecipes(updated);
      setRecipes(updated);
    }
    localStorage.setItem(seedKey, "1");
  }, []);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRecipe());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Filtering ────────────────────────────────────────────
  const filtered = recipes.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.ingredients.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q));
    const matchesTag = !activeTag || r.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  // ── Handlers ─────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(emptyRecipe());
    setDialogOpen(true);
  }

  function openEdit(r: Recipe) {
    setEditingId(r.id);
    setForm({
      name: r.name, description: r.description,
      ingredients: r.ingredients, instructions: r.instructions,
      prepTime: r.prepTime, cookTime: r.cookTime,
      servings: r.servings, tags: [...r.tags],
    });
    setDialogOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    setRecipes((prev) => {
      let next: Recipe[];
      if (editingId) {
        next = prev.map((r) =>
          r.id === editingId ? { ...r, ...form, updatedAt: now } : r
        );
      } else {
        const newRecipe: Recipe = {
          id: crypto.randomUUID(),
          ...form,
          createdAt: now,
          updatedAt: now,
        };
        next = [newRecipe, ...prev];
      }
      saveRecipes(next);
      return next;
    });
    setDialogOpen(false);
  }

  function remove(id: string) {
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRecipes(next);
      return next;
    });
    setConfirmDeleteId(null);
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950"
          : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ChefHat className="h-10 w-10 text-orange-400" />
              <h1 className="text-4xl font-serif font-bold text-orange-100">Recipes</h1>
            </div>
            <p className="text-orange-200/70 text-lg">Your personal recipe collection</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes, ingredients…"
                className="pl-9 bg-slate-800/60 border-orange-600/30 text-orange-50 placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={openAdd}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New Recipe
            </Button>
          </div>

          {/* Tag filter bar */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeTag === null
                  ? "bg-orange-500/30 text-orange-200 border-orange-500/60"
                  : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:border-slate-500/60 hover:text-slate-300"
              }`}
            >
              All
            </button>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeTag === tag
                    ? (TAG_COLORS[tag] ?? "bg-slate-700 text-white border-slate-500")
                    : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:border-slate-500/60 hover:text-slate-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Recipe count */}
          <p className="text-orange-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
            {activeTag && ` · tagged "${activeTag}"`}
            {search.trim() && ` matching "${search.trim()}"`}
          </p>

          {/* Empty state */}
          {filtered.length === 0 && (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-orange-600/40">
              <CardContent className="p-12 text-center">
                <ChefHat className="h-16 w-16 text-orange-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-orange-100 mb-1">
                  {search.trim() || activeTag ? "No matches" : "No recipes yet"}
                </h3>
                <p className="text-orange-300/70 text-sm mb-5">
                  {search.trim() || activeTag
                    ? "Try a different search or tag."
                    : "Add your first recipe to get started."}
                </p>
                {!search.trim() && !activeTag && (
                  <Button onClick={openAdd} className="bg-orange-600 hover:bg-orange-500 text-white">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Recipe
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recipe grid */}
          {filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <Card
                  key={r.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-orange-600/30 hover:border-orange-500/60 transition-colors group cursor-pointer"
                  onClick={() => openEdit(r)}
                >
                  <CardContent className="p-4">
                    {/* Name + actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-orange-50 font-semibold font-serif leading-snug">
                        <span className="mr-1.5">{recipeEmoji(r.name)}</span>{r.name}
                      </h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); openEdit(r); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-orange-300"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(r.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">{r.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      {(r.prepTime || r.cookTime) && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {[r.prepTime && `Prep ${r.prepTime}`, r.cookTime && `Cook ${r.cookTime}`]
                            .filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {r.servings && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.servings} servings
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              TAG_COLORS[tag] ?? "bg-slate-700/60 text-slate-300 border-slate-600/40"
                            }`}
                          >
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
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-orange-600/40 text-orange-50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-orange-100">
              {editingId ? "Edit Recipe" : "New Recipe"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Recipe Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Garlic Butter Salmon"
                className="bg-slate-800/50 border-orange-500/30 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Short Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="One-line summary of the dish"
                className="bg-slate-800/50 border-orange-500/30 text-white"
              />
            </div>

            {/* Time + Servings */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-orange-200 text-sm mb-1.5 block">Prep Time</Label>
                <Input
                  value={form.prepTime}
                  onChange={(e) => setForm((f) => ({ ...f, prepTime: e.target.value }))}
                  placeholder="10 min"
                  className="bg-slate-800/50 border-orange-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-orange-200 text-sm mb-1.5 block">Cook Time</Label>
                <Input
                  value={form.cookTime}
                  onChange={(e) => setForm((f) => ({ ...f, cookTime: e.target.value }))}
                  placeholder="20 min"
                  className="bg-slate-800/50 border-orange-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-orange-200 text-sm mb-1.5 block">Servings</Label>
                <Input
                  value={form.servings}
                  onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                  placeholder="4"
                  className="bg-slate-800/50 border-orange-500/30 text-white"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-orange-200 text-sm mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.tags.includes(tag)
                        ? (TAG_COLORS[tag] ?? "bg-slate-700 text-white border-slate-500")
                        : "bg-slate-800/40 text-slate-400 border-slate-600/40 hover:border-slate-500/60 hover:text-slate-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Ingredients</Label>
              <Textarea
                value={form.ingredients}
                onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                placeholder={"2 salmon fillets\n2 tbsp butter\n3 cloves garlic…"}
                className="bg-slate-800/50 border-orange-500/30 text-white min-h-[100px] text-sm"
              />
            </div>

            {/* Instructions */}
            <div>
              <Label className="text-orange-200 text-sm mb-1.5 block">Instructions</Label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder={"1. Season salmon with salt and pepper.\n2. Melt butter in a pan…"}
                className="bg-slate-800/50 border-orange-500/30 text-white min-h-[140px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white"
            >
              {editingId ? "Save Changes" : "Add Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border-red-600/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-300">Delete Recipe?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm py-2">This can't be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && remove(confirmDeleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
