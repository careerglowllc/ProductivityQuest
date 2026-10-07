---
name: GitHub publishing
description: GitHub App proxy fallback when command-line Git authentication is stale.
---

Shell Git credentials can fail even when the installed GitHub App connection works. Prefer the existing connection's authenticated proxy rather than requesting another token.

**Why:** Shell pushes returned invalid-token errors while the GitHub App successfully accessed the repository.

**How to apply:** Verify the remote head before publishing a tree; preserve unrelated commits and never force-update. GitHub's Git API normalizes commit timestamps to UTC, so otherwise identical commits with non-UTC author/committer offsets may have different hashes. Verify tree and parents, and align local references only after safely reconstructing the published commit.
