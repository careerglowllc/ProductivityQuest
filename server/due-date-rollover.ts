import { dueDateForDay, localDay, msUntilNextDay } from "../shared/due-date-rollover";

export interface RolloverAccount { timezone: string | null; lastDay: string | null }
export interface RolloverStore {
  /** The account's setting, or undefined when there is no such account. */
  account(userId: string): Promise<(RolloverAccount & { enabled: boolean }) | undefined>;
  enabledAccounts(): Promise<Array<RolloverAccount & { id: string }>>;
  /** Moves the account's active quests that are due before `today` to `today`; returns how many moved. */
  rollOverdue(userId: string, today: Date): Promise<number>;
  markRolled(userId: string, day: string): Promise<void>;
}

async function rollAccount(store: RolloverStore, userId: string, account: RolloverAccount, now: Date) {
  const day = localDay(now, account.timezone);
  if (account.lastDay === day) return null; // already done for this local day
  // Rolling is safe to repeat, so the day is only marked once it worked; a failure is tried again.
  const rolled = await store.rollOverdue(userId, dueDateForDay(day));
  await store.markRolled(userId, day);
  return { day, rolled };
}

/** Rolls one account's overdue quests to today if it is a new day for them and the setting is on. */
export async function rollOverdueIfNewDay(store: RolloverStore, userId: string, now = new Date()) {
  const account = await store.account(userId);
  if (!account?.enabled) return null;
  return rollAccount(store, userId, account, now);
}

/** Rolls every account that has the setting on and has not rolled today; one failing does not stop the rest. */
export async function rollEnabledAccounts(store: RolloverStore, now = new Date()) {
  const results: Array<{ id: string; day: string; rolled: number }> = [];
  for (const account of await store.enabledAccounts()) {
    try {
      const done = await rollAccount(store, account.id, account, now);
      if (done) results.push({ id: account.id, ...done });
    } catch (error) {
      console.error(`⚠️ [due-date rollover] could not roll quests for ${account.id}:`, error);
    }
  }
  return results;
}

export interface SchedulerOptions {
  now?: () => Date;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

const BUFFER_MS = 30_000;         // just after midnight, not on it
const MIN_WAIT_MS = 60_000;       // never spin if the clock math lands on a boundary
const MAX_WAIT_MS = 2 ** 31 - 1;  // the longest delay a timer can hold
const RETRY_MS = 10 * 60_000;

/**
 * Wakes once at the next midnight among the accounts that have the setting on, rolls them, and sets the next wake-up.
 * It asks the database only at start, at those midnights, and when a setting changes, never on a short timer, so an
 * idle database can still go to sleep.
 */
export function createRolloverScheduler(store: RolloverStore, options: SchedulerOptions = {}) {
  const now = options.now ?? (() => new Date());
  const setTimer = options.setTimer ?? ((run: () => void, ms: number) => { const handle = setTimeout(run, ms); handle.unref?.(); return handle; });
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as NodeJS.Timeout));
  let handle: unknown;

  async function refresh(): Promise<void> {
    if (handle !== undefined) { clearTimer(handle); handle = undefined; }
    let accounts: Awaited<ReturnType<RolloverStore["enabledAccounts"]>>;
    try {
      accounts = await store.enabledAccounts();
    } catch (error) {
      console.error("⚠️ [due-date rollover] could not read accounts:", error);
      handle = setTimer(() => { handle = undefined; void refresh(); }, RETRY_MS);
      return;
    }
    if (accounts.length === 0) return; // nothing to do until someone turns it on, which calls refresh()
    const current = now();
    const wait = Math.min(Math.max(Math.min(...accounts.map((a) => msUntilNextDay(current, a.timezone))) + BUFFER_MS, MIN_WAIT_MS), MAX_WAIT_MS);
    handle = setTimer(() => {
      handle = undefined;
      void rollEnabledAccounts(store, now()).then(refresh, refresh);
    }, wait);
  }

  return {
    refresh,
    /** Catches up on any day missed while the server was down, then starts the schedule. */
    async start() {
      await rollEnabledAccounts(store, now()).catch((error) => console.error("⚠️ [due-date rollover] catch-up failed:", error));
      await refresh();
    },
    stop() { if (handle !== undefined) { clearTimer(handle); handle = undefined; } },
  };
}
