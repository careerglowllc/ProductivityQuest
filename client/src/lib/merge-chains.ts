export type ChainMerge = { into: string; from: string[] };

// Collapses separate per-location entries of one chain into the single seeded entry that covers every location.
// Entries not named in a merge are untouched. The merged entry is only added when at least one old entry was stored.
export function mergeChainEntries<T extends { id: string }>(stored: T[], seeds: T[], merges: ChainMerge[]): T[] {
  const removed = new Set(merges.flatMap((merge) => merge.from));
  const kept = stored.filter((entry) => !removed.has(entry.id));
  const have = new Set(kept.map((entry) => entry.id));
  const added: T[] = [];
  for (const merge of merges) {
    if (have.has(merge.into)) continue;
    if (!stored.some((entry) => merge.from.includes(entry.id))) continue;
    const merged = seeds.find((seed) => seed.id === merge.into);
    if (merged) added.push(merged);
  }
  return [...added, ...kept];
}

// Names that appear more than once, case-insensitively. A chain should be one entry listing all its locations.
export function duplicateNames(names: string[]): string[] {
  const counts: Record<string, number> = {};
  for (const name of names) {
    const key = name.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.keys(counts).filter((key) => counts[key] > 1);
}
