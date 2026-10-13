import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Plus, Trash2, Search, Download, Pencil, Check, X, Undo2, Redo2 } from "lucide-react";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { downloadCSV } from "@/lib/csv-export";
import { EmojiPicker } from "@/components/emoji-picker";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AttachmentArea } from "@/components/attachment-area";
import type { QuestAttachment } from "@/lib/attachments";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";
import {
  EXCITEMENT_KEY, THOUGHTS_KEY, SPARK_KIND_LABEL, buildSparks, buildSparksCSVExport, countSparks, filterSparks,
  loadExcitements, loadGlewExciteds, loadThoughts,
  type ExcitementEntry, type Spark, type SparkFilter, type SparkKind, type Thought,
} from "@/lib/journal-sparks";

type Lists = { excitements: ExcitementEntry[]; thoughts: Thought[] };
type Snapshot = { label: string; undo: () => void };
type Redoable = { label: string; redo: () => void };

const FILTERS: { key: SparkFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "excitement", label: "Excitement" },
  { key: "thought", label: "Empowering thoughts" },
  { key: "glew", label: "From Daily GLEW" },
];
const EDGE: Record<SparkKind, string> = {
  excitement: "border-l-[var(--jrnl-ochre)]",
  thought: "border-l-[var(--jrnl-sage)]",
  glew: "border-l-[var(--jrnl-rose)]",
};

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const fmtSparkDate = (s: Spark) => (s.kind === "glew" ? fmtDate(`${s.date}T12:00:00`) : fmtDate(s.date));

const loadLists = (): Lists => ({ excitements: loadExcitements(), thoughts: loadThoughts() });

export default function JournalSparksPage() {
  const { toast, dismiss } = useToast();
  const [lists, setLists] = useState<Lists>(loadLists);
  const [glew, setGlew] = useState(loadGlewExciteds);
  const [filter, setFilter] = useState<SparkFilter>("all");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"excitement" | "thought">("excitement");
  const [draft, setDraft] = useState("");
  const [draftDetails, setDraftDetails] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<QuestAttachment[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Spark | null>(null);
  const [editing, setEditing] = useState<Spark | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editUpdateDate, setEditUpdateDate] = useState(false);
  const [editAttachments, setEditAttachments] = useState<QuestAttachment[]>([]);
  const [lastUndo, setLastUndo] = useState<Snapshot | null>(null);
  const [lastRedo, setLastRedo] = useState<Redoable | null>(null);

  // Pick up entries added on another device, and Daily GLEW changes, without a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => { setLists(loadLists()); setGlew(loadGlewExciteds()); }), []);

  const sparks = useMemo(() => buildSparks({ ...lists, glew }), [lists, glew]);
  const counts = countSparks(sparks);
  const shown = filterSparks(sparks, filter, search);

  function persist(next: Lists) {
    setLists(next);
    try {
      localStorage.setItem(EXCITEMENT_KEY, JSON.stringify(next.excitements));
      localStorage.setItem(THOUGHTS_KEY, JSON.stringify(next.thoughts));
    } catch { /* storage full or blocked */ }
  }

  // Snapshot the current lists before a change so it can be restored via Undo, and re-applied via Redo.
  function persistWithUndo(next: Lists, label: string) {
    const previous = lists;
    persist(next);
    setLastRedo(null);
    const undo = () => {
      persist(previous);
      setLastUndo(null);
      const redo = () => {
        persist(next);
        setLastRedo(null);
        setLastUndo({ label, undo });
        toast({ title: "Change redone", duration: 2000 });
      };
      setLastRedo({ label, redo });
      toast({ title: "Change undone", duration: 2000 });
    };
    setLastUndo({ label, undo });
    return undo;
  }

  function addEntry() {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toISOString();
    if (kind === "excitement") {
      persist({ ...lists, excitements: [{ id: newId("excitement"), text, createdAt: now, emoji: draftEmoji || undefined, attachments: draftAttachments }, ...lists.excitements] });
    } else {
      persist({ ...lists, thoughts: [{ id: newId("thought"), title: text, description: draftDetails.trim(), createdAt: now, updatedAt: now, attachments: draftAttachments }, ...lists.thoughts] });
    }
    setDraft("");
    setDraftDetails("");
    setDraftEmoji("");
    setDraftAttachments([]);
  }

  function remove(spark: Spark) {
    const label = spark.kind === "thought" ? "Deleted empowering thought" : "Deleted excitement entry";
    const undo = persistWithUndo({
      excitements: lists.excitements.filter((e) => !(spark.kind === "excitement" && e.id === spark.id)),
      thoughts: lists.thoughts.filter((t) => !(spark.kind === "thought" && t.id === spark.id)),
    }, label);
    setConfirmDelete(null);
    toast({ title: "Entry deleted", duration: 5000, action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction> });
  }

  function updateEmoji(id: string, emoji: string) {
    persistWithUndo({ ...lists, excitements: lists.excitements.map((e) => (e.id === id ? { ...e, emoji } : e)) }, "Changed emoji");
  }

  function startEdit(spark: Spark) {
    setEditing(spark);
    setEditTitle(spark.title ?? "");
    setEditText(spark.text);
    setEditUpdateDate(false);
    setEditAttachments(spark.attachments || []);
  }

  function cancelEdit() {
    setEditing(null);
    setEditTitle("");
    setEditText("");
    setEditUpdateDate(false);
    setEditAttachments([]);
  }

  function saveEdit() {
    if (!editing) return;
    const now = new Date().toISOString();
    let next: Lists;
    if (editing.kind === "thought") {
      next = { ...lists, thoughts: lists.thoughts.map((t) => (t.id === editing.id ? { ...t, title: editTitle.trim() || "Untitled Thought", description: editText, updatedAt: now, attachments: editAttachments } : t)) };
    } else {
      const text = editText.trim();
      if (!text) return;
      next = { ...lists, excitements: lists.excitements.map((e) => (e.id === editing.id ? { ...e, text, createdAt: editUpdateDate ? now : e.createdAt, attachments: editAttachments } : e)) };
    }
    const undo = persistWithUndo(next, editing.kind === "thought" ? "Edited empowering thought" : "Edited excitement entry");
    cancelEdit();
    toast({ title: "Changes saved", duration: 5000, action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction> });
  }

  function handleExport() {
    const { filename, content } = buildSparksCSVExport(shown);
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  const outlineButton = "border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]";

  return (
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="What lights you up and holds you steady"
        title="Sparks,"
        emphasis="kept close."
        copy="What you're excited about and the empowering thoughts you're reinforcing, plus every Excited from your Daily GLEW, together in one place."
        statValue={`${counts.all} ${counts.all === 1 ? "spark" : "sparks"}`}
        statLabel="in this quiet collection"
      />
      <RelatedJournalNav />

      {/* Composer */}
      <div className="mb-6 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-[17px] shadow-[var(--jrnl-shadow)]">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="What are you adding?" className="flex gap-1.5">
            {([["excitement", "Excitement"], ["thought", "Empowering thought"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={`dash-focus rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  kind === value
                    ? "border-[var(--jrnl-sage)] bg-[var(--jrnl-sage-soft)] text-[var(--jrnl-sage-deep)]"
                    : "border-[var(--jrnl-line)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[var(--jrnl-muted)]">Press Enter to add</span>
        </div>
        <div className="flex items-start gap-2">
          {kind === "excitement" && (
            <span className="mt-0.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
              <EmojiPicker value={draftEmoji} onChange={setDraftEmoji} size="md" />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <AttachmentArea attachments={draftAttachments} onChange={setDraftAttachments} showHint={false}>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }}
                aria-label={kind === "excitement" ? "What are you excited about?" : "Your empowering thought"}
                placeholder={kind === "excitement" ? "I'm excited for…" : "e.g. I am capable of figuring things out"}
                className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
              />
            </AttachmentArea>
            {kind === "thought" && (
              <Textarea
                value={draftDetails}
                onChange={(e) => setDraftDetails(e.target.value)}
                rows={3}
                aria-label="Why this thought matters (optional)"
                placeholder="Why this thought matters to you, evidence that supports it, when to remember it… (optional)"
                className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
              />
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          <Button onClick={handleExport} variant="outline" disabled={shown.length === 0} className={outlineButton}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => lastUndo?.undo()} variant="outline" disabled={!lastUndo} title={lastUndo?.label || "No changes to undo"} className={`${outlineButton} disabled:opacity-40`}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Undo
          </Button>
          <Button onClick={() => lastRedo?.redo()} variant="outline" disabled={!lastRedo} title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"} className={`${outlineButton} disabled:opacity-40`}>
            <Redo2 className="mr-1.5 h-4 w-4" /> Redo
          </Button>
          <Button onClick={addEntry} className="bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
            <Plus className="mr-1.5 h-4 w-4" /> Add entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div role="group" aria-label="Show" className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`dash-focus whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] transition-colors ${
              filter === key
                ? "border-[var(--jrnl-rose)] bg-[var(--jrnl-rose-soft)] font-semibold text-[var(--jrnl-ink)]"
                : "border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-rose)]"
            }`}
          >
            {label} <span className="opacity-60">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      {sparks.length > 0 && (
        <div className="relative mb-4">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your sparks…"
            aria-label="Search sparks"
            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] pl-9 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
          />
        </div>
      )}

      <p className="dash-mono mb-3 normal-case text-[var(--jrnl-muted)]">
        {shown.length} {shown.length === 1 ? "entry" : "entries"}
        {search.trim() && ` matching "${search.trim()}"`}
      </p>

      {/* List */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <Zap aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-ochre)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">
            {search.trim() ? "Nothing found here." : filter === "glew" ? "No Exciteds in your Daily GLEW yet." : "Leave a first small note."}
          </h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">
            {search.trim() ? "Try another word or clear your search." : filter === "glew" ? "Anything you add under Exciteds there shows up here on its own." : "What's coming up that you can't wait for, or what do you want to keep believing?"}
          </p>
        </div>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {shown.map((s) => {
            const isEditing = editing?.key === s.key;
            return (
              <article
                key={s.key}
                className={`group flex items-start gap-3.5 rounded-lg border border-[var(--jrnl-line)] border-l-[3px] ${EDGE[s.kind]} bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)] focus-within:shadow-[var(--jrnl-shadow)]`}
              >
                {isEditing ? (
                  <div className="min-w-0 flex-1 space-y-3">
                    <AttachmentArea attachments={editAttachments} onChange={setEditAttachments}>
                      {s.kind === "thought" ? (
                        <div className="space-y-2">
                          <Input
                            value={editTitle}
                            onChange={(ev) => setEditTitle(ev.target.value)}
                            aria-label="Thought"
                            className="border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)]"
                            autoFocus
                          />
                          <Textarea
                            value={editText}
                            onChange={(ev) => setEditText(ev.target.value)}
                            aria-label="Why this thought matters"
                            className="min-h-[80px] border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
                          />
                        </div>
                      ) : (
                        <Textarea
                          value={editText}
                          onChange={(ev) => setEditText(ev.target.value)}
                          aria-label="Excitement entry"
                          className="min-h-[80px] border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] pr-10 text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]"
                          autoFocus
                        />
                      )}
                    </AttachmentArea>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {s.kind === "excitement" ? (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--jrnl-muted)]">
                          <Checkbox checked={editUpdateDate} onCheckedChange={(c) => setEditUpdateDate(c === true)} />
                          Update date to today
                        </label>
                      ) : <span />}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="border-[var(--jrnl-line)]">
                          <X className="mr-1 h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button size="sm" className="bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]" onClick={saveEdit}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Save changes
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {s.kind === "excitement" && (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--jrnl-rose-soft)] text-[var(--jrnl-ochre)]" onClick={(ev) => ev.stopPropagation()}>
                        <EmojiPicker value={s.emoji || ""} onChange={(emoji) => updateEmoji(s.id, emoji)} size="sm" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      {s.kind === "thought" ? (
                        <>
                          <h3 className="jrnl-display text-[19px] text-[var(--jrnl-ink)]">{s.title}</h3>
                          {s.text && <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--jrnl-muted)]">{s.text}</p>}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap text-[14px] text-[var(--jrnl-ink)]">{s.text}</p>
                      )}
                      {s.attachments && s.attachments.length > 0 && (
                        <div className="mt-2" onClick={(ev) => ev.stopPropagation()}>
                          <AttachmentArea attachments={s.attachments} onChange={() => {}} disabled showHint={false}>
                            {null}
                          </AttachmentArea>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--jrnl-muted)]">
                        <span>{fmtSparkDate(s)}</span>
                        <i aria-hidden className="h-[3px] w-[3px] rounded-full bg-[var(--jrnl-line)]" />
                        <span>{SPARK_KIND_LABEL[s.kind]}</span>
                      </div>
                    </div>
                    {s.kind === "glew" ? (
                      <Link href="/journal/daily-glew">
                        <a className="dash-focus shrink-0 rounded text-[11px] font-semibold text-[var(--jrnl-sage-deep)] hover:underline" title="Edit this on the Daily GLEW page">
                          Open Daily GLEW
                        </a>
                      </Link>
                    ) : (
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button onClick={() => startEdit(s)} className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(s)} className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="spark-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div className="w-full max-w-sm rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-6 shadow-[var(--jrnl-shadow)]" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="spark-delete-title" className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">Let this one go?</h2>
            <p className="mt-1 text-xs text-[var(--jrnl-muted)]">This entry will be removed from your collection. You can undo the change afterwards.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} className="border-[var(--jrnl-line)]">Keep entry</Button>
              <Button className="bg-[var(--jrnl-rose)] text-white hover:opacity-90" onClick={() => remove(confirmDelete)}>Delete entry</Button>
            </div>
          </div>
        </div>
      )}
    </JournalShell>
  );
}
