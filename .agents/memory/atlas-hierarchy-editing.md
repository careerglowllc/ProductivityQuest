---
name: Atlas hierarchy editing
description: The interaction rule that defines Questline Atlas parent-child and sibling relationships.
---

Questline Atlas topology must be built directly in the visual tree. A plus control beneath a task creates a direct sub-task in that branch; adjacent tasks are siblings. Tasks use one recursive model rather than separate Stage and Quest types. Editing may change content but must not manually reparent a task.

**Why:** The tree’s visible structure is the user’s source of truth. A separate parent selector can contradict that structure, create duplicate branch slots, and make the hierarchy harder to understand.

**How to apply:** Start empty parents with two open branches, then keep one additional plus available so parents can have unlimited children and the tree expands horizontally. Preserve sibling order in persistence, and treat any future move operation as an explicit visual tree interaction rather than a form field.