---
name: Theme layout parity
description: Project-wide requirement that themes change presentation colors without changing page geometry.
---

Light and dark modes must use the same positioning, spacing, dimensions, overflow, clipping, safe-area handling, and responsive breakpoints. Theme-specific logic should change colors and visual atmosphere only.

**Why:** Theme-dependent mobile safe-area behavior made Journal and Calendar content appear cropped in light mode while dark mode rendered correctly.

**How to apply:** Keep structural classes and safe-area rules theme-neutral. Use theme variables or color-only branches, and verify matching content coordinates in both themes on mobile.