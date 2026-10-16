// The messages typed into the entry box that the AI has not worked into the day yet. They go one at a time, in the order typed,
// because each answer is the whole updated day and the next message builds on it.
import { fitnessErrorMessage, type FitnessDraft, type ParseResult } from "@/lib/fitness-entry";

export type QueueStatus = "queued" | "sending" | "failed";
export interface QueuedMessage { id: string; text: string; status: QueueStatus; error?: string }

export type QueueAction =
  | { type: "add"; id: string; text: string }
  | { type: "start"; id: string }
  | { type: "done"; id: string }
  | { type: "fail"; id: string; error: string }
  | { type: "retry"; id: string }
  | { type: "remove"; id: string };

export const MAX_WAITING = 10;

export const canAdd = (queue: readonly QueuedMessage[]): boolean => queue.length < MAX_WAITING;

export function queueReducer(queue: QueuedMessage[], action: QueueAction): QueuedMessage[] {
  switch (action.type) {
    case "add": return canAdd(queue) ? [...queue, { id: action.id, text: action.text, status: "queued" }] : queue;
    case "start": return queue.map((m) => (m.id === action.id && m.status === "queued" ? { ...m, status: "sending" } : m));
    case "done": return queue.filter((m) => m.id !== action.id);
    case "fail": return queue.map((m) => (m.id === action.id ? { id: m.id, text: m.text, status: "failed", error: action.error } : m));
    case "retry": return queue.map((m) => (m.id === action.id && m.status === "failed" ? { id: m.id, text: m.text, status: "queued" } : m));
    case "remove": return queue.filter((m) => m.id !== action.id || m.status === "sending");
  }
}

// A message that failed holds up the ones behind it until it is retried or removed, so they never run out of order.
export const isBlocked = (queue: readonly QueuedMessage[]): boolean => queue.some((m) => m.status === "failed");

export function nextToSend(queue: readonly QueuedMessage[]): QueuedMessage | null {
  if (queue.some((m) => m.status === "sending") || isBlocked(queue)) return null;
  return queue.find((m) => m.status === "queued") ?? null;
}

// True while a message is being worked in or is about to be, which is when the day must not be changed by hand.
export const isProcessing = (queue: readonly QueuedMessage[]): boolean => queue.some((m) => m.status === "sending") || nextToSend(queue) !== null;

export const NOT_CHANGED = "That did not add or change anything. Say what you did or ate, with the numbers.";
export const DAY_CHANGED = "The day changed while this was being added, so it was not applied. Send it again.";

const keyOf = (draft: FitnessDraft | null) => (draft ? `${draft.id}:${draft.updatedAt}` : "none");

export interface RunIo {
  text: string;
  readDraft: () => FitnessDraft | null; // the day as it is right now, including earlier messages that just finished
  send: (text: string, draft: FitnessDraft | null) => Promise<ParseResult>;
  apply: (draft: FitnessDraft | null, result: ParseResult, text: string) => { draft: FitnessDraft; changes: string[] };
  commit: (draft: FitnessDraft) => void; // saves the updated day
}
export type RunOutcome = { ok: true; draft: FitnessDraft; changes: string[] } | { ok: false; error: string };

// Works one message into the day. The AI is given the day as it is when this starts; if the day was changed some other way
// while it was thinking (another device, a saved day reopened), the answer is thrown away rather than written over it.
export async function runMessage(io: RunIo): Promise<RunOutcome> {
  const base = io.readDraft();
  try {
    const result = await io.send(io.text, base);
    if (keyOf(io.readDraft()) !== keyOf(base)) return { ok: false, error: DAY_CHANGED };
    const update = io.apply(base, result, io.text);
    if (update.changes.length === 0) return { ok: false, error: NOT_CHANGED };
    io.commit(update.draft);
    return { ok: true, draft: update.draft, changes: update.changes };
  } catch (e) {
    return { ok: false, error: fitnessErrorMessage(e) };
  }
}
