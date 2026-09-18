---
name: Logout data isolation
description: Safety requirements for ending a session when per-user data is mirrored through browser storage.
---

Logout must stop if pending synced edits cannot be saved. After saving, remove only user-scoped synced browser data before allowing another account to hydrate; preserve device-level preferences.

**Why:** Leaving synced keys in browser storage can cause one account's local-only data to migrate into the next account. Ignoring a failed flush can also discard recent edits during logout.

**How to apply:** Any new logout path must use the same save, scoped-cache clearing, session destruction, query reset, and redirect sequence. If session destruction fails after clearing, restore the signed-in user's server-backed cache.