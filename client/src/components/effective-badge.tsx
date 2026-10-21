import { effectiveTagOf } from "@shared/finance-schedule";

// The small "Effective Nov 1, 2026" label beside a finance line's name, when it has one.
export function EffectiveBadge({ item }: { item: { tags?: string[] | null } }) {
  const tag = effectiveTagOf(item);
  if (!tag) return null;
  return (
    <span data-testid="effective-badge" className="ml-1.5 inline-block whitespace-nowrap rounded-full border border-pink-500/40 px-1.5 align-middle text-[9px] font-normal text-pink-300">
      {tag}
    </span>
  );
}
