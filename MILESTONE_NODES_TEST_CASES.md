# Milestone Nodes Test Cases

## Overview
This document contains test cases for the new milestone nodes added to the Mindset and Health skill constellation charts.

## Test Date
November 18, 2025

## New Milestone Nodes

### Mindset Skill
1. **Eliminate 1 Bad Habit** (Level 12)
2. **Eliminate 2 Bad Habits** (Level 25)

### Health Skill
1. **Keto Diet for 3 Months** (Level 15)
2. **Keto Diet for 1 Year** (Level 30)
3. **Keto Diet for 3 Years** (Level 50)

## Test Cases

### TC-MN-001: Mindset Milestone - Eliminate 1 Bad Habit Visibility
**Preconditions:**
- User is logged in
- Navigate to Skills page
- Select Mindset skill
- View Constellation tab

**Steps:**
1. Locate the "Eliminate 1 Bad Habit" node in the constellation chart
2. Verify it appears at coordinates (x: 20, y: 62)
3. Verify it shows Level 12
4. Verify it has a connection line to "Daily Gratitude Practice" parent node

**Expected Result:**
- Node is visible and properly positioned
- Connection line is drawn correctly
- Node displays correct level and title
- Node appears unlocked/locked based on user's current level

**Status:** ⬜ Not Tested

---

### TC-MN-002: Mindset Milestone - Eliminate 2 Bad Habits Visibility
**Preconditions:**
- User is logged in
- Navigate to Skills page
- Select Mindset skill
- View Constellation tab

**Steps:**
1. Locate the "Eliminate 2 Bad Habits" node in the constellation chart
2. Verify it appears at coordinates (x: 18, y: 45)
3. Verify it shows Level 25
4. Verify it has a connection line to "Eliminate 1 Bad Habit" parent node

**Expected Result:**
- Node is visible and properly positioned
- Connection line is drawn correctly from parent
- Node displays correct level and title
- Node appears locked until user reaches Level 25 in Mindset

**Status:** ⬜ Not Tested

---

### TC-MN-003: Mindset Milestone - Progression Path
**Preconditions:**
- User is logged in
- User has Mindset skill at Level 1

**Steps:**
1. Navigate to Skills page → Mindset → Constellation tab
2. Verify the progression path: Start → Daily Gratitude Practice → Eliminate 1 Bad Habit → Eliminate 2 Bad Habits
3. Complete tasks to level up Mindset to Level 12
4. Verify "Eliminate 1 Bad Habit" node becomes unlocked
5. Continue leveling to Level 25
6. Verify "Eliminate 2 Bad Habits" node becomes unlocked

**Expected Result:**
- Nodes unlock at correct levels
- Visual feedback shows progression through the habit elimination path
- Users can track their habit elimination milestones

**Status:** ⬜ Not Tested

---

### TC-MN-004: Health Milestone - Keto Diet 3 Months Visibility
**Preconditions:**
- User is logged in
- Navigate to Skills page
- Select Health skill
- View Constellation tab

**Steps:**
1. Locate the "Keto Diet for 3 Months" node in the constellation chart
2. Verify it appears at coordinates (x: 12, y: 68)
3. Verify it shows Level 15
4. Verify it has a connection line to "Nutrition Basics" parent node

**Expected Result:**
- Node is visible and properly positioned
- Connection line is drawn correctly
- Node displays correct level and title
- Node appears on the left side of the constellation, branching from Nutrition

**Status:** ⬜ Not Tested

---

### TC-MN-005: Health Milestone - Keto Diet 1 Year Visibility
**Preconditions:**
- User is logged in
- Navigate to Skills page
- Select Health skill
- View Constellation tab

**Steps:**
1. Locate the "Keto Diet for 1 Year" node in the constellation chart
2. Verify it appears at coordinates (x: 10, y: 52)
3. Verify it shows Level 30
4. Verify it has a connection line to "Keto Diet for 3 Months" parent node

**Expected Result:**
- Node is visible and properly positioned below 3-month milestone
- Connection line is drawn correctly
- Node displays correct level and title
- Node appears locked until user reaches Level 30 in Health

**Status:** ⬜ Not Tested

---

### TC-MN-006: Health Milestone - Keto Diet 3 Years Visibility
**Preconditions:**
- User is logged in
- Navigate to Skills page
- Select Health skill
- View Constellation tab

**Steps:**
1. Locate the "Keto Diet for 3 Years" node in the constellation chart
2. Verify it appears at coordinates (x: 8, y: 36)
3. Verify it shows Level 50
4. Verify it has a connection line to "Keto Diet for 1 Year" parent node

**Expected Result:**
- Node is visible and properly positioned below 1-year milestone
- Connection line is drawn correctly
- Node displays correct level and title
- Node appears locked until user reaches Level 50 in Health

**Status:** ⬜ Not Tested

---

### TC-MN-007: Health Milestone - Keto Diet Progression Path
**Preconditions:**
- User is logged in
- User has Health skill at Level 1

**Steps:**
1. Navigate to Skills page → Health → Constellation tab
2. Verify the progression path: Choose Wellness → Nutrition Basics → Keto Diet for 3 Months → Keto Diet for 1 Year → Keto Diet for 3 Years
3. Complete health-related tasks to level up to Level 15
4. Verify "Keto Diet for 3 Months" node becomes unlocked
5. Continue leveling to Level 30
6. Verify "Keto Diet for 1 Year" node becomes unlocked
7. Continue leveling to Level 50
8. Verify "Keto Diet for 3 Years" node becomes unlocked

**Expected Result:**
- Nodes unlock at correct levels (15, 30, 50)
- Visual progression shows long-term keto diet adherence path
- Users can track their keto diet journey milestones

**Status:** ⬜ Not Tested

---

### TC-MN-008: Constellation Chart - No Node Overlap
**Preconditions:**
- User is logged in
- Navigate to Skills page

**Steps:**
1. View Mindset skill constellation chart
2. Verify no nodes overlap with existing or new nodes
3. Verify connection lines don't obscure node titles
4. View Health skill constellation chart
5. Verify keto diet nodes (positioned at x: 8-12) don't overlap with other nodes
6. Verify sleep and exercise paths remain clearly separated

**Expected Result:**
- All nodes are clearly visible
- No visual overlap between nodes
- Connection lines are clear and unambiguous
- Chart remains readable with new nodes added

**Status:** ⬜ Not Tested

---

### TC-MN-009: Mobile Responsiveness - New Nodes
**Preconditions:**
- User is logged in
- Access app on mobile device or use mobile viewport

**Steps:**
1. Navigate to Skills page on mobile
2. Select Mindset skill → Constellation tab
3. Verify new habit elimination nodes are visible and interactive
4. Select Health skill → Constellation tab
5. Verify keto diet nodes are visible and don't overflow screen
6. Test pinch-to-zoom and pan functionality with new nodes

**Expected Result:**
- New nodes are visible on mobile viewport
- Touch interactions work correctly
- Zoom and pan functions work smoothly
- Node titles remain readable at default zoom

**Status:** ⬜ Not Tested

---

### TC-MN-010: Node Click - Milestone Details
**Preconditions:**
- User is logged in
- Navigate to Skills page

**Steps:**
1. Click on "Eliminate 1 Bad Habit" node
2. Verify modal/tooltip displays milestone details
3. Click on "Keto Diet for 3 Months" node
4. Verify modal/tooltip displays milestone details
5. Verify level requirements and parent milestone dependencies are shown

**Expected Result:**
- Clicking nodes shows detailed information
- Level requirements are displayed
- Parent dependencies are clear
- Users understand what's needed to unlock the milestone

**Status:** ⬜ Not Tested

---

### TC-MN-011: SVG Rendering - Connection Lines
**Preconditions:**
- User is logged in
- Navigate to Skills page

**Steps:**
1. View Mindset constellation
2. Verify SVG line connects "Daily Gratitude Practice" to "Eliminate 1 Bad Habit"
3. Verify SVG line connects "Eliminate 1 Bad Habit" to "Eliminate 2 Bad Habits"
4. View Health constellation
5. Verify SVG line connects "Nutrition Basics" to "Keto Diet for 3 Months"
6. Verify SVG line connects "Keto Diet for 3 Months" to "Keto Diet for 1 Year"
7. Verify SVG line connects "Keto Diet for 1 Year" to "Keto Diet for 3 Years"

**Expected Result:**
- All connection lines render correctly
- Lines start and end at correct node positions
- No broken or missing connections
- Lines follow proper parent-child relationships

**Status:** ⬜ Not Tested

---

### TC-MN-012: Data Persistence - Node States
**Preconditions:**
- User is logged in
- User has unlocked some milestones

**Steps:**
1. Unlock "Eliminate 1 Bad Habit" milestone (reach Level 12 in Mindset)
2. Refresh the page
3. Verify node remains unlocked
4. Unlock "Keto Diet for 3 Months" milestone (reach Level 15 in Health)
5. Log out and log back in
6. Verify both milestones remain unlocked

**Expected Result:**
- Milestone unlock states persist across sessions
- Database correctly stores user progress
- No data loss on refresh or re-login

**Status:** ⬜ Not Tested

---

## Notes
- All new nodes integrate into existing constellation architecture
- Node positioning uses percentage-based coordinates (x, y from 0-100)
- Parent-child relationships create branching progression paths
- Level requirements ensure logical milestone progression

## Related Features
- Skill XP Progression System
- Constellation Chart Visualization
- Milestone Completion Tracking

## Files Modified
- `/client/src/pages/skills.tsx` - Added 5 new milestone nodes to skillMilestones object
