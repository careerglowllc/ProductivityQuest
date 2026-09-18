---
name: Atlas hierarchy editing
description: The interaction rule that defines Questline Atlas parent-child and sibling relationships.
---

Questline Atlas topology must be built directly in the visual tree. A plus control beneath a quest creates a direct child in that branch; adjacent quests are siblings. Use one recursive parent-child model, with Quest/Subquest labels rather than Stage/Task/Subtask depth types. Editing may change content but must not manually reparent a quest.

**Why:** The tree’s visible structure is the user’s source of truth. A separate parent selector can contradict that structure, create duplicate branch slots, and make the hierarchy harder to understand.

**How to apply:** Start empty parents with two open branches, then keep one additional plus available so parents can have unlimited children and the tree expands horizontally. Preserve sibling order in persistence, and treat any future move operation as an explicit visual tree interaction rather than a form field.

New quest creation defaults to the Atlas-style builder, with Manual as an alternate view of the same draft. Nesting must not silently truncate at an arbitrary depth.

**Why:** The user explicitly requested visual-first creation and straightforward parent-child relationships at every level, not different entity types for each depth.

**How to apply:** Keep both entry views synchronized and check server persistence limits whenever extending visual nesting.

The Questlines page defaults to a full-page, two-level constellation flow: parent questlines in the overview, then all recursive quests/subquests inside the selected questline.

**Why:** The user wants Questlines to follow the same overview-to-focused-map interaction as Skills rather than defaulting to cards or view selectors.

**How to apply:** Keep the overview and focused map as the primary route experience; preserve creation, editing, completion rewards, deep hierarchy visibility, and shell-safe responsive sizing.