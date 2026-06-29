import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  Briefcase,
  Heart,
  Pencil,
  Trash2,
  Sparkles,
  Clock,
  HelpCircle,
  Linkedin,
  Smartphone,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";

// ── Constants ───────────────────────────────────────────────
const STORAGE_KEY = "npcs-v1";
const SEED_KEY = "npcs-seed-daniela-v1";

// Relationship categories with accent colors
const CATEGORIES = [
  "Dating",
  "Friend",
  "Professional",
  "Family",
  "Mentor",
  "Acquaintance",
  "Other",
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<string, string> = {
  Dating: "bg-pink-500/20 text-pink-200 border-pink-500/40",
  Friend: "bg-green-500/20 text-green-200 border-green-500/40",
  Professional: "bg-blue-500/20 text-blue-200 border-blue-500/40",
  Family: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  Mentor: "bg-purple-500/20 text-purple-200 border-purple-500/40",
  Acquaintance: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  Other: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
};

// ── Types ────────────────────────────────────────────────────
type NPC = {
  id: string;
  name: string;
  phone?: string;
  occupation?: string;
  location?: string;
  howWeMet?: string;
  category?: Category;
  notes?: string;
  tags?: string[]; // source labels e.g. "phone", "linkedin"
  createdAt: string;
  updatedAt?: string; // last modified (added/edited/imported) — helps dedupe old vs new
};

// Accent colors for source tags
const TAG_STYLES: Record<string, string> = {
  phone: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  linkedin: "bg-sky-500/20 text-sky-200 border-sky-500/40",
};
const tagStyle = (t: string) =>
  TAG_STYLES[t.toLowerCase()] || "bg-slate-500/20 text-slate-200 border-slate-500/40";

// ── Helpers ──────────────────────────────────────────────────
function newId() {
  return `npc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Short, friendly date like "Jun 28, 2026" — empty for missing/invalid
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Format a 10-digit US phone as (408) 470-8553; leave other formats untouched
function formatPhone(raw?: string) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

function telHref(raw?: string) {
  if (!raw) return "";
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DANIELA: NPC = {
  id: "npc-daniela-dibono",
  name: "Daniela Dibono",
  phone: "4084708553",
  occupation: "Associate Marriage & Family Therapist",
  location: "San Jose, CA",
  howWeMet: "Hinge (dating app)",
  category: "Dating",
  notes: "",
  createdAt: "2026-06-24T00:00:00.000Z",
};

const EMPTY_FORM: NPC = {
  id: "",
  name: "",
  phone: "",
  occupation: "",
  location: "",
  howWeMet: "",
  category: "Friend",
  notes: "",
  tags: [],
  createdAt: "",
};

// ── Component ────────────────────────────────────────────────
export default function NPCsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  const [contacts, setContacts] = useState<NPC[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NPC>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // One-time seed: add Daniela Dibono as the first contact
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEED_KEY)) {
        setContacts((prev) => {
          if (prev.some((c) => c.id === DANIELA.id)) return prev;
          return [DANIELA, ...prev];
        });
        localStorage.setItem(SEED_KEY, "1");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time backfill: ensure every contact has an updatedAt (default to createdAt)
  useEffect(() => {
    setContacts((prev) => {
      if (prev.every((c) => c.updatedAt)) return prev;
      return prev.map((c) => (c.updatedAt ? c : { ...c, updatedAt: c.createdAt }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch {}
  }, [contacts]);

  const filtered = contacts
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [c.name, c.occupation, c.location, c.howWeMet, c.category, c.notes, c.phone, ...(c.tags || [])]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(c: NPC) {
    setForm({ ...c });
    setEditingId(c.id);
    setDialogOpen(true);
  }

  function saveContact() {
    const name = form.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    if (editingId) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...form, name, updatedAt: now } : c))
      );
    } else {
      setContacts((prev) => [
        { ...form, name, id: newId(), createdAt: now, updatedAt: now },
        ...prev,
      ]);
    }
    setDialogOpen(false);
    setEditingId(null);
  }

  function deleteContact(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      {/* Starfield Background Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-40 left-1/4 w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }}></div>
        <div className="absolute top-32 right-1/2 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Users className="h-10 w-10 text-blue-400" />
              <h1 className="text-4xl font-serif font-bold text-yellow-100">NPCs</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Your Network &amp; Relationships Rolodex</p>
            <button
              onClick={() => setHelpOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 hover:underline mx-auto"
            >
              <HelpCircle className="h-4 w-4" /> How to add contacts
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, location, how you met…"
                className="pl-9 bg-slate-800/60 border-blue-600/30 text-blue-50 placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shrink-0"
            >
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Contact
            </Button>
          </div>

          {/* Count */}
          <p className="text-blue-300/60 text-sm mb-3">
            {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
            {search.trim() && ` matching “${search.trim()}”`}
          </p>

          {/* Contact grid */}
          {filtered.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-md border-2 border-blue-600/40">
              <CardContent className="p-12 text-center">
                <UserPlus className="h-16 w-16 text-blue-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-serif font-bold text-blue-100 mb-1">
                  {search.trim() ? "No matches" : "Your rolodex is empty"}
                </h3>
                <p className="text-blue-300/70 text-sm mb-5">
                  {search.trim()
                    ? "Try a different search term."
                    : "Add your first contact to start building your network."}
                </p>
                {!search.trim() && (
                  <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white">
                    <UserPlus className="h-4 w-4 mr-1.5" /> Add Contact
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((c) => (
                <Card
                  key={c.id}
                  className="bg-slate-800/60 backdrop-blur-md border border-blue-600/30 hover:border-blue-500/60 transition-colors group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 border border-blue-400/40 flex items-center justify-center shrink-0">
                        <span className="text-blue-100 font-bold text-sm">{initials(c.name)}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-blue-50 font-semibold truncate">{c.name}</h3>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {c.category && (
                                <span
                                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    CATEGORY_STYLES[c.category] || CATEGORY_STYLES.Other
                                  }`}
                                >
                                  {c.category}
                                </span>
                              )}
                              {(c.tags || []).map((t) => (
                                <span
                                  key={t}
                                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${tagStyle(t)}`}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-2 space-y-1.5 text-sm">
                          {c.occupation && (
                            <p className="flex items-center gap-2 text-slate-300">
                              <Briefcase className="h-3.5 w-3.5 text-blue-400/70 shrink-0" />
                              <span className="truncate">{c.occupation}</span>
                            </p>
                          )}
                          {c.location && (
                            <p className="flex items-center gap-2 text-slate-300">
                              <MapPin className="h-3.5 w-3.5 text-blue-400/70 shrink-0" />
                              <span className="truncate">{c.location}</span>
                            </p>
                          )}
                          {c.phone && (
                            <a
                              href={telHref(c.phone)}
                              className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 hover:underline w-fit"
                            >
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatPhone(c.phone)}</span>
                            </a>
                          )}
                          {c.howWeMet && (
                            <p className="flex items-center gap-2 text-slate-400">
                              <Heart className="h-3.5 w-3.5 text-pink-400/70 shrink-0" />
                              <span className="truncate">Met via {c.howWeMet}</span>
                            </p>
                          )}
                        </div>

                        {c.notes && (
                          <p className="mt-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">
                            {c.notes}
                          </p>
                        )}

                        {(c.createdAt || c.updatedAt) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                            {c.createdAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Added {fmtDate(c.createdAt)}
                              </span>
                            )}
                            {c.updatedAt && c.updatedAt !== c.createdAt && (
                              <span className="flex items-center gap-1">
                                <Pencil className="h-3 w-3" /> Updated {fmtDate(c.updatedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border border-blue-600/40 text-blue-50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-blue-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              {editingId ? "Edit Contact" : "New Contact"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-blue-200/80 text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-blue-200/80 text-xs">Phone</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(408) 470-8553"
                  className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
                />
              </div>
              <div>
                <Label className="text-blue-200/80 text-xs">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as Category }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-blue-50 mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-blue-50">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-blue-200/80 text-xs">Occupation</Label>
              <Input
                value={form.occupation || ""}
                onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                placeholder="e.g. Associate Marriage & Family Therapist"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
              />
            </div>

            <div>
              <Label className="text-blue-200/80 text-xs">Location</Label>
              <Input
                value={form.location || ""}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. San Jose, CA"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
              />
            </div>

            <div>
              <Label className="text-blue-200/80 text-xs">How we met</Label>
              <Input
                value={form.howWeMet || ""}
                onChange={(e) => setForm((f) => ({ ...f, howWeMet: e.target.value }))}
                placeholder="e.g. Hinge (dating app)"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
              />
            </div>

            <div>
              <Label className="text-blue-200/80 text-xs">Tags (source)</Label>
              <Input
                value={(form.tags || []).join(", ")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="e.g. phone, linkedin"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1"
              />
            </div>

            <div>
              <Label className="text-blue-200/80 text-xs">Notes</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Anything worth remembering…"
                className="bg-slate-800 border-slate-700 text-blue-50 mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={saveContact}
              disabled={!form.name.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {editingId ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-900 border border-red-600/40 text-blue-50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-200">Delete contact?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            This will permanently remove{" "}
            <span className="font-semibold text-white">
              {contacts.find((c) => c.id === confirmDeleteId)?.name}
            </span>{" "}
            from your rolodex.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteId(null)}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmDeleteId && deleteContact(confirmDeleteId)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How to add contacts help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="bg-slate-900 border border-blue-600/40 text-blue-50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-blue-100 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-400" />
              How to add contacts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 text-sm">
            <p className="text-slate-300">
              Add contacts one-by-one with <span className="text-blue-200 font-medium">Add Contact</span>, or
              bulk-import an exported file. Imported contacts get a source tag (
              <span className="text-emerald-300">phone</span> /{" "}
              <span className="text-sky-300">linkedin</span>) so you can tell them apart later.
            </p>

            {/* LinkedIn */}
            <div className="rounded-lg border border-sky-600/30 bg-sky-950/30 p-3">
              <h4 className="flex items-center gap-2 font-semibold text-sky-200 mb-2">
                <Linkedin className="h-4 w-4" /> From LinkedIn (1st-degree connections)
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Click your <strong>Me</strong> icon at top of the LinkedIn homepage.</li>
                <li>Select <strong>Settings &amp; Privacy</strong>.</li>
                <li>Click <strong>Data privacy</strong> on the left.</li>
                <li>Under “How LinkedIn uses your data,” click <strong>Get a copy of your data</strong>.</li>
                <li>Check <strong>Download larger data archive</strong> (includes connections) → <strong>Request archive</strong>.</li>
                <li>You’ll get an email link within 24 hours.</li>
                <li>Unzip and open <strong>Connections.csv</strong> — that’s your file.</li>
              </ol>
            </div>

            {/* iPhone */}
            <div className="rounded-lg border border-emerald-600/30 bg-emerald-950/30 p-3">
              <h4 className="flex items-center gap-2 font-semibold text-emerald-200 mb-2">
                <Smartphone className="h-4 w-4" /> From iPhone
              </h4>
              <p className="text-slate-300 mb-1.5 font-medium">Fastest — a phone app:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Install <strong>Export Contacts</strong> (or Export Contacts by Covve) from the App Store.</li>
                <li>Open it and allow contacts access.</li>
                <li>Tap <strong>Export to CSV</strong> (some apps say “Export to Excel/CSV”).</li>
                <li>Save to your phone or share via email / AirDrop.</li>
              </ol>
              <p className="text-slate-400 mt-2 text-xs">
                Free alt: export iCloud contacts as a vCard (.vcf) on a computer, then convert to CSV.
              </p>
            </div>

            <p className="text-slate-400 text-xs">
              Once you have a CSV/VCF, send it over and it’ll be merged into your rolodex —
              de-duped by name + phone and stamped with today’s date.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setHelpOpen(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
