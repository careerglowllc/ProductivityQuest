---
name: Polling and false empty states
description: Background request budgets and honest error handling on data-backed pages.
---
Avoid continuous global polling for deadline-based UI; hydrate on mount/focus and invalidate after mutations, with a local countdown.

**Why:** One request per second consumes 900 requests in a 15-minute window before normal navigation or other tabs. This can exhaust a shared API limit and make unrelated data unavailable.

**How to apply:** Calculate the total request budget across tabs before adding polling. Never render an empty-data invitation when a query failed; display an error and Retry instead. Missing visuals are not evidence of deleted records.