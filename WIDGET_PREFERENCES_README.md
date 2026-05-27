# Widget Preferences — Server Persistence README

## Overview

All widget preferences (order, visibility, size) are **persisted to the server**, tied to the authenticated user account. This means preferences survive:

- Page navigation (leave and return)
- Browser refresh
- Logout and re-login
- Switching devices or browsers

A **localStorage cache** is kept as an instant-load fallback so widgets appear in the correct position on first render, before the server response arrives. The **server always wins** on conflict: when server prefs load, they overwrite the local cache.

---

## Architecture

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/widget-preferences` | Returns the full preferences JSON for the logged-in user |
| `POST` | `/api/widget-preferences` | Deep-merges a patch object into the existing preferences |

The `POST` endpoint performs a **shallow merge at the top level** — you only need to send the keys you want to update. Existing keys not included in the patch are preserved.

### Storage

Preferences are stored in the `widget_preferences` JSONB column on the `users` table (via `storage.updateUserSettings`). There is no separate table.

### Client-Side Hooks (per page)

Each page that has customisable widgets follows this pattern:

1. **`useState` initialiser** — reads localStorage as the instant default
2. **`useQuery(["/api/widget-preferences"])`** — fetches server prefs; `staleTime: Infinity` prevents redundant re-fetches within a session
3. **`useEffect` on `widgetPrefs`** — once server data loads, apply it and write back to localStorage
4. **`saveWidgetPrefs(patch)`** — debounced (800 ms) `POST /api/widget-preferences` call triggered on every user change
5. **localStorage write** — also updated on every user change so the UI stays responsive without waiting for the server

---

## Preference Keys

All keys live in the single `widget_preferences` JSON object:

| Key | Page | Type | Description |
|-----|------|------|-------------|
| `dashOrder` | Dashboard | `string[]` | Order of the 4 dashboard cards (`"skills"`, `"schedule"`, `"tasks"`, `"finance"`) |
| `overviewOrder` | Finances → Overview tab | `string[]` | Order of the 6 overview widgets |
| `overviewVisible` | Finances → Overview tab | `Record<string, boolean>` | Visibility per overview widget |
| `nwOrder` | Finances → Net Worth tab | `string[]` | Order of the 4 NW widgets |
| `nwVisible` | Finances → Net Worth tab | `Record<string, boolean>` | Visibility per NW widget |

---

## Adding a New Widget Preference

1. Decide on a key name (e.g. `calendarView`).
2. In the component, initialise state from `localStorage.getItem("your-ls-key")`.
3. Add a `useQuery(["/api/widget-preferences"])` (or reuse the existing one if already on the page).
4. In the `useEffect`, read `widgetPrefs.yourKey` and apply it.
5. When the user changes the preference, call `saveWidgetPrefs({ yourKey: newValue })` and update localStorage.
6. Document the key in the table above.

---

## Files

| File | Role |
|------|------|
| `server/routes.ts` | `GET` and `POST /api/widget-preferences` handlers |
| `client/src/pages/dashboard.tsx` | `dashOrder` read/write |
| `client/src/pages/finances.tsx` | `overviewOrder`, `overviewVisible`, `nwOrder`, `nwVisible` read/write |
