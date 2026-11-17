import { Sparkles } from "lucide-react";

// A small, quiet mark beside a quest's title when Smart Focus already has it in its list.
export function FocusBadge({ className = "" }: { className?: string }) {
  return (
    <span
      data-testid="smart-focus-badge"
      role="img"
      aria-label="In Smart Focus"
      title="In Smart Focus"
      className={`ml-1.5 inline-flex align-middle text-[var(--dash-violet)] opacity-70 ${className}`}
    >
      <Sparkles aria-hidden className="h-3 w-3" />
    </span>
  );
}
