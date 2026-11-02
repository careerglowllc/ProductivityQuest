// ─────────────────────────────────────────────────────────────────────────────
// synced-storage.ts
//
// Bridges the browser's localStorage with our per-user server store (`/api/user-data`)
// so that data which historically lived ONLY in localStorage — the finance / net-worth
// inputs ("nw-*"), the CPAP compliance log ("cpap-*"), and the NPC rolodex ("npcs-*") —
// is now persisted on our servers, scoped to the authenticated user, and synced across
// web + iOS.
//
// How it works, without rewriting the hundreds of existing localStorage call sites:
//   1. installStorageSync() monkeypatches localStorage.setItem / removeItem so any write
//      to a synced key is mirrored to the server (debounced + batched).
//   2. hydrateUserData() (run once after login, BEFORE the synced pages mount) pulls the
//      user's server values into localStorage so every page reads the latest cross-device
//      state. A key the server no longer has was removed on another device, so it is
//      removed here too. Only the first time a kind of data (a prefix) is synced from this
//      device are on-device keys the server lacks sent up instead (one-time migration).
//
// localStorage remains the fast, offline-capable cache; the server is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import { apiRequest } from "./queryClient";

// Only keys with these prefixes are synced. Must stay in sync with the server-side
// whitelist in routes.ts (SYNCED_KEY_PREFIXES).
const SYNCED_PREFIXES = ["nw-", "cpap-", "npcs-", "journal-", "country-", "workout-", "calories-"];
const isSynced = (key: string) => SYNCED_PREFIXES.some((p) => key.startsWith(p));
const prefixOf = (key: string) => SYNCED_PREFIXES.find((p) => key.startsWith(p));

// Capture the native implementations up-front so our hydrate path and internal writes
// never re-trigger the sync patch (which would cause needless echo pushes).
const ls: Storage | undefined =
  typeof window !== "undefined" ? window.localStorage : undefined;
const nativeSetItem = ls ? ls.setItem.bind(ls) : undefined;
const nativeRemoveItem = ls ? ls.removeItem.bind(ls) : undefined;

let installed = false;
let hydrated = false;
let suspendCapture = false; // true during hydrate so server→local writes don't echo back
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const pendingUpdates = new Map<string, string>();
const pendingDeletes = new Set<string>();

// The queue is mirrored into localStorage as well, because nothing in memory survives the app being
// killed, or an expired session bouncing the page to /login mid-edit. Without this, a write that never
// reached the server was then overwritten by the server's older copy on the next sign-in, losing it.
const OUTBOX_KEY = "pq-sync-outbox-v1"; // deliberately not a synced prefix: the queue itself is per-device
interface Outbox { userId: string; updates: Record<string, string>; deletes: string[] }
let syncUserId: string | null = null;
let outboxRestored = false;

/** Who the queue belongs to, so another account signing in on this device never inherits it. */
export function setSyncUser(userId: string | null): void {
  if (syncUserId === userId) return;
  syncUserId = userId;
  outboxRestored = false;
}

function saveOutbox(): void {
  if (!ls || !nativeSetItem || !nativeRemoveItem) return;
  if (!syncUserId || (pendingUpdates.size === 0 && pendingDeletes.size === 0)) {
    nativeRemoveItem(OUTBOX_KEY);
    return;
  }
  const updates: Record<string, string> = {};
  pendingUpdates.forEach((v, k) => { updates[k] = v; });
  try {
    nativeSetItem(OUTBOX_KEY, JSON.stringify({ userId: syncUserId, updates, deletes: Array.from(pendingDeletes) } satisfies Outbox));
  } catch {
    // Storage full: the queue still lives in memory for this session.
  }
}

/** Put back whatever this user wrote that never reached the server. Runs once per sign-in. */
function restoreOutbox(): void {
  if (!ls || !nativeRemoveItem || outboxRestored || !syncUserId) return;
  outboxRestored = true;
  let stored: Outbox | null = null;
  try { stored = JSON.parse(ls.getItem(OUTBOX_KEY) ?? "null") as Outbox | null; } catch { stored = null; }
  nativeRemoveItem(OUTBOX_KEY);
  if (!stored || typeof stored !== "object" || stored.userId !== syncUserId) return;
  for (const [key, value] of Object.entries(stored.updates ?? {})) {
    // Anything queued since the app started is newer than what was stored, so it is left alone.
    if (isSynced(key) && typeof value === "string" && !pendingUpdates.has(key) && !pendingDeletes.has(key)) pendingUpdates.set(key, value);
  }
  for (const key of stored.deletes ?? []) {
    if (isSynced(key) && !pendingUpdates.has(key)) pendingDeletes.add(key);
  }
  saveOutbox();
}

// Which prefixes this device has already reconciled with the server for this user. From then on, a key the server lacks
// was removed elsewhere (a fitness day ended on the phone, say) and is removed here; before, it is on-device data that
// never went up. Without this, every refresh sent such keys back up and an ended day reopened on every device.
const SETTLED_KEY = "pq-sync-settled-v1"; // deliberately not a synced prefix: this is per-device
interface Settled { userId: string; prefixes: string[] }

function readSettled(userId: string | null): Set<string> {
  if (!ls || !userId) return new Set();
  try {
    const stored = JSON.parse(ls.getItem(SETTLED_KEY) ?? "null") as Settled | null;
    return new Set(stored && stored.userId === userId && Array.isArray(stored.prefixes) ? stored.prefixes : []);
  } catch {
    return new Set();
  }
}

function saveSettled(userId: string | null, prefixes: Set<string>): void {
  if (!nativeSetItem || !userId) return;
  try { nativeSetItem(SETTLED_KEY, JSON.stringify({ userId, prefixes: Array.from(prefixes) } satisfies Settled)); } catch { /* storage full */ }
}

// Keys in a push the server has not answered yet, and, for each refresh waiting on the server, the keys pushed since it
// asked. The refresh's answer can predate those pushes, so it must not write its older copy over them, or bring back a
// key that was just removed.
const sending = new Map<string, number>();
const refreshesWaiting = new Set<Set<string>>();

function markSending(keys: string[], delta: 1 | -1): void {
  for (const key of keys) {
    const count = (sending.get(key) ?? 0) + delta;
    if (count > 0) sending.set(key, count); else sending.delete(key);
    if (delta === 1) refreshesWaiting.forEach((touched) => touched.add(key));
  }
}

// Kept short: this only coalesces rapid successive writes to the same key (e.g. typing
// into a number field fires setItem per keystroke). A long delay widens the window in
// which a mobile app backgrounding/kill can drop an edit before it ever reaches the server.
const FLUSH_DELAY_MS = 500;

// Fired on window after every successful hydrate (initial login + periodic poll) so any
// already-mounted page can refresh its in-memory state from the freshly-pulled localStorage
// values, instead of only ever reading the synced data once at mount time.
const REFRESH_EVENT = "pq:user-data-refreshed";

/** Subscribe to server → localStorage refreshes. Returns an unsubscribe function. */
export function subscribeUserDataRefresh(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REFRESH_EVENT, cb);
  return () => window.removeEventListener(REFRESH_EVENT, cb);
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushNow();
  }, FLUSH_DELAY_MS);
}

/**
 * Push any queued changes to the server immediately. Never throws.
 *
 * `keepalive` must be set when flushing from a visibilitychange/pagehide handler: as the
 * tab/app is backgrounded or torn down, a normal in-flight fetch can be aborted by the
 * browser before it reaches the server, silently dropping the last edit (this was the
 * cause of "mobile edit never showed up on web after refresh" — the debounced flush was
 * still pending when the app got backgrounded/killed). `keepalive: true` tells the
 * browser to let the request complete in the background past page unload.
 */
export async function flushNow(keepalive = false): Promise<boolean> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingUpdates.size === 0 && pendingDeletes.size === 0) return true;

  const updates: Record<string, string> = {};
  pendingUpdates.forEach((v, k) => {
    updates[k] = v;
  });
  const deletes = Array.from(pendingDeletes);
  pendingUpdates.clear();
  pendingDeletes.clear();
  const sent = [...Object.keys(updates), ...deletes];
  markSending(sent, 1);

  try {
    await apiRequest("PUT", "/api/user-data", { updates, deletes }, keepalive ? { keepalive: true } : undefined);
    markSending(sent, -1);
    saveOutbox(); // only what came in while the request was in flight is still waiting
    return true;
  } catch {
    markSending(sent, -1);
    // On failure, re-queue so the next change/flush retries. Don't throw — a failed
    // sync must never break the UI; localStorage still holds the value locally.
    for (const [k, v] of Object.entries(updates)) {
      if (!pendingUpdates.has(k)) pendingUpdates.set(k, v);
    }
    for (const k of deletes) pendingDeletes.add(k);
    saveOutbox();
    return false;
  }
}

/** Patch localStorage so writes to synced keys are mirrored to the server. Idempotent. */
export function installStorageSync(): void {
  if (installed || !ls || !nativeSetItem || !nativeRemoveItem) return;
  installed = true;

  ls.setItem = function (key: string, value: string) {
    nativeSetItem!(key, value);
    if (!suspendCapture && isSynced(key)) {
      pendingUpdates.set(key, value);
      pendingDeletes.delete(key);
      saveOutbox();
      scheduleFlush();
    }
  };

  ls.removeItem = function (key: string) {
    nativeRemoveItem!(key);
    if (!suspendCapture && isSynced(key)) {
      pendingDeletes.add(key);
      pendingUpdates.delete(key);
      saveOutbox();
      scheduleFlush();
    }
  };

  // Best-effort flush when the tab/app is backgrounded or closed (covers iOS swipe-away).
  // keepalive=true so the request isn't cancelled mid-flight by the browser tearing down
  // the page/app before it reaches the server. Multiple redundant signals are used because
  // a Capacitor WKWebView doesn't always fire the same lifecycle events a normal mobile
  // browser tab would — `blur` fires on iOS when the app is backgrounded even in cases
  // where `visibilitychange`/`pagehide` don't.
  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushNow(true);
    });
    window.addEventListener("pagehide", () => {
      void flushNow(true);
    });
    window.addEventListener("blur", () => {
      void flushNow(true);
    });
  }
}

export function isHydrated(): boolean {
  return hydrated;
}

/**
 * Pull the user's server-stored values into localStorage, and remove the synced keys the server
 * no longer has (they were removed on another device). Run ONCE after authentication, before
 * synced pages mount, and again by the periodic refresh. Always resolves (falls back to cached
 * localStorage if the network fails).
 */
export async function hydrateUserData(): Promise<void> {
  if (!ls || !nativeSetItem || !nativeRemoveItem) {
    hydrated = true;
    return;
  }
  const touched = new Set<string>(Array.from(sending.keys()));
  refreshesWaiting.add(touched);
  let applied = false;
  try {
    restoreOutbox();
    const res = await apiRequest("GET", "/api/user-data");
    const serverData = (await res.json()) as Record<string, string>;
    if (!serverData || typeof serverData !== "object" || Array.isArray(serverData)) throw new Error("Unreadable user data");

    // A key whose latest change has not gone up yet, or went up while this request was waiting, keeps the copy on
    // this device: the server's answer is the older one, and writing it here would throw that change away.
    const keepLocal = (key: string) => pendingUpdates.has(key) || pendingDeletes.has(key) || touched.has(key);

    // 1) Server is authoritative for everything else. Use the native setter (suspendCapture) so this does not echo
    //    back as a push.
    applied = true;
    suspendCapture = true;
    for (const [key, value] of Object.entries(serverData)) {
      if (keepLocal(key)) continue;
      if (isSynced(key) && typeof value === "string") nativeSetItem(key, value);
    }

    // 2) A synced key on this device that the server does not have was removed on another device, once this kind of
    //    data has been synced here before (or the server already holds some of it). Only the first time is it data
    //    from before sync, sent up as a one-time migration.
    const settled = readSettled(syncUserId);
    for (const key of Object.keys(serverData)) {
      const prefix = prefixOf(key);
      if (prefix) settled.add(prefix);
    }
    const localOnly: Record<string, string> = {};
    const removedElsewhere: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (!key || !isSynced(key) || key in serverData || keepLocal(key)) continue;
      if (settled.has(prefixOf(key)!)) {
        removedElsewhere.push(key);
      } else {
        const v = ls.getItem(key);
        if (v !== null) localOnly[key] = v;
      }
    }
    removedElsewhere.forEach((key) => nativeRemoveItem(key));
    suspendCapture = false;

    let migrated = true;
    const migrating = Object.keys(localOnly);
    if (migrating.length > 0) {
      markSending(migrating, 1);
      try {
        await apiRequest("PUT", "/api/user-data", { updates: localOnly, deletes: [] });
      } catch {
        migrated = false; // tried again on the next refresh
      } finally {
        markSending(migrating, -1);
      }
    }
    const unsent = new Set<string | undefined>(migrated ? [] : migrating.map(prefixOf));
    SYNCED_PREFIXES.forEach((prefix) => { if (!unsent.has(prefix)) settled.add(prefix); });
    saveSettled(syncUserId, settled);

    // 3) Send up anything still waiting, including changes restored from an earlier run. The periodic
    //    hydrate makes this the retry for a push that failed while the session was expired or offline.
    if (pendingUpdates.size > 0 || pendingDeletes.size > 0) await flushNow();
  } catch {
    // Offline / unauthenticated / server error: proceed with cached localStorage. The
    // server stays the source of truth on the next successful hydrate.
  } finally {
    refreshesWaiting.delete(touched);
    suspendCapture = false;
    hydrated = true;
    // Only when the server's answer was applied: after a failed refresh nothing here changed, and pages re-reading
    // storage then (say, emptied by a sign-out that did not go through) would drop what they hold.
    if (applied && typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 30000;

/**
 * Periodically re-pull server data into localStorage (while the tab is visible) so a
 * second device/tab picks up cross-device edits without requiring a manual refresh or
 * logout/login. Safe to call multiple times — idempotent. Pair with stopPeriodicHydration()
 * on logout.
 */
export function startPeriodicHydration(): void {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    void hydrateUserData();
  }, POLL_INTERVAL_MS);
}

export function stopPeriodicHydration(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Reset sync state on logout so the next user can't inherit this user's data/flush queue. */
export function resetUserDataSync(): void {
  hydrated = false;
  pendingUpdates.clear();
  pendingDeletes.clear();
  syncUserId = null;
  outboxRestored = false;
  stopPeriodicHydration();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  // The stored queue is deliberately left alone: this also runs while auth is still loading, and signing
  // out for real flushes first, so anything left here is unsent work waiting for its owner to come back.
}

/** Remove only per-user synced cache keys, leaving device preferences intact. */
export function clearSyncedLocalData(): void {
  if (!ls || !nativeRemoveItem) return;
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (key && isSynced(key)) keys.push(key);
  }
  suspendCapture = true;
  try {
    keys.forEach((key) => nativeRemoveItem(key));
  } finally {
    suspendCapture = false;
  }
}
