// The model is asked about a few quests at a time. One reply for a hundred quests (a score and a reason each) takes longer
// than the 20-second limit, so every ranking fell back to the rules and the written feedback was never read. Smaller
// batches run side by side, so the wait is one batch's, and a batch that fails costs only its own quests' scores.
export const FOCUS_BATCH_SIZE = 25;

export interface BatchIo<Q extends { id: number }, A extends { taskId: number }> {
  ask: (quests: Q[]) => Promise<A[]>;
  onBatchError?: (error: unknown, quests: Q[]) => void;
}

export function inBatches<T>(items: readonly T[], size = FOCUS_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Asks every batch at once. Advice for quests that were not asked about is dropped, a quest advised twice is an invalid
// answer, and only when every batch fails does the whole request fail (with the first error).
export async function adviseInBatches<Q extends { id: number }, A extends { taskId: number }>(quests: readonly Q[], io: BatchIo<Q, A>, size = FOCUS_BATCH_SIZE): Promise<A[]> {
  const batches = inBatches(quests, size);
  if (batches.length === 0) return [];
  const settled = await Promise.allSettled(batches.map((batch) => io.ask(batch)));
  const advice: A[] = [];
  let firstError: unknown;
  let failed = 0;
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") { advice.push(...outcome.value); return; }
    failed += 1;
    firstError ??= outcome.reason;
    io.onBatchError?.(outcome.reason, batches[index]);
  });
  if (failed === batches.length) throw firstError;
  const asked = new Set(quests.map((q) => q.id));
  const seen = new Set<number>();
  for (const a of advice) {
    if (!asked.has(a.taskId) || seen.has(a.taskId)) throw new Error("Invalid recommendation identities");
    seen.add(a.taskId);
  }
  return advice;
}
