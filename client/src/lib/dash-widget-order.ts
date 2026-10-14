// Returns the order with the item at `from` moved to `to`; the same list when either place is outside it or they match.
export function moveWidget<T>(order: readonly T[], from: number, to: number): T[] {
  const next = [...order];
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
