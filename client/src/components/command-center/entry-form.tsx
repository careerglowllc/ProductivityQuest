import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { commandEntryInput, type CommandEntry, type CommandEntryInput } from "@shared/command-center";

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function EntryForm({ entry, category, onSave, onCancel, pending, error }: {
  entry?: CommandEntry; category: CommandEntryInput["category"]; onSave: (input: CommandEntryInput) => void;
  onCancel: () => void; pending: boolean; error?: string;
}) {
  const [form, setForm] = useState<CommandEntryInput>(() => entry ? { category: entry.category, title: entry.title, date: entry.date, notes: entry.notes, allocation: entry.allocation.map(a => ({ ...a })) } : { category, title: "", date: localDate(), notes: "", allocation: [] });
  const [validation, setValidation] = useState("");
  const total = form.allocation.reduce((sum, a) => sum + a.value, 0);
  return <section className="cc-panel"><div className="cc-section-heading"><h3>{entry ? "Revise strategy entry" : "New strategy entry"}</h3><span className="cc-section-number">PRIVATE</span></div>
    <form className="cc-form" onSubmit={e => { e.preventDefault(); const parsed = commandEntryInput.safeParse(form); if (!parsed.success) { setValidation(parsed.error.issues.map(i => i.message).join(". ")); return; } setValidation(""); onSave(parsed.data); }}>
      <fieldset disabled={pending} className="cc-form">
        <div className="cc-two"><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as CommandEntryInput["category"] })}><option value="finance">Financial strategy</option><option value="mental-health">Mental health</option><option value="fitness">Physical fitness</option><option value="relationships">Relationships</option></select></label><label>Entry date<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label></div>
        <label>Title<input required maxLength={160} placeholder="The strategic decision on your mind" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>Private notes<textarea maxLength={40000} placeholder="Objective, trade-offs, decisions, next moves…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        <div><p className="cc-kicker">Planned attention / optional</p><p className="cc-muted">Up to five priorities. If used, allocation must total 100%. This is an attention plan, not a financial breakdown.</p>
          {form.allocation.map((a, i) => <div className="cc-allocation-row" key={i}><label>Priority {i + 1}<input required maxLength={80} value={a.name} onChange={e => setForm({ ...form, allocation: form.allocation.map((v, j) => j === i ? { ...v, name: e.target.value } : v) })} /></label><label>Share (%)<input required type="number" min={0} max={100} step="0.01" value={a.value} onChange={e => setForm({ ...form, allocation: form.allocation.map((v, j) => j === i ? { ...v, value: Number(e.target.value) } : v) })} /></label><button type="button" className="cc-button danger" aria-label={`Remove priority ${i + 1}`} onClick={() => setForm({ ...form, allocation: form.allocation.filter((_, j) => j !== i) })}><Trash2 size={14} /></button></div>)}
          <div className="cc-form-footer" style={{ marginTop: 14 }}><button type="button" disabled={form.allocation.length >= 5} className="cc-button" onClick={() => setForm({ ...form, allocation: [...form.allocation, { name: "", value: Math.max(0, 100 - total) }] })}><Plus size={14} />Add priority</button><span className="cc-muted" aria-live="polite">{total}% / 100% assigned</span></div>
        </div>
        {entry?.briefing && <p className="cc-muted">Your structured debrief is preserved. Edits update the date, title, notes, and attention plan.</p>}
        {(validation || error) && <div className="cc-error" role="alert">{validation || error}</div>}
        <div className="cc-form-footer"><button type="button" className="cc-button" onClick={onCancel}>Cancel</button><button type="submit" className="cc-button primary">{pending ? "Saving entry…" : "Save strategy entry"}</button></div>
      </fieldset>
    </form>
  </section>;
}
