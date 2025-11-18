# Skills Spider Chart - Test Cases

## Overview
Test cases for the Skills constellation view converted to spider/radar chart layout.

## Test Cases

### TC-SPIDER-001: Spider Chart Layout
**Priority:** High  
**Prerequisites:** User logged in, has multiple skills, viewing Skills page

**Steps:**
1. Navigate to `/skills`
2. Ensure "Constellation" view mode is selected (default)
3. Observe skill node layout

**Expected Result:**
- Skills arranged in radial/circular pattern
- Equal angular spacing between skills (360° / number of skills)
- All skills positioned around center point
- Distance from center represents skill level
- Skills start from top (12 o'clock position) and go clockwise

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-002: Level-Based Positioning
**Priority:** High  
**Prerequisites:** User has skills with different levels

**Steps:**
1. View skills constellation
2. Compare positions of low-level vs high-level skills

**Expected Result:**
- Higher level skills positioned further from center
- Lower level skills positioned closer to center
- Distance proportional to level (level / chartMax)
- Visual representation of skill progression

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-003: Dynamic Scale Calculation
**Priority:** High  
**Prerequisites:** User has skills with varying levels

**Steps:**
1. Check skill levels (e.g., highest = 25)
2. View constellation
3. Observe chart scale

**Expected Result:**
- Chart max = highest skill level + 10
- Chart max capped at 99
- Scale indicated in legend
- Grid circles represent 25%, 50%, 75%, 100% of max
- Example: If highest = 25, chart max = 35

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-004: Background Grid Circles
**Priority:** Medium  
**Prerequisites:** User viewing skills constellation

**Steps:**
1. Navigate to Skills page
2. Examine background of constellation view

**Expected Result:**
- 4 concentric circles visible
- Circles at 25%, 50%, 75%, 100% of max radius
- Yellow/gold color (rgba(250, 204, 21, 0.15))
- 1px stroke width
- Circles centered in view

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-005: Radial Axis Lines
**Priority:** Medium  
**Prerequisites:** User has 3+ skills

**Steps:**
1. View skills constellation
2. Observe lines from center to skill positions

**Expected Result:**
- Dotted lines extend from center to outer edge for each skill
- Lines align with skill angular positions
- Yellow/gold color (rgba(250, 204, 21, 0.2))
- Dashed pattern (strokeDasharray="4,4")
- Lines behind skill nodes (z-index 0)

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-006: Spider Chart Polygon
**Priority:** High  
**Prerequisites:** User has 3+ skills

**Steps:**
1. View skills constellation
2. Observe filled polygon connecting all skills

**Expected Result:**
- Polygon connects all skill node positions
- Semi-transparent yellow fill (rgba(234, 179, 8, 0.15))
- Yellow stroke border (rgba(234, 179, 8, 0.5))
- 2px stroke width
- Shape represents overall skill profile

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-007: Skill Node Appearance
**Priority:** High  
**Prerequisites:** User viewing skills constellation

**Steps:**
1. Examine individual skill nodes
2. Check node styling

**Expected Result:**
- Circular nodes (20x20 size)
- Yellow border (border-yellow-600/40)
- Dark background (bg-slate-800/80)
- Backdrop blur effect
- Skill icon centered in node
- Level badge in top-right corner
- XP progress bar fills from bottom

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-008: Node Hover Effects
**Priority:** Medium  
**Prerequisites:** User viewing skills constellation

**Steps:**
1. Hover mouse over a skill node
2. Observe visual changes

**Expected Result:**
- Node scales up (scale-125)
- Border color changes to bright yellow
- Glow effect appears around node
- Icon scales slightly larger
- Tooltip appears below node
- Action buttons appear (Edit, Delete if custom)

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-009: Tooltip Information
**Priority:** Medium  
**Prerequisites:** User viewing skills constellation

**Steps:**
1. Hover over a skill node
2. Read tooltip content

**Expected Result:**
- Skill name displayed (bold, serif font)
- Constellation name shown (italic, smaller)
- Level and XP percentage shown
- Tooltip positioned below node
- Arrow points up to node
- Dark background with yellow border

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-010: Background Effects Preserved
**Priority:** Medium  
**Prerequisites:** User viewing skills page

**Steps:**
1. Navigate to Skills page constellation view
2. Observe background

**Expected Result:**
- Aurora borealis gradients visible (purple, blue, green, cyan)
- Milky Way diagonal band effect
- Three layers of stars (large, medium, small)
- Animated pulse effect on bright stars
- Radial gradient background (dark blue to black)
- Same beautiful space theme maintained

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-011: Center Decoration
**Priority:** Low  
**Prerequisites:** User viewing constellation

**Steps:**
1. Look at center of constellation
2. Observe center decoration

**Expected Result:**
- Small circular decoration at exact center
- Crown icon visible (faded yellow)
- 16x16 size
- Behind skill nodes (z-index 0)

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-012: Legend Information
**Priority:** Medium  
**Prerequisites:** User viewing constellation

**Steps:**
1. Locate legend in bottom-right corner
2. Read legend content

**Expected Result:**
- Legend shows "Spider Chart: Distance from center = Skill Level"
- Shows "Max scale: Level X" (where X is chartMax)
- Instructions: "Hover over nodes • Click for details"
- Dark background with yellow border
- Small italic serif font

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-013: Single Skill Edge Case
**Priority:** Medium  
**Prerequisites:** User has only 1 skill

**Steps:**
1. Ensure only one skill exists
2. View constellation

**Expected Result:**
- Single node positioned at top (12 o'clock)
- Distance from center based on level
- No polygon (needs 3+ points)
- One radial axis line visible
- No layout errors

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-014: Two Skills Layout
**Priority:** Medium  
**Prerequisites:** User has exactly 2 skills

**Steps:**
1. Have 2 skills in system
2. View constellation

**Expected Result:**
- Skills positioned at opposite sides (180° apart)
- Both skills on diameter line
- No polygon (needs 3+ points)
- Two radial axis lines
- Proper spacing

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-015: Many Skills (10+)
**Priority:** Medium  
**Prerequisites:** User has 10+ skills

**Steps:**
1. Create 10-15 skills
2. View constellation

**Expected Result:**
- All skills visible around perimeter
- Equal angular spacing maintained
- No overlapping nodes
- Polygon connects all nodes
- Layout remains clear and readable

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-016: Level 0 Skills
**Priority:** Medium  
**Prerequisites:** User has skill at level 0

**Steps:**
1. Create new skill (starts at level 0)
2. View constellation

**Expected Result:**
- Node appears at center (0 distance)
- Node still visible and interactive
- Can hover and click
- Doesn't break polygon calculation

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-017: High Level Skill (90+)
**Priority:** Low  
**Prerequisites:** User has skill at level 90+

**Steps:**
1. Have skill at level 90 or higher
2. View constellation

**Expected Result:**
- Chart max caps at 99
- High-level skill positioned near outer edge
- Scale remains reasonable
- Legend shows "Max scale: Level 99"

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-018: Click Node for Details
**Priority:** High  
**Prerequisites:** User viewing constellation

**Steps:**
1. Click on a skill node
2. Observe result

**Expected Result:**
- Skill detail modal opens
- Shows full skill information
- Constellation milestones displayed
- Can close modal to return to constellation

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-019: Edit Icon Button
**Priority:** Medium  
**Prerequisites:** User hovering over skill node

**Steps:**
1. Hover over skill node
2. Click blue Edit button (pencil icon)

**Expected Result:**
- Edit icon modal opens
- Can change skill icon
- Node updates with new icon
- Constellation position unchanged

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

### TC-SPIDER-020: Delete Custom Skill
**Priority:** High  
**Prerequisites:** User has custom skill

**Steps:**
1. Hover over custom skill node
2. Click red Delete button (trash icon)
3. Confirm deletion

**Expected Result:**
- Delete confirmation appears
- After confirmation, skill removed
- Spider chart recalculates
- Remaining skills reposition
- Polygon updates

**Actual Result:** [To be filled during testing]  
**Status:** [Pass/Fail]

---

## Visual Comparison Tests

### TC-SPIDER-VISUAL-001: Before/After Layout
**Steps:**
1. Compare old U-shaped constellation vs new spider chart

**Expected Result:**
- NEW: Radial layout, skills in circle
- NEW: Distance = level
- NEW: Grid circles and axis lines
- NEW: Filled polygon showing profile
- SAME: Beautiful space background
- SAME: Large interactive nodes
- SAME: Hover effects and tooltips

---

### TC-SPIDER-VISUAL-002: Symmetry Check
**Steps:**
1. Create 6 skills with equal levels
2. View constellation

**Expected Result:**
- Perfect hexagon shape
- All nodes equidistant from center
- Equal spacing between nodes
- Symmetric polygon

---

## Performance Tests

### TC-SPIDER-PERF-001: Animation Smoothness
**Steps:**
1. Hover rapidly over multiple nodes
2. Observe transitions

**Expected Result:**
- Smooth scaling transitions (duration-300)
- No lag or jitter
- Glow effects render smoothly
- Tooltips appear instantly

---

### TC-SPIDER-PERF-002: SVG Rendering
**Steps:**
1. View constellation with 15+ skills
2. Check browser performance

**Expected Result:**
- SVG renders efficiently
- No performance degradation
- Smooth scrolling
- No memory leaks

---

## Integration Tests

### TC-SPIDER-INT-001: View Mode Switching
**Steps:**
1. Switch between Constellation → Grid → List views
2. Return to Constellation

**Expected Result:**
- Spider chart regenerates correctly
- Positions recalculated
- No stale data
- Smooth transition

---

### TC-SPIDER-INT-002: Skill Level Up
**Steps:**
1. Complete task to level up skill
2. Return to constellation view

**Expected Result:**
- Node moves further from center
- Polygon shape updates
- Chart max recalculates if needed
- Smooth position transition

---

## Browser Compatibility

Test spider chart on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Mathematical Validation

**Formula for node position:**
```javascript
const angle = (2 * Math.PI * index) / skillCount - Math.PI / 2;
const radiusRatio = skillLevel / chartMax;
const radius = radiusRatio * maxRadius; // maxRadius = 38%
const x = centerX + radius * Math.cos(angle);
const y = centerY + radius * Math.sin(angle);
```

**Chart Max Calculation:**
```javascript
const maxLevel = Math.max(...skills.map(s => s.level), 0);
const chartMax = Math.min(maxLevel + 10, 99);
```

## Notes
- Spider chart uses SVG for geometric precision
- Polygon points calculated from skill positions
- Grid circles use ellipse SVG elements
- Same 800px height container as before
- Z-index layering: grid (0) → polygon (1) → nodes (2)
