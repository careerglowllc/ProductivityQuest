# Life OS Skill Tree UI — production handoff

## Concept

`skill-tree-ui.html` is a standalone, seeded prototype for an immersive Life OS capability instrument. The visual direction is **observatory interface × ancient star chart**: a deep blue-black night mode, restrained gold/cyan/violet signals, mono metadata, and an editorial serif for aspiration. It deliberately avoids game UI tropes: no coins, badges, avatars, cartoon iconography, or fantasy ornament.

The memorable interaction is the transition from a full-life radial **Atlas** into a focused domain constellation. The atlas is an orientation surface; the focused tree is the decision surface.

## Information architecture

1. **Atlas / overview**
   - Life OS core in the center.
   - Eight domain satellites: Life Path, Handyman, Scholarly, Financial, Physical, Social, Creative, and Inner Mastery.
   - Each satellite has a short illuminated count and a semantic SVG icon.
   - `Continue path` opens Life Path. Domain buttons open their own branch.
2. **Focused domain**
   - Back to Atlas.
   - Large navigable SVG-backed tree with connected branches.
   - Selected-node inspector with status, progress, requirements, benefits, connected skills, and point investment.
   - Previous/next domain controls make adjacent exploration easy.
   - Drag to pan and `− / 1:1 / +` to zoom.

## Mapping to production skills data

The prototype language is intentionally aligned with the concepts in `client/src/pages/skills.tsx`:

- **Handyman** carries forward Craftsman/tool fluency, repair, workshop, systems and legacy thinking.
- **Creative** carries forward Artist, medium, practice, study, style, finishing and sharing work.
- **Inner Mastery** translates Mindset into noticing, reframing, attention, ritual and equanimity.
- **Financial** translates Merchant into baseline numbers, buffers, automation, investing and leverage.
- **Physical** combines Physical/Athlete/Health language into a safer capability progression: baseline, strength, engine, recovery and performance.
- **Scholarly** extends Scholar concepts: reading, research, notes, synthesis and teaching.
- **Social** combines Connector/Charisma into listening, circles, precise speech, hosting and leadership.
- **Life Path** is the top-level personal direction layer and can become the home for future Explorer goals.

Production integration should replace the local `trees` object with normalized `UserSkill` and milestone records. Existing production milestones already provide `id`, `title`, `x`, `y`, and `parents`; these map directly to focused-node records. Existing skill descriptions can populate the inspector's description/benefit copy.

## Node state model

- **Mastered**: `state.done[nodeId] === true`; gold border and glow.
- **In progress**: seeded progress is greater than zero but not mastered; violet signal.
- **Available**: every parent is mastered or has seeded progress; cyan signal and enabled investment button.
- **Locked**: at least one parent is not available; dimmed, disabled investment.

The demo starts with four isolated points. Investing consumes one point, sets the node to mastered, updates the inspector, and visibly enables downstream paths.

## Demo storage

Only this key is used:

```js
life-os-skill-tree-demo-v1
```

The stored shape is `{ points: number, done: { [nodeId]: boolean } }`. Reset only clears this isolated demo key. No backend, API calls, or production data mutation occurs.

## Suggested React boundaries

- `SkillTreePage`: route state, selected domain, transition orchestration.
- `SkillAtlas`: radial overview, domain satellites, atlas legend.
- `SkillDomainView`: focused tree shell, zoom/pan state, adjacent-domain navigation.
- `SkillTreeCanvas`: SVG edges plus positioned accessible node buttons.
- `SkillNodeInspector`: selected node metadata, requirements, progress, connected skills.
- `SkillStateLegend`: state language and accessible explanation.
- `useSkillTreeDemo`: isolated optimistic demo state; production version should use the existing query/mutation layer.
- `skillTreeAdapter`: converts existing `UserSkill`/milestone data into `{ id, name, parents, x, y, description, benefits, progress, state }`.

## Responsive, accessibility, and motion rules

- Mobile switches the focused view to a single-column tree followed by an inspector sheet-like panel; no horizontal page overflow.
- Touch targets are at least approximately 44px in the atlas and inspector controls. Focused nodes remain keyboard buttons with accessible labels.
- Visible `:focus-visible` rings use gold, matching the night-mode signal system.
- Atlas domains and tree nodes are semantic buttons; status changes are announced through the live inspector and toast status region.
- Reduced-motion users receive no drift, path dash, hover transform, or transition animation.
- Default motion is limited to a slow star drift, path drawing, subtle focus lift, and an intentional unlock toast.
- Pan is pointer-based and bounded by the browser viewport; zoom has explicit controls and a reset affordance.

## Acceptance checks

- Open `skill-tree-ui.html` directly from disk: it renders with no build step.
- At 320px, 375px, tablet, and desktop widths: no horizontal overflow, legible domain labels, reachable controls.
- Activate every atlas domain, return to Atlas, and cycle previous/next focused domains.
- Select foundation, available, locked, in-progress, and mastered nodes; verify inspector content updates.
- Invest available points; verify point count, mastered styling, toast, and newly available downstream nodes.
- Reload; verify demo progress persists. Use Reset demo; verify only this prototype resets.
- Tab through header, atlas domains, focused controls, nodes, inspector controls; activate with Enter/Space.
- Test with `prefers-reduced-motion: reduce`.
- Verify production React files are untouched; this handoff requires replacing only the prototype data adapter and storage/mutation layer.