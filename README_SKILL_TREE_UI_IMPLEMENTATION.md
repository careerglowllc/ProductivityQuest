# Life OS constellation — production handoff

## New visual direction

This version is a ground-up rewrite based only on the supplied constellation stills and motion reference. It is not a dashboard, application shell, observatory control panel, or card-based product surface. The viewport is a continuous muted periwinkle/slate-violet field (`#505779`–`#596184`) with a fine circular neural map as the primary object.

The overview is composed as a dense organism: a small particle nebula at exact center, ten small chromatic ring hubs around a 55–65% viewport ring, and many hairline branches that split into tiny white points and hollow locked points. Sparse uppercase labels sit outside the branch ring. The focused state follows the supplied close-up composition: a single colored hub in the lower-center, a wide crown of stems and points above it, and a minimal translucent node annotation near the edge.

There are intentionally no sidebars, headers, cards, heavy frames, persistent inspectors, button rows, counters, or dashboard chrome.

## Interaction model

- Select any of the ten hubs to enter its focused crown.
- The overview fades and scales away while the selected crown grows into the frame; the reverse restores the radial atlas.
- Left/right chevrons cycle domains in either view. `Escape` and `ALL DOMAINS` return to the atlas.
- Select any focused node. Its path softly isolates and a minimal text overlay appears with state, description, and progress language.
- Available nodes expose `LIGHT THIS NODE · 1 POINT`. The demo has one isolated point and lights a node into the mastered state, revealing downstream visual paths.
- Mastered, in-progress, available, and locked states are represented by white, violet, cyan-ready, and hollow/dim points respectively.

## Content system

The seeded high-level skills are:

1. Mindset — transmute / reframe
2. Scholar — study / synthesis
3. Charisma — presence / influence
4. Physical — strength / performance
5. Artist — ideas / expression
6. Connector — trust / belonging
7. Craftsman — tools / creation
8. Explorer — discovery / courage
9. Merchant — value / leverage
10. Health — vitality / longevity

Node language is practical and original: naming a north star, building a cash buffer, reading with a method, protecting recovery, practicing real listening, finishing a body of work, and creating a grounding ritual.

For production, replace the local seeded arrays with an adapter that maps production skill and milestone records to `domain`, `name`, `parents`, `progress`, and `state`. The focused visual can consume the existing milestone `x`, `y`, and `parents` concepts without bringing over any old visual treatment.

## Storage

Demo progress is isolated to:

```text
life-os-constellation-demo-v5
```

It stores only `{ points, lit }`, where `lit` is keyed by `${skillIndex}-${milestoneId}`. There are no backend calls and no writes to production app storage. The focused tree is sourced from the production `skillMilestones` arrays: Mindset (12), Scholar (15), Charisma (10), Physical (51), Artist (10), Connector (10), Craftsman (20), Explorer (14), Merchant (29), and Health (27), for 198 milestones total. Each array preserves the production `id`, exact `title`, and every `parents` relationship. A production implementation should replace the demo mutation with the existing mutation/query layer while retaining the same stable ID model.

## Suggested React boundaries

- `ConstellationStage`: full-viewport scene, route/state transition.
- `AtlasConstellation`: center nebula, hub ring, overview paths and accessible hub buttons.
- `FocusedCrown`: selected domain stems and point nodes.
- `ConstellationNode`: semantic button, state styling and selection.
- `NodeOverlay`: minimal transient annotation and unlock action.
- `DomainPager`: invisible/low-chrome previous, next, and overview controls.
- `useConstellationProgress`: isolated demo state today; production mutation adapter later.

## Responsive and accessibility rules

- The visualization remains edge-to-edge from 320px through desktop; labels scale down, never introduce horizontal scrolling.
- All hubs, points, chevrons, overview controls, and unlock actions are semantic buttons with accessible names.
- `:focus-visible` is high-contrast white and offset from the point.
- `aria-live` announces selected node state in the overlay and unlock toast.
- Escape returns to the atlas. Left/right arrows page between domains. Enter/Space activate focused controls.
- No emoji or external icon package is used; every icon is inline SVG.
- `prefers-reduced-motion: reduce` disables star drift, swirl, path drawing, and transition easing while preserving both states and all functionality.

## Acceptance checks

- Open `skill-tree-ui.html` directly from disk; no build step or server is needed.
- Confirm the map, not copy, dominates the viewport and that no dashboard chrome appears.
- Select all ten skills, cycle adjacent skills, return to the overview, and resize to 320px.
- Select locked, in-progress, available, and mastered points and confirm the minimal overlay updates.
- Light an available node, confirm the point is consumed, state changes, and connected active lines become brighter.
- Reload and confirm only `life-os-constellation-demo-v5` persists and that each skill has its own seeded foundation state.
- Test keyboard tab order, Enter/Space activation, Escape, arrow keys, visible focus, and reduced motion.
- Keep production React untouched; only the eventual adapter and state mutation layer belong in the app implementation.