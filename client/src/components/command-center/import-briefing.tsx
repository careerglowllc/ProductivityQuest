import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { commandImportSchema, type CommandEntry } from "@shared/command-center";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ImportBriefing({ onImported }: { onImported: (entry: CommandEntry) => void }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fileData, setFileData] = useState<ReturnType<typeof commandImportSchema.parse> | null>(null);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/command-center/import", fileData);
      return res.json() as Promise<CommandEntry>;
    },
    onSuccess: async entry => {
      await client.invalidateQueries({ queryKey: ["/api/command-center"] });
      setOpen(false); setFileData(null); onImported(entry);
    },
    onError: (err: Error) => {
      const jsonStart = err.message.indexOf("{");
      try { setError(JSON.parse(err.message.slice(jsonStart)).message); }
      catch { setError("Could not import this briefing. Check your connection and try again."); }
    },
  });
  return <>
    <button className="cc-button" onClick={() => { setError(""); setFileData(null); setOpen(true); }}><Upload size={15} />Import briefing</button>
    <Dialog open={open} onOpenChange={v => { if (!mutation.isPending) setOpen(v); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import a private strategy briefing</DialogTitle><DialogDescription>Choose your Command Center JSON file. It will be saved only to the matching signed-in account—not shared with other app users.</DialogDescription></DialogHeader>
        <label className="grid gap-2 text-sm font-medium">Briefing file
          <input type="file" accept=".json,application/json" disabled={mutation.isPending} onChange={async e => {
            setError(""); setFileData(null);
            const file = e.target.files?.[0]; if (!file) return;
            if (file.size > 200000) { setError("Choose a briefing smaller than 200 KB."); return; }
            try { setFileData(commandImportSchema.parse(JSON.parse(await file.text()))); }
            catch { setError("This is not a valid Command Center briefing file."); }
          }} />
        </label>
        {fileData && <div className="rounded-md border p-3 text-sm space-y-2">
          <p className="font-semibold">{fileData.entry.title}</p>
          <p>{fileData.entry.date}</p>
          <p>Account: {fileData.ownerEmail}</p>
          <p className="text-muted-foreground">Existing entries will not be overwritten. Keep the downloaded file private; it contains your full briefing.</p>
        </div>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={!fileData || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Importing…" : "Save to my account"}</button>
      </DialogContent>
    </Dialog>
  </>;
}
