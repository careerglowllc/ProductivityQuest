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
//      state, and uploads any local-only keys the server doesn't have yet (one-time
//      migration of existing on-device data).
//
// localStorage remains the fast, offline-capable cache; the server is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import { apiRequest } from "./queryClient";

// Only keys with these prefixes are synced. Must stay in sync with the server-side
// whitelist in routes.ts (SYNCED_KEY_PREFIXES).
const SYNCED_PREFIXES = ["nw-", "cpap-", "npcs-", "journal-"];
const isSynced = (key: string) => SYNCED_PREFIXES.some((p) => key.startsWith(p));

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

const FLUSH_DELAY_MS = 1200;

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushNow();
  }, FLUSH_DELAY_MS);
}

/** Push any queued changes to the server immediately. Never throws. */
export async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingUpdates.size === 0 && pendingDeletes.size === 0) return;

  const updates: Record<string, string> = {};
  pendingUpdates.forEach((v, k) => {
    updates[k] = v;
  });
  const deletes = Array.from(pendingDeletes);
  pendingUpdates.clear();
  pendingDeletes.clear();

  try {
    await apiRequest("PUT", "/api/user-data", { updates, deletes });
  } catch {
    // On failure, re-queue so the next change/flush retries. Don't throw — a failed
    // sync must never break the UI; localStorage still holds the value locally.
    for (const [k, v] of Object.entries(updates)) {
      if (!pendingUpdates.has(k)) pendingUpdates.set(k, v);
    }
    for (const k of deletes) pendingDeletes.add(k);
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
      scheduleFlush();
    }
  };

  ls.removeItem = function (key: string) {
    nativeRemoveItem!(key);
    if (!suspendCapture && isSynced(key)) {
      pendingDeletes.add(key);
      pendingUpdates.delete(key);
      scheduleFlush();
    }
  };

  // Best-effort flush when the tab/app is backgrounded or closed (covers iOS swipe-away).
  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushNow();
    });
    window.addEventListener("pagehide", () => {
      void flushNow();
    });
  }
}

export function isHydrated(): boolean {
  return hydrated;
}

/**
 * Pull the user's server-stored values into localStorage and upload any local-only synced
 * keys the server doesn't have yet. Run ONCE after authentication, before synced pages
 * mount. Always resolves (falls back to cached localStorage if the network fails).
 */
export async function hydrateUserData(): Promise<void> {
  if (!ls || !nativeSetItem) {
    hydrated = true;
    return;
  }
  try {
    const res = await apiRequest("GET", "/api/user-data");
    const serverData: Record<string, string> = await res.json();

    // 1) Server is authoritative: write every server value into localStorage. Use the
    //    native setter (suspendCapture) so this does not echo back as a push.
    suspendCapture = true;
    for (const [key, value] of Object.entries(serverData)) {
      if (isSynced(key) && typeof value === "string") nativeSetItem(key, value);
    }
    suspendCapture = false;

    // 2) Upload any local synced keys the server doesn't have yet (first-run migration of
    //    data that was created on this device before server sync existed).
    const localOnly: Record<string, string> = {};
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (!key || !isSynced(key)) continue;
      if (!(key in serverData)) {
        const v = ls.getItem(key);
        if (v !== null) localOnly[key] = v;
      }
    }
    if (Object.keys(localOnly).length > 0) {
      try {
        await apiRequest("PUT", "/api/user-data", { updates: localOnly, deletes: [] });
      } catch {
        // best-effort; will retry on the next local change
      }
    }
  } catch {
    // Offline / unauthenticated / server error: proceed with cached localStorage. The
    // server stays the source of truth on the next successful hydrate.
  } finally {
    suspendCapture = false;
    hydrated = true;
  }
}

/** Reset sync state on logout so the next user can't inherit this user's data/flush queue. */
export function resetUserDataSync(): void {
  hydrated = false;
  pendingUpdates.clear();
  pendingDeletes.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
