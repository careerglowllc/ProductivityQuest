import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Check, Compass, Dumbbell, HeartHandshake, LockKeyhole, Pencil, Plus, Radar, RefreshCw, Trash2, Wallet } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCommandEntries } from "@/components/command-center/use-command-entries";
import { AttentionAllocation, Section, StrategyBriefing } from "@/components/command-center/briefing";
import { EntryForm } from "@/components/command-center/entry-form";
import { ImportBriefing } from "@/components/command-center/import-briefing";
import type { CommandEntry, CommandEntryInput } from "@shared/command-center";
import "@/components/command-center/command-center.css";

const categories = [
  { id: "finance", label: "Financial strategy", code: "01 / CAPITAL", icon: Wallet },
  { id: "mental-health", label: "Mental health", code: "02 / CLARITY", icon: Brain },
  { id: "fitness", label: "Physical fitness", code: "03 / CAPACITY", icon: Dumbbell },
  { id: "relationships", label: "Relationships", code: "04 / CONNECTION", icon: HeartHandshake },
] as const;
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function CommandCenter() {
  const { entries, save, remove } = useCommandEntries();
  const reduced = useReducedMotion();
  const [category, setCategory] = useState<CommandEntryInput["category"]>("finance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ entry?: CommandEntry } | null>(null);
  const [deleting, setDeleting] = useState<CommandEntry | null>(null);
  const [notice, setNotice] = useState("");
  const filtered = (entries.data || []).filter(e => e.category === category).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const selected = filtered.find(e => e.id === selectedId) || filtered[0];
  const categoryLabel = categories.find(c => c.id === category)!.label;
  const openEditor = (entry?: CommandEntry) => { save.reset(); setNotice(""); setEditor({ entry }); };
  const saveEntry = async (input: CommandEntryInput) => {
    try {
      const result = await save.mutateAsync({ id: editor?.entry?.id, input });
      setCategory(result.category); setSelectedId(result.id); setEditor(null); setNotice("Strategy entry saved.");
    } catch { /* mutation error is rendered in the editor */ }
  };
  return <div className="command-center"><main className="cc-wrap">
    <div className="cc-topline cc-kicker"><span><Radar size={15} />Star command / personal strategy</span><span><LockKeyhole size={12} /><span className="cc-secondary-label">Private strategy journal</span></span></div>
    <header className="cc-hero"><div><p className="cc-kicker">Your attention is the scarce resource.</p><h1>Command Center</h1><p className="cc-muted">Step above the day-to-day. Debrief the decisions, trade-offs, and next moves that shape your macro goals.</p></div><button className="cc-button primary" onClick={() => openEditor()}><Plus size={16} />New strategy entry</button></header>
    <div className="cc-actions" style={{ marginBottom: 20 }}><ImportBriefing onImported={entry => { setCategory(entry.category); setSelectedId(entry.id); setEditor(null); setNotice("Private briefing imported."); }} /></div>
    <nav className="cc-categories" aria-label="Strategy categories">{categories.map(c => <button key={c.id} className={`cc-category ${category === c.id ? "active" : ""}`} aria-pressed={category === c.id} onClick={() => { setCategory(c.id); setSelectedId(null); setEditor(null); setNotice(""); }}><c.icon size={21} strokeWidth={1.5} /><span>{c.label}<small>{c.code}</small></span></button>)}</nav>
    {notice && <div className="cc-toast" role="status"><Check size={14} style={{ display: "inline", marginRight: 8 }} />{notice}</div>}
    {entries.isLoading ? <div aria-label="Loading strategy entries" aria-busy="true"><div className="cc-skeleton" style={{ height: 70 }} /><div className="cc-skeleton" style={{ height: 250 }} /><div className="cc-skeleton" /></div> : entries.isError ? <div className="cc-empty" role="alert"><Radar size={34} /><h2>Debrief unavailable</h2><p className="cc-muted">Your strategy entries could not be loaded. Check your connection and try again.</p><button className="cc-button" disabled={entries.isFetching} onClick={() => entries.refetch()}><RefreshCw size={14} />{entries.isFetching ? "Retrying…" : "Retry"}</button></div> :
      <div className="cc-workspace"><aside className="cc-log"><div className="cc-log-heading"><span className="cc-kicker">Strategy log</span><span className="cc-kicker">{String(filtered.length).padStart(2, "0")}</span></div><div className="cc-entry-list">{filtered.map(entry => <button key={entry.id} className={`cc-entry-link ${selected?.id === entry.id && !editor ? "active" : ""}`} aria-pressed={selected?.id === entry.id && !editor} onClick={() => { setSelectedId(entry.id); setEditor(null); }}><time dateTime={entry.date}>{formatDate(entry.date)}</time><strong>{entry.title}</strong></button>)}</div>{!filtered.length && <p className="cc-muted">No entries in this category yet.</p>}<p className="cc-muted" style={{ marginTop: 20, fontSize: 11 }}>Decisions over distractions.<br />A record of where you choose to focus.</p></aside>
      <div style={{ minWidth: 0 }}>{editor ? <EntryForm key={editor.entry?.id || `new-${category}`} entry={editor.entry} category={category} onSave={saveEntry} onCancel={() => setEditor(null)} pending={save.isPending} error={save.isError ? "Could not save your entry. Your edits are still here; please try again." : undefined} /> : selected ?
        <motion.article key={selected.id} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
          <header className="cc-brief-header"><p className="cc-kicker">{categoryLabel} / strategy debrief</p><h2>{selected.title}</h2><div className="cc-form-footer"><time className="cc-muted" dateTime={selected.date}>{formatDate(selected.date)}</time><div className="cc-actions"><button className="cc-button" onClick={() => openEditor(selected)}><Pencil size={13} />Edit entry</button><button className="cc-button danger" onClick={() => { remove.reset(); setDeleting(selected); }}><Trash2 size={13} />Delete</button></div></div></header>
          {selected.briefing ? <StrategyBriefing briefing={selected.briefing} entry={selected} onEdit={() => openEditor(selected)} /> : <AttentionAllocation entry={selected} onEdit={() => openEditor(selected)} />}
          <Section title="Private field notes" icon={<Pencil />}><p className="cc-notes">{selected.notes || "No notes added to this entry."}</p></Section>
          <div className="cc-footer"><span className="cc-kicker">End of debrief / {categoryLabel}</span><button className="cc-button" onClick={() => openEditor()}><Plus size={13} />Next strategy entry</button></div>
        </motion.article> : <div className="cc-empty"><Compass size={36} strokeWidth={1.3} /><p className="cc-kicker">{categoryLabel}</p><h2>Set the next direction.</h2><p className="cc-muted">Name the goal, consider the trade-offs, and decide where your attention belongs. Your first strategy entry starts here.</p><button className="cc-button primary" onClick={() => openEditor()}><Plus size={14} />Create first entry</button></div>}</div></div>}
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !remove.isPending) setDeleting(null); }}><AlertDialogContent className="cc-dialog"><AlertDialogHeader><AlertDialogTitle>Delete this strategy entry?</AlertDialogTitle><AlertDialogDescription>“{deleting?.title}” and its notes, allocation, and debrief will be permanently removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>{remove.isError && <p role="alert" className="text-sm text-destructive">Deletion failed. The entry is still available. Please try again.</p>}<AlertDialogFooter><AlertDialogCancel disabled={remove.isPending}>Keep entry</AlertDialogCancel><AlertDialogAction disabled={remove.isPending} onClick={async e => { e.preventDefault(); if (!deleting) return; try { await remove.mutateAsync(deleting.id); setDeleting(null); setSelectedId(null); setNotice("Strategy entry deleted."); } catch { /* keep confirmation open for retry */ } }}>{remove.isPending ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main></div>;
}
