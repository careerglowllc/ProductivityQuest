import { importanceColor } from "@/lib/importance";

// An importance choice: a coloured circle and the name. A drawn circle, not an emoji, so it looks the same on every device.
export function ImportanceLabel({ level, text }: { level: string; text?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        data-importance-dot={level}
        className={`inline-block h-3 w-3 shrink-0 rounded-full ${level === "Pareto" ? "ring-1 ring-white/70" : ""}`}
        style={{ backgroundColor: importanceColor(level) }}
      />
      {text ?? level}
    </span>
  );
}
