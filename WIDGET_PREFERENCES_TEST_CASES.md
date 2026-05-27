# Widget Preferences — Test Cases

## PERSIST-1: Dashboard Order Survives Page Navigation

**Steps:**
1. Log in.
2. On Dashboard, drag "Finance" widget to position 1 (top-left).
3. Navigate to Quests page.
4. Return to Dashboard.

**Expected:** Finance widget is still in position 1.

**Failure mode if broken:** Widget snaps back to default order because state was only in React memory.

---

## PERSIST-2: Dashboard Order Survives Logout/Login

**Steps:**
1. Log in as User A.
2. Reorder Dashboard widgets.
3. Log out.
4. Log back in as User A.
5. Open Dashboard.

**Expected:** Widget order matches what was set before logout.

**Key mechanism:** `GET /api/widget-preferences` returns `dashOrder`; `useEffect` applies it on load.

---

## PERSIST-3: Server Wins Over Stale localStorage

**Steps:**
1. Log in as User A on Device 1 and set Dashboard order to [schedule, skills, tasks, finance].
2. Log in as User A on Device 2 (fresh browser, no localStorage).
3. Open Dashboard on Device 2.

**Expected:** Widget order on Device 2 is [schedule, skills, tasks, finance] (loaded from server).

---

## PERSIST-4: Finance Overview Widget Order Persists

**Steps:**
1. Log in. Open Finances → Overview tab.
2. Drag "Top Expenses" widget to position 1.
3. Refresh the page.

**Expected:** "Top Expenses" is still in position 1.

---

## PERSIST-5: Finance Net Worth Widget Visibility Persists

**Steps:**
1. Log in. Open Finances → Net Worth tab.
2. Hide the "Holdings" widget using the toggle.
3. Navigate away and return.

**Expected:** "Holdings" widget is still hidden.

---

## PERSIST-6: Multiple Keys Updated Independently

**Steps:**
1. Reorder Dashboard widgets (updates `dashOrder`).
2. Reorder Finance Overview widgets (updates `overviewOrder`).
3. Refresh.

**Expected:** Both orders are preserved independently. Changing one does not affect the other.

**Key mechanism:** `POST /api/widget-preferences` deep-merges — sending `{ dashOrder: [...] }` leaves `overviewOrder` untouched.

---

## PERSIST-7: Preferences Are User-Scoped

**Steps:**
1. Log in as User A. Set Dashboard order to [finance, tasks, skills, schedule].
2. Log out. Log in as User B.
3. Open Dashboard.

**Expected:** User B sees the default order, not User A's order.

---

## PERSIST-8: localStorage Is Written on Change (Instant UI)

**Steps:**
1. Log in. Reorder Dashboard widgets.
2. Immediately navigate away and return (before the 800 ms debounce fires).

**Expected:** Widget order is correct (read from localStorage before server responds).

---

## PERSIST-9: Debounce — Only One API Call Per Drag Sequence

**Steps:**
1. Rapidly drag and re-drop Dashboard widgets 5 times within 800 ms.

**Expected:** Only **one** `POST /api/widget-preferences` request is sent to the server.

**Failure mode:** Multiple requests fired per drag, causing race conditions.

---

## PERSIST-10: Missing Keys Are Filled With Defaults

**Steps:**
1. Server returns `{ dashOrder: ["skills", "schedule"] }` (only 2 of 4 keys).

**Expected:** Dashboard renders all 4 widgets — the 2 missing ones (`tasks`, `finance`) are appended in default order.

---

## PERSIST-11: Corrupt localStorage Is Ignored Gracefully

**Steps:**
1. Manually set `localStorage.setItem("dash-widget-order", "NOT_JSON")`.
2. Load the Dashboard.

**Expected:** Dashboard renders with default widget order. No crash or blank screen.

---

## PERSIST-12: Unauthenticated Users Do Not Error

**Steps:**
1. Open the app without logging in.
2. Navigate to Dashboard.

**Expected:** `GET /api/widget-preferences` returns 401 or is not called; `useQuery` `retry: false` prevents repeated failures; defaults are used silently.
