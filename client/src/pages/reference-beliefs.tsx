import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookMarked, ArrowLeft, Download } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/theme-context";
import { downloadCSV, type CSVExport } from "@/lib/csv-export";

// "journal-" prefix so this rides the existing localStorage → server sync (see synced-storage.ts).
const STORAGE_KEY = "journal-reference-beliefs-v1";

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

// Pure builder (no side effects) so the Settings page's "Export All" master export can reuse it.
export function buildReferenceBeliefsCSVExport(): CSVExport {
  let text = "";
  try { text = localStorage.getItem(STORAGE_KEY) || ""; } catch { /* ignore */ }
  return { folder: "Journal", filename: "reference-beliefs.txt", content: text };
}

export default function ReferenceBeliefsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const [text, setText] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave so we're not writing to localStorage on every keystroke.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, text);
        setSavedAt(new Date().toLocaleTimeString());
      } catch {}
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [text]);

  const handleExport = () => {
    downloadCSV(`reference-beliefs_${new Date().toISOString().slice(0, 10)}.txt`, text);
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"
      } ${!isMobile ? "pt-16" : ""} pb-24 relative overflow-hidden`}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Link href="/journal">
            <a className="inline-flex items-center gap-1 text-yellow-200/70 hover:text-yellow-100 text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Journal
            </a>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <BookMarked className="h-10 w-10 text-amber-400" />
              <h1 className="text-4xl font-serif font-bold text-yellow-100">Reference Beliefs</h1>
            </div>
            <p className="text-yellow-200/70 text-lg">Free-form essay space — write, paste, and revise anything</p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-slate-500">
              {wordCount(text)} word{wordCount(text) === 1 ? "" : "s"}
              {savedAt && <span className="ml-2 text-emerald-500/80">· saved {savedAt}</span>}
            </p>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-600/20 hover:text-amber-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export .txt
            </Button>
          </div>

          {/* Editor */}
          <Card className={`${isDark ? "bg-slate-800/60 border-amber-600/30" : "bg-white border-gray-200"}`}>
            <CardContent className="p-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write or paste your beliefs, principles, and reference notes here…"
                className={`min-h-[60vh] resize-y font-serif text-base leading-relaxed ${
                  isDark ? "bg-slate-900/60 border-amber-600/20 text-amber-50 placeholder:text-slate-500" : "bg-gray-50 border-gray-200"
                }`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
