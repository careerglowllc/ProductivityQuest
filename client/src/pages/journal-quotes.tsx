import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Quote as QuoteIcon, Plus, Trash2, Search, Download, Pencil, Check, X, Undo2, Redo2 } from "lucide-react";
import { subscribeUserDataRefresh } from "@/lib/synced-storage";
import { downloadCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { JournalShell, JournalBackLink, JournalHero, RelatedJournalNav } from "@/components/journal-ui";
import { QUOTES_KEY, buildQuotesCSVExport, loadQuotes, type Quote } from "@/lib/quotes";

const newId = () => `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function JournalQuotesPage() {
  const { toast, dismiss } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>(() => loadQuotes());
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ text: "", author: "", source: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lastUndo, setLastUndo] = useState<{ label: string; undo: () => void } | null>(null);
  const [lastRedo, setLastRedo] = useState<{ label: string; redo: () => void } | null>(null);

  // Pick up quotes added on another device without needing a manual refresh.
  useEffect(() => subscribeUserDataRefresh(() => setQuotes(loadQuotes())), []);

  function persist(next: Quote[]) {
    setQuotes(next);
    try { localStorage.setItem(QUOTES_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
  }

  // Snapshot before a change so it can be restored via Undo, and re-applied via Redo.
  function persistWithUndo(next: Quote[], label: string) {
    const previous = quotes;
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

  function addQuote() {
    const body = text.trim();
    if (!body) return;
    persist([{ id: newId(), text: body, author: author.trim(), source: source.trim() || undefined, createdAt: new Date().toISOString() }, ...quotes]);
    setText("");
    setAuthor("");
    setSource("");
  }

  function startEdit(q: Quote) {
    setEditingId(q.id);
    setEdit({ text: q.text, author: q.author, source: q.source ?? "" });
  }

  function saveEdit(id: string) {
    const body = edit.text.trim();
    if (!body) return;
    const undo = persistWithUndo(quotes.map((q) => (q.id === id ? { ...q, text: body, author: edit.author.trim(), source: edit.source.trim() || undefined } : q)), "Edited quote");
    setEditingId(null);
    toast({ title: "Changes saved", duration: 5000, action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction> });
  }

  function remove(id: string) {
    const undo = persistWithUndo(quotes.filter((q) => q.id !== id), "Deleted quote");
    setConfirmDeleteId(null);
    toast({ title: "Quote deleted", duration: 5000, action: <ToastAction altText="Undo" onClick={() => { dismiss(); undo(); }}>Undo</ToastAction> });
  }

  function handleExport() {
    const { filename, content } = buildQuotesCSVExport();
    downloadCSV(filename.replace(/\.csv$/, `_${new Date().toISOString().slice(0, 10)}.csv`), content);
  }

  const query = search.trim().toLowerCase();
  const shown = quotes.filter((q) => !query || `${q.text} ${q.author} ${q.source ?? ""}`.toLowerCase().includes(query));
  const outline = "border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] text-[var(--jrnl-muted)] hover:border-[var(--jrnl-sage)] hover:text-[var(--jrnl-sage-deep)]";
  const field = "border-[var(--jrnl-line)] bg-[var(--jrnl-paper-2)] text-[var(--jrnl-ink)] placeholder:text-[var(--jrnl-muted)]";

  return (
    <JournalShell>
      <JournalBackLink />
      <JournalHero
        eyebrow="Words worth carrying"
        title="Inspirational"
        emphasis="quotes."
        copy="Your collection of quotes. One is picked at random each day for the dashboard, never repeating within a week."
        statValue={`${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"}`}
        statLabel="in this collection"
      />
      <RelatedJournalNav />

      {/* Composer */}
      <div className="mb-6 rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-[17px] shadow-[var(--jrnl-shadow)]">
        <strong className="mb-2.5 block text-[13px] text-[var(--jrnl-ink)]">Add a quote</strong>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Quote" placeholder="The quote…" className={field} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Author" placeholder="Author (optional)" className={field} />
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addQuote(); }}
            aria-label="Source"
            placeholder="Source, e.g. Meditations 5.16 (optional)"
            className={field}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          <Button onClick={handleExport} variant="outline" disabled={quotes.length === 0} className={outline}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => lastUndo?.undo()} variant="outline" disabled={!lastUndo} title={lastUndo?.label || "No changes to undo"} className={`${outline} disabled:opacity-40`}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Undo
          </Button>
          <Button onClick={() => lastRedo?.redo()} variant="outline" disabled={!lastRedo} title={lastRedo?.label ? `Redo: ${lastRedo.label}` : "No changes to redo"} className={`${outline} disabled:opacity-40`}>
            <Redo2 className="mr-1.5 h-4 w-4" /> Redo
          </Button>
          <Button onClick={addQuote} disabled={!text.trim()} className="bg-[var(--jrnl-sage)] font-semibold text-white hover:bg-[var(--jrnl-sage-deep)]">
            <Plus className="mr-1.5 h-4 w-4" /> Add quote
          </Button>
        </div>
      </div>

      {/* Search */}
      {quotes.length > 0 && (
        <div className="relative mb-4">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jrnl-muted)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotes, authors, sources…" aria-label="Search quotes" className={`${field} pl-9`} />
        </div>
      )}

      <p className="dash-mono mb-3 normal-case text-[var(--jrnl-muted)]">
        {shown.length} {shown.length === 1 ? "quote" : "quotes"}
        {query && ` matching "${search.trim()}"`}
      </p>

      {/* List */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--jrnl-line)] bg-[var(--jrnl-paper)]/40 p-12 text-center">
          <QuoteIcon aria-hidden className="mx-auto mb-3 h-9 w-9 text-[var(--jrnl-ochre)] opacity-50" />
          <h2 className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">{query ? "Nothing found here." : "No quotes yet."}</h2>
          <p className="mt-1 text-xs text-[var(--jrnl-muted)]">{query ? "Try another word or clear your search." : "Add a quote above and it joins the daily rotation."}</p>
        </div>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {shown.map((q) => (
            <article key={q.id} className="group flex items-start gap-3.5 rounded-lg border border-[var(--jrnl-line)] border-l-[3px] border-l-[var(--jrnl-ochre)] bg-[var(--jrnl-paper)] p-4 transition-colors hover:shadow-[var(--jrnl-shadow)] focus-within:shadow-[var(--jrnl-shadow)]">
              {editingId === q.id ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} aria-label="Quote" className={`min-h-[80px] ${field}`} autoFocus />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={edit.author} onChange={(e) => setEdit({ ...edit, author: e.target.value })} aria-label="Author" placeholder="Author" className={field} />
                    <Input value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} aria-label="Source" placeholder="Source" className={field} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="border-[var(--jrnl-line)]"><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" className="bg-[var(--jrnl-sage)] text-white hover:bg-[var(--jrnl-sage-deep)]" onClick={() => saveEdit(q.id)}><Check className="mr-1 h-3.5 w-3.5" /> Save changes</Button>
                  </div>
                </div>
              ) : (
                <>
                  <QuoteIcon aria-hidden className="mt-1 h-4 w-4 shrink-0 text-[var(--jrnl-ochre)]" />
                  <blockquote className="min-w-0 flex-1">
                    <p className="jrnl-display whitespace-pre-wrap text-[17px] leading-snug text-[var(--jrnl-ink)]">“{q.text}”</p>
                    {(q.author || q.source) && (
                      <footer className="mt-2 text-[11px] text-[var(--jrnl-muted)]">
                        {q.author && <span className="font-semibold">{q.author}</span>}
                        {q.author && q.source && <span> · </span>}
                        {q.source && <span>{q.source}</span>}
                      </footer>
                    )}
                  </blockquote>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button onClick={() => startEdit(q)} className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-sage-soft)] hover:text-[var(--jrnl-sage-deep)]" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setConfirmDeleteId(q.id)} className="dash-focus rounded-md p-1.5 text-[var(--jrnl-muted)] hover:bg-[var(--jrnl-rose-soft)] hover:text-[var(--jrnl-rose)]" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div role="dialog" aria-modal="true" aria-labelledby="quote-delete-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-full max-w-sm rounded-xl border border-[var(--jrnl-line)] bg-[var(--jrnl-paper)] p-6 shadow-[var(--jrnl-shadow)]" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="quote-delete-title" className="jrnl-display text-[26px] text-[var(--jrnl-ink)]">Remove this quote?</h2>
            <p className="mt-1 text-xs text-[var(--jrnl-muted)]">It leaves the daily rotation. You can undo the change afterwards.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="border-[var(--jrnl-line)]">Keep quote</Button>
              <Button className="bg-[var(--jrnl-rose)] text-white hover:opacity-90" onClick={() => remove(confirmDeleteId)}>Delete quote</Button>
            </div>
          </div>
        </div>
      )}
    </JournalShell>
  );
}
