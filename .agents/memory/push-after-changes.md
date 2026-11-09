---
name: Push after every change
description: The owner wants finished changes committed and pushed without being asked.
---

After a change is made and its tests pass, commit it and push to `main` straight away. Do not stop to ask "push?".

**Why:** The owner said (Nov 2026): "in future always just push after a change, don't need to ask, it's fine."

**How to apply:** Commit in logical commits with the Co-authored-by trailer, push, and report the commit hashes. Still leave out unrelated untracked work (such as `tmp-qt-harness/`), never force-push, and check the remote is not ahead first. Deploys and on-device checks still need the owner, so say what to look at after the deploy.
