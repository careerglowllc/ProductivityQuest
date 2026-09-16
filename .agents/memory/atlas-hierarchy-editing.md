---
name: Atlas hierarchy editing
description: The interaction rule that defines Questline Atlas parent-child and sibling relationships.
---

Questline Atlas topology must be built directly in the visual tree. A plus control beneath a node creates a direct child in that branch; adjacent nodes are siblings. Editing a node may change its content or type, but must not manually reparent it.

**Why:** The tree’s visible structure is the user’s source of truth. A separate parent selector can contradict that structure, create duplicate branch slots, and make the hierarchy harder to understand.

**How to apply:** Start empty parents with two open branches, then keep one additional plus available so parents can have unlimited children and the tree expands horizontally. Preserve sibling order in persistence, and treat any future move operation as an explicit visual tree interaction rather than a form field.