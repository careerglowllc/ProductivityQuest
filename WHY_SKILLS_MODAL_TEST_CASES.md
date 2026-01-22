# Why These Skills Modal - Test Cases

## Feature: Why These Skills Modal

### Test Case 1: Open Modal from Skills Page
**Steps:**
1. Navigate to Skills page (/skills)
2. Locate "Why these skills?" button in header
3. Click the button
**Expected Result:**
- Modal opens with dark purple/slate gradient background
- Title displays "Why These Skills?" with HelpCircle icon
- Default macro life goals content visible
- "Not you? Write your own" link visible in top-right

### Test Case 2: View Default Macro Goals
**Steps:**
1. Open "Why these skills?" modal
2. Scroll through content
**Expected Result:**
- 7 macro life goal sections displayed:
  - Health & Athlete (green Activity icon)
  - Mindset (purple Brain icon)
  - Merchant (yellow Briefcase icon)
  - Scholar (blue Book icon)
  - Charisma & Connector (pink/cyan Users/Network icons)
  - Physical (red Sword icon)
  - Artist & Craftsman (orange/amber Palette/Wrench icons)
- Each section shows goal description and justification
- Footer message about tracking progress

### Test Case 3: Modal Styling Consistency
**Steps:**
1. Open modal
2. Inspect visual design
**Expected Result:**
- Background: gradient from slate-800 via slate-900 to purple-900
- Border: 2px yellow-600/30
- Text: yellow-100 for headings, yellow-200/90 for body
- Each goal card has slate-800/50 background with yellow-600/20 border
- Matches app's overall dark theme
- Max width 3xl, max height 85vh
- Scrollable if content exceeds viewport

### Test Case 4: Close Modal
**Steps:**
1. Open modal
2. Click X button in top-right
**Expected Result:**
- Modal closes smoothly
- Returns to Skills page
- No errors in console

### Test Case 5: Close Modal by Clicking Outside
**Steps:**
1. Open modal
2. Click backdrop (outside modal)
**Expected Result:**
- Modal closes
- Returns to Skills page

---

## Feature: Custom Macro Goals Editing

### Test Case 6: Access Edit Mode (First Time)
**Steps:**
1. Open modal (no custom goals saved yet)
2. Click "Not you? Write your own" link
**Expected Result:**
- Modal switches to edit mode
- Large textarea appears (min-height 400px)
- Placeholder text with example format visible
- Save Goals button (green gradient) visible
- Cancel button visible
- Edit link disappears

### Test Case 7: Write Custom Goals
**Steps:**
1. Enter edit mode
2. Type custom macro goals in textarea
3. Include emojis, bullet points, line breaks
**Expected Result:**
- Text appears as typed
- Textarea handles formatting
- Character limit not restrictive
- No lag while typing

### Test Case 8: Save Custom Goals
**Steps:**
1. Write custom goals in textarea
2. Click "Save Goals" button
**Expected Result:**
- Modal switches to custom goals view mode
- Textarea replaced with formatted display
- Custom content shows in pre-formatted card
- Link text changes to "Edit your goals"
- Success (saved to localStorage)

### Test Case 9: Cancel Edit Without Saving
**Steps:**
1. Enter edit mode
2. Type some text
3. Click "Cancel" button
**Expected Result:**
- Edit mode exits
- Returns to previous view (default or saved custom goals)
- Unsaved changes discarded
- No data lost from previous save

### Test Case 10: Edit Existing Custom Goals
**Steps:**
1. Have custom goals already saved
2. Open modal (shows custom goals)
3. Click "Edit your goals" link
**Expected Result:**
- Switches to edit mode
- Textarea populated with existing custom goals
- Can modify existing text
- Save/Cancel buttons appear

### Test Case 11: View Saved Custom Goals
**Steps:**
1. Save custom goals
2. Close modal
3. Reopen modal
**Expected Result:**
- Custom goals displayed (not default content)
- Formatting preserved (line breaks, spacing, emojis)
- "Edit your goals" link visible

### Test Case 12: Custom Goals Persistence
**Steps:**
1. Save custom goals
2. Close browser tab
3. Reopen application
4. Navigate to Skills page
5. Open modal
**Expected Result:**
- Custom goals still present (loaded from localStorage)
- No data loss
- Can still edit

### Test Case 13: Replace Custom Goals with New Content
**Steps:**
1. Have custom goals saved
2. Click "Edit your goals"
3. Delete all text
4. Write completely new goals
5. Save
**Expected Result:**
- Old content replaced with new content
- New content persists
- No remnants of old content

### Test Case 14: Clear Custom Goals (Return to Default)
**Steps:**
1. Have custom goals saved
2. Click "Edit your goals"
3. Delete all text (leave empty)
4. Save
**Expected Result:**
- Empty custom goals saved (or)
- Returns to showing default content
- "Not you? Write your own" link reappears

### Test Case 15: Long Custom Goals Content
**Steps:**
1. Write 2000+ characters of custom goals
2. Save
3. View saved content
**Expected Result:**
- All content saved successfully
- Modal scrollable to view all content
- No text truncation
- Performance remains smooth

---

## Feature: Button and Link Styling

### Test Case 16: "Why these skills?" Button Appearance
**Steps:**
1. Navigate to Skills page
2. Locate button in header area
**Expected Result:**
- Button next to "Create Custom Skill" button
- Outline style with slate-800/50 background
- Yellow-200 text color
- Border: 2px yellow-600/40
- HelpCircle icon visible
- Text: "Why these skills?"

### Test Case 17: "Why these skills?" Button Hover
**Steps:**
1. Hover over button
**Expected Result:**
- Background darkens to slate-700/50
- Border brightens to yellow-500/60
- Smooth transition
- Cursor becomes pointer

### Test Case 18: "Not you? Write your own" Link Styling
**Steps:**
1. Open modal (without custom goals)
2. Observe edit link in top-right
**Expected Result:**
- Text size: xs (small)
- Color: yellow-400/70
- Underlined
- Edit3 icon (h-3 w-3)
- Positioned: absolute top-4 right-12

### Test Case 19: Edit Link Hover Effect
**Steps:**
1. Hover over "Not you? Write your own" link
**Expected Result:**
- Text color brightens to yellow-300
- Underline persists
- Cursor becomes pointer

### Test Case 20: Save Goals Button Styling
**Steps:**
1. Enter edit mode
2. Observe Save button
**Expected Result:**
- Gradient background: green-600 to green-500
- Hover: green-700 to green-600
- White text
- Save icon visible
- Shadow effect

### Test Case 21: Cancel Button Styling
**Steps:**
1. Enter edit mode
2. Observe Cancel button
**Expected Result:**
- Outline variant
- Background: slate-800/50
- Hover: slate-700/50
- Yellow-200 text
- Border: yellow-600/40
- X icon visible

---

## Integration & Edge Cases

### Test Case 22: Modal with Custom Skills
**Steps:**
1. Create 3 custom skills
2. Open "Why these skills?" modal
3. View content
**Expected Result:**
- Modal content explains standard skills
- Custom skills not explicitly listed (as designed)
- Content still relevant and helpful

### Test Case 23: Modal on Mobile View
**Steps:**
1. Resize browser to mobile width (< 768px)
2. Open modal
**Expected Result:**
- Modal responsive and readable
- Max width adjusts for smaller screen
- Scrolling works smoothly
- Buttons accessible
- Edit link not cut off

### Test Case 24: Textarea Character Input
**Steps:**
1. Enter edit mode
2. Type special characters: ⚡️🎯💪📚🔥
3. Add markdown-style formatting: **bold** _italic_
**Expected Result:**
- All characters accepted
- Special chars display correctly
- Formatting symbols preserved (not rendered as markdown)

### Test Case 25: LocalStorage Limit
**Steps:**
1. Write extremely long content (5000+ words)
2. Save
**Expected Result:**
- Content saves successfully (localStorage ~5-10MB limit)
- Or graceful error if limit exceeded
- User notified if save fails

### Test Case 26: Multiple Browser Tabs
**Steps:**
1. Open Skills page in two browser tabs
2. In Tab 1: save custom goals
3. In Tab 2: open modal
**Expected Result:**
- Tab 2 shows old content (localStorage not synced across tabs)
- Refresh Tab 2 to see updated content
- Or implement storage event listener for real-time sync

### Test Case 27: LocalStorage Disabled
**Steps:**
1. Disable localStorage in browser settings
2. Try to save custom goals
**Expected Result:**
- Graceful error handling
- User notified that saving requires localStorage
- Or fallback to session storage
- App doesn't crash

### Test Case 28: Keyboard Navigation
**Steps:**
1. Open modal
2. Press Tab key repeatedly
3. Press Enter on focused elements
**Expected Result:**
- Can tab through focusable elements (close button, edit link)
- Enter activates focused button/link
- Focus visible with proper outline
- Accessible

### Test Case 29: Escape Key to Close
**Steps:**
1. Open modal
2. Press Escape key
**Expected Result:**
- Modal closes
- Returns to Skills page
- Works in both view and edit modes

### Test Case 30: View Modal After Task Completion
**Steps:**
1. Complete a task that increases skill XP
2. Navigate to Skills page
3. Open "Why these skills?" modal
**Expected Result:**
- Modal opens normally
- Shows relevant content (default or custom)
- No errors from state updates

---

## Accessibility

### Test Case 31: Screen Reader Support
**Steps:**
1. Enable screen reader (VoiceOver/NVDA)
2. Navigate to Skills page
3. Focus on "Why these skills?" button
**Expected Result:**
- Button announces properly
- Button purpose clear
- Icon announced or hidden from screen reader

### Test Case 32: Modal ARIA Labels
**Steps:**
1. Inspect modal with accessibility tools
**Expected Result:**
- DialogTitle has proper heading level
- Modal has aria-labelledby
- Close button has aria-label
- Keyboard trap within modal when open

### Test Case 33: Color Contrast
**Steps:**
1. Check color contrast ratios
2. Yellow-100 text on slate-900 background
3. Yellow-200 text on slate-800 background
**Expected Result:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Link text readable
- Button text high contrast

---

## Summary

**Total Test Cases: 33**

**Coverage:**
- Modal Display & Navigation: 5 test cases
- Custom Goals Editing: 10 test cases
- Button & Link Styling: 6 test cases
- Integration & Edge Cases: 8 test cases
- Accessibility: 4 test cases

**Key Features Tested:**
- ✅ Modal open/close functionality
- ✅ Default content display
- ✅ Edit mode with textarea
- ✅ Save/cancel operations
- ✅ LocalStorage persistence
- ✅ Custom vs. default content switching
- ✅ Responsive design
- ✅ Theme consistency
- ✅ Accessibility compliance
- ✅ Edge cases and error handling
