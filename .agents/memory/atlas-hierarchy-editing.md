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

Focused questline constellations use a compact radial mind-map: the questline is central, root quests define major colored spokes, and recursive subtrees receive leaf-weighted angular wedges.

**Why:** Dense depth-row layouts require excessive panning and make unrelated branches cross. The user selected the radial mind-map reference specifically to keep broad quest trees understandable on one screen.

**How to apply:** Keep ordinary broad maps viewport-sized. Expand the scrollable plane only when measured depth or leaf density requires readable node spacing, and initialize oversized maps centered. Center the actual canvas after its dimensions become measurable, not the padded scroll extent. Preserve touch and mouse drag panning.

Root quests use equal angular sectors around the central node; subtree size may shape descendants inside a sector but must not shift root spokes off balance. Focused maps support 50–200% zoom and recentering.

**Why:** Leaf-weighting the first ring made valid but visually lopsided constellations. Users need predictable symmetry plus zoom and pan to inspect dense maps.

**How to apply:** Keep first-ring angles independent of descendant count. Maintain a reachable viewport-sized scroll plane around the scaled square canvas so zoomed-out maps stay centered and zoomed-in edges remain pannable.

Completed quest history must remain separate from explicitly deleted quests and retain hierarchy relationships.

**Why:** Completed nodes still need to appear in questline visualizations; treating completion as ordinary trash makes future cleanup destroy progression history.

**How to apply:** Keep completed history available to maps and the completed bin. Preserve legacy completion callers and cascading questline bonuses when changing lifecycle routes.