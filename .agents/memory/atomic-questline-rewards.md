---
name: Atomic questline rewards
description: Concurrency constraints for awarding questline completion bonuses with the Neon HTTP database driver.
---

Questline completion rewards must be claimed with one atomic PostgreSQL statement and guarded against both duplicate callers and concurrent changes to the questline task structure.

**Why:** The Neon HTTP Drizzle driver exposes a transaction method in its types but throws at runtime for callback transactions. A conditional reward flag alone prevents duplicate callers but does not prevent a concurrent task insertion from invalidating an earlier completion check.

**How to apply:** Keep the claim, gold, skill XP, level progression, and completion state in one data-modifying SQL statement. Require the task structure revision evaluated by the caller, increment that revision whenever tasks are added, and validate task completion inside the claim statement.