# 🔥 FIRE Goal Widget + Recent Features — Test Cases

**Last updated:** June 1, 2026

---

## Table of Contents

1. [FIRE Goal Overview Widget](#1-fire-goal-overview-widget)
2. [Inheritance Toggle (Widget)](#2-inheritance-toggle-widget)
3. [FIRE Locations — New Destinations](#3-fire-locations--new-destinations)
4. [Inheritance Age Slider — Parents Age Subheader](#4-inheritance-age-slider--parents-age-subheader)
5. [Financial Items — Notes Field](#5-financial-items--notes-field)
6. [Google Workspace Subscription Consolidation](#6-google-workspace-subscription-consolidation)

---

## 1. FIRE Goal Overview Widget

### TC-FGW-01: Widget visible by default on Overview tab
- **Steps:** Log in → navigate to Finances → Overview tab
- **Expected:** 🔥 FIRE Goal widget is visible in the widget grid
- **Status:** ☐

### TC-FGW-02: Widget shows correct percentage
- **Steps:** Note liquid NW from Net Worth widget → note FIRE goal amount shown in FIRE Goal widget
- **Expected:** `pct = liquidNW / goalAmount × 100` matches displayed percentage (±0.1%)
- **Status:** ☐

### TC-FGW-03: Progress bar width matches percentage
- **Steps:** Inspect progress bar width vs displayed percentage
- **Expected:** Bar width % equals displayed percentage value
- **Status:** ☐

### TC-FGW-04: All 4 stat tiles show correct values
- **Steps:** Open widget → check Liquid NW Today, FIRE Age, Monthly @ Retirement, Remaining
- **Expected:**
  - Liquid NW matches FIRE tab liquid NW
  - FIRE Age = 28 + yearsToFIRE, e.g. "Age 37 (2035)"
  - Monthly @ Retirement = inflated annual ÷ 12
  - Remaining = max(0, goal − liquidNW)
- **Status:** ☐

### TC-FGW-05: "Open full FIRE analysis →" link works
- **Steps:** Click the link button at bottom of widget
- **Expected:** Active tab switches to "fire", full FIRE tab renders
- **Status:** ☐

### TC-FGW-06: Widget responds to FIRE tab slider changes
- **Steps:** Go to FIRE tab → change tier to "cushy" → return to Overview
- **Expected:** FIRE Goal widget FIRE Goal amount and % update to reflect cushy tier
- **Status:** ☐

### TC-FGW-07: Widget is toggleable via widget bar
- **Steps:** Click "FIRE Goal" button in toggle bar above widget grid
- **Expected:** Widget disappears; click again → reappears
- **Status:** ☐

### TC-FGW-08: Widget is draggable (reorder)
- **Steps:** Drag FIRE Goal widget to a different position in grid
- **Expected:** Order persists after page refresh
- **Status:** ☐

### TC-FGW-09: Widget order persists to localStorage
- **Steps:** Reorder widget → refresh page
- **Expected:** Widget order is restored from localStorage
- **Status:** ☐

### TC-FGW-10: Widget defaults to Thailand comfortable
- **Steps:** Fresh login (no prior FIRE tab interaction) → check widget subheader
- **Expected:** Subheader reads "4.00% SWR · comfortable · 🇹🇭 thailand"
- **Status:** ☐

---

## 2. Inheritance Toggle (Widget)

### TC-INH-01: Default shows Standard SWR mode
- **Steps:** Open FIRE Goal widget
- **Expected:** "📈 Standard SWR" button is highlighted orange; "💎 w/ Inheritance" is dimmed
- **Status:** ☐

### TC-INH-02: Toggle to inheritance mode
- **Steps:** Click "💎 w/ Inheritance" button
- **Expected:**
  - Button turns emerald/green
  - Progress bar turns green gradient
  - Subheader updates to "Drawdown to age X"
  - FIRE goal amount decreases (inheritance mode requires less capital)
  - Percentage increases accordingly
- **Status:** ☐

### TC-INH-03: Toggle back to standard mode
- **Steps:** Click "📈 Standard SWR" after switching to inheritance mode
- **Expected:** All values revert to standard SWR calculations; bar turns orange
- **Status:** ☐

### TC-INH-04: Widget toggle is independent of FIRE tab toggle
- **Steps:**
  1. Enable inheritance on FIRE tab (Advanced Assumptions)
  2. Go to Overview → FIRE Goal widget should default to Standard SWR
  3. Toggle widget to inheritance → navigate back to FIRE tab
  4. FIRE tab inheritance mode should be unchanged
- **Expected:** Both toggles are fully independent
- **Status:** ☐

### TC-INH-05: Inheritance goal uses correct drawdown years
- **Steps:** Set inheritance age to 48 on FIRE tab sliders → check widget in inheritance mode
- **Expected:** Goal = `inflatedAnnual × [1 − 1.07^(−(48 − fireAge))] / 0.07`
- **Status:** ☐

### TC-INH-06: Inheritance goal is always lower than standard goal
- **Steps:** Toggle between Standard SWR and w/ Inheritance in widget
- **Expected:** Inheritance mode goal < Standard mode goal (portfolio only needs to last until inheritance, not forever)
- **Status:** ☐

---

## 3. FIRE Locations — New Destinations

### TC-LOC-01: All 6 locations appear in location selector
- **Steps:** Go to FIRE tab → check location buttons
- **Expected:** Thailand 🇹🇭, Vietnam 🇻🇳, Colombia 🇨🇴, Puerto Rico 🇵🇷, Austin 🤠, Auburn 🏔️ all visible
- **Status:** ☐

### TC-LOC-02: Puerto Rico — visa line is $0
- **Steps:** Select Puerto Rico → open any tier's cost breakdown
- **Expected:** "Visa, travel buffer" = $0/mo for all tiers
- **Status:** ☐

### TC-LOC-03: Austin — visa line is $0
- **Steps:** Select Austin, Texas → check cost breakdown
- **Expected:** Visa line = $0; health insurance higher than SEA locations (~$350/mo comfortable)
- **Status:** ☐

### TC-LOC-04: Auburn — visa line is $0
- **Steps:** Select Auburn, California → check cost breakdown
- **Expected:** Visa line = $0; transportation $300/mo (car-dependent)
- **Status:** ☐

### TC-LOC-05: Puerto Rico comfortable tier costs
- **Steps:** Select Puerto Rico → comfortable tier
- **Expected:** rent $1,200 · food $600 · transport $150 · health $200 · entertainment $350 · utilities $130 · visa $0 = $2,630/mo base
- **Status:** ☐

### TC-LOC-06: Austin comfortable tier costs
- **Steps:** Select Austin → comfortable tier
- **Expected:** rent $1,800 · food $700 · transport $250 · health $350 · entertainment $400 · utilities $180 · visa $0 = $3,680/mo base
- **Status:** ☐

### TC-LOC-07: Auburn comfortable tier costs
- **Steps:** Select Auburn → comfortable tier
- **Expected:** rent $1,600 · food $600 · transport $300 · health $350 · entertainment $300 · utilities $160 · visa $0 = $3,310/mo base
- **Status:** ☐

### TC-LOC-08: Methodology essay visible for each location
- **Steps:** Select each new location → click "📖 How these numbers were calculated"
- **Expected:** Each expands a detailed methodology essay specific to that location
- **Status:** ☐

### TC-LOC-09: Puerto Rico Act 60 note in methodology
- **Steps:** Select Puerto Rico → open methodology
- **Expected:** Act 60 section present mentioning 0% capital gains, 183-day residency, $10K charitable contribution
- **Status:** ☐

### TC-LOC-10: Domestic location FIRE goal is higher than SEA
- **Steps:** Compare FIRE goal for Austin comfortable vs Thailand comfortable (same SWR, same tier)
- **Expected:** Austin goal > Thailand goal (higher base spend)
- **Status:** ☐

### TC-LOC-11: Location change updates FIRE Goal widget
- **Steps:** Change location to Auburn → return to Overview tab
- **Expected:** FIRE Goal widget subheader shows "🏔️ auburn", numbers update
- **Status:** ☐

### TC-LOC-12: Comparison table includes all 6 locations
- **Steps:** Go to FIRE tab → scroll to comparison/summary table
- **Expected:** All 6 locations appear with their respective goals, monthly spend, and progress %
- **Status:** ☐

---

## 4. Inheritance Age Slider — Parents Age Subheader

### TC-PAS-01: Subheader visible below "Inheritance Age" label
- **Steps:** Enable inheritance mode in FIRE tab → check Advanced Assumptions section
- **Expected:** Below "Inheritance Age" label, a dimmed subheader reads "Parents age X at that time"
- **Status:** ☐

### TC-PAS-02: Parents age calculation at default (age 50)
- **Steps:** Check slider at default value (Age 50)
- **Expected:** Subheader reads "Parents age 95 at that time" (73 + (50 − 28) = 95)
- **Status:** ☐

### TC-PAS-03: Parents age at slider minimum (age 35)
- **Steps:** Drag slider to minimum (35)
- **Expected:** "Parents age 80 at that time" (73 + (35 − 28) = 80)
- **Status:** ☐

### TC-PAS-04: Parents age at slider maximum (age 65)
- **Steps:** Drag slider to maximum (65)
- **Expected:** "Parents age 110 at that time" (73 + (65 − 28) = 110)
- **Status:** ☐

### TC-PAS-05: Subheader updates live as slider moves
- **Steps:** Drag the inheritance age slider while watching subheader
- **Expected:** Parents age number updates in real-time with each slider tick
- **Status:** ☐

### TC-PAS-06: Subheader only visible when inheritance mode enabled
- **Steps:** Disable inheritance mode → check Advanced Assumptions
- **Expected:** Inheritance age slider is hidden (entire section collapses); no orphaned subheader
- **Status:** ☐

---

## 5. Financial Items — Notes Field

### TC-NOTE-01: Notes display as subheader in subscriptions table
- **Steps:** Go to Finances → Table tab → find "CareerGlow Google Workspace"
- **Expected:** Below the item name, a dimmed line reads "Reviewer & Admin accounts"
- **Status:** ☐

### TC-NOTE-02: Items without notes show no subheader
- **Steps:** Check any other subscription item (e.g. "Netflix")
- **Expected:** No empty subheader or extra whitespace below item name
- **Status:** ☐

### TC-NOTE-03: Notes column exists in DB
- **Steps:** Query `SELECT notes FROM financial_items WHERE id = 469`
- **Expected:** Returns `"Reviewer & Admin accounts"`
- **Status:** ☐

### TC-NOTE-04: Notes field is nullable
- **Steps:** Query `SELECT notes FROM financial_items WHERE notes IS NULL LIMIT 1`
- **Expected:** Returns rows (most items have null notes)
- **Status:** ☐

### TC-NOTE-05: Notes visible in all table view contexts
- **Steps:** Check subscriptions table in both grouped and flat views
- **Expected:** Notes subheader visible in both views wherever `item.notes` is truthy
- **Status:** ☐

---

## 6. Google Workspace Subscription Consolidation

### TC-GWS-01: Only one Google Workspace entry exists
- **Steps:** Go to Finances → search/filter for "Google Workspace" or "Workspace"
- **Expected:** Exactly one entry: "CareerGlow Google Workspace"
- **Status:** ☐

### TC-GWS-02: Correct monthly cost
- **Steps:** Find "CareerGlow Google Workspace" in subscriptions table
- **Expected:** Monthly cost = $52.80/mo, Annual = $633.60/yr
- **Status:** ☐

### TC-GWS-03: Notes subheader present
- **Steps:** Check item in table view
- **Expected:** "Reviewer & Admin accounts" appears below item name
- **Status:** ☐

### TC-GWS-04: Old duplicate entries gone
- **Steps:** Search for "Admin CareerGlow" or "reviewer@mycareerglow.com"
- **Expected:** No results — both old entries are removed
- **Status:** ☐

### TC-GWS-05: Total expense calculations updated
- **Steps:** Note total business expenses before/after consolidation
- **Expected:** Previous two entries totaled $14/mo; new single entry = $52.80/mo. Total business expenses reflect this (net change: +$38.80/mo)
- **Status:** ☐
