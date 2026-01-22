# Auto-Classification Feature - Test Cases

**Feature:** Automatic AI Skill Categorization for New Tasks  
**Last Updated:** November 2024  
**Total Test Cases:** 20

---

## Table of Contents
1. [Core Functionality Tests (8)](#core-functionality-tests)
2. [AI Accuracy Tests (5)](#ai-accuracy-tests)
3. [Edge Cases (5)](#edge-cases)
4. [Integration Tests (2)](#integration-tests)

---

## Core Functionality Tests

### TC-AC-001: Auto-Categorize on Task Creation
**Objective:** Verify task is automatically categorized when created  
**Prerequisites:** User logged in, has training data  
**Steps:**
1. Open AddTaskModal
2. Fill in task details:
   - Title: "Fix React component bug"
   - Description: "Debug useState hook issue"
   - Duration: 60 minutes
   - Importance: Medium
3. Click "Create Quest"
4. Observe task in list
5. Wait 2-3 seconds
6. Refresh task list

**Expected Result:**
- Task created immediately (< 500ms response)
- Task appears in list without skill tags initially
- After 2-3 seconds, task automatically updates with skill tags
- Skill tags displayed: ["Craftsman", "Scholar"] (or similar)
- No manual "Categorize" action needed

---

### TC-AC-002: Background Processing
**Objective:** Verify categorization doesn't block task creation  
**Prerequisites:** User logged in  
**Steps:**
1. Create task "Write documentation"
2. Measure response time
3. Check if UI is blocked during categorization
4. Verify task appears immediately

**Expected Result:**
- Task creation response < 500ms
- UI remains responsive during AI categorization
- User can create multiple tasks quickly
- Categorization happens in background
- Console log shows: "✓ Auto-categorized task X: Skill1, Skill2"

---

### TC-AC-003: No Training Data Available
**Objective:** Verify system handles users with no training examples  
**Prerequisites:** New user account, no previous categorizations  
**Steps:**
1. Create a new task
2. Observe categorization behavior

**Expected Result:**
- Task still created successfully
- AI categorizes based on default skills only
- No errors thrown
- Skills assigned based on task content analysis

---

### TC-AC-004: Custom Skills Integration
**Objective:** Verify auto-categorization uses custom skills  
**Prerequisites:** User has custom skills created  
**Steps:**
1. Create custom skill "DevOps"
2. Manually categorize 3-5 tasks with "DevOps"
3. Create new task: "Deploy Docker container to AWS"
4. Wait for auto-categorization

**Expected Result:**
- AI recognizes custom "DevOps" skill
- Task categorized with "DevOps" skill
- Custom skill appears in skill tags
- Shows AI learned from previous examples

---

### TC-AC-005: Multiple Skill Assignment
**Objective:** Verify AI can assign multiple skills to one task  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Design and build user authentication system"
2. Wait for auto-categorization

**Expected Result:**
- Task assigned 2-4 relevant skills
- Examples: ["Craftsman", "Artist", "Scholar"]
- Skills are relevant to task content
- No duplicate skills assigned

---

### TC-AC-006: Training Data Learning
**Objective:** Verify AI learns from approved categorizations  
**Prerequisites:** User has approved training examples  
**Steps:**
1. Manually categorize 5 tasks with pattern:
   - "Write tests" → ["Scholar", "Craftsman"]
2. Approve all categorizations
3. Create new task: "Write unit tests for API"
4. Wait for auto-categorization

**Expected Result:**
- AI recognizes pattern from training
- New task categorized similarly: ["Scholar", "Craftsman"]
- Training examples influence AI decisions
- Consistent with user's previous choices

---

### TC-AC-007: Categorization Failure Gracefully Handled
**Objective:** Verify task creation succeeds even if AI fails  
**Prerequisites:** Simulate AI service failure  
**Steps:**
1. Temporarily disable OpenAI API (invalid key)
2. Create a new task
3. Observe behavior

**Expected Result:**
- Task still created successfully
- No error shown to user
- Task saved without skill tags
- Console error logged (not user-facing)
- User can manually categorize later

---

### TC-AC-008: Task Details Influence Categorization
**Objective:** Verify both title and details are analyzed  
**Prerequisites:** User logged in  
**Steps:**
1. Create task:
   - Title: "Project work"
   - Details: "Design wireframes and mockups for new dashboard using Figma"
2. Wait for categorization

**Expected Result:**
- AI analyzes both title AND details
- Categorized with design-related skills: ["Artist"]
- Details provide more context than title alone
- More accurate categorization with details

---

## AI Accuracy Tests

### TC-AC-009: Technical Task Categorization
**Objective:** Verify technical tasks categorized correctly  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Optimize database queries and add indexes"
2. Wait for auto-categorization

**Expected Result:**
- Skills include: "Craftsman" and/or "Scholar"
- No irrelevant skills like "Physical" or "Health"
- Reasoning makes sense for technical work

---

### TC-AC-010: Creative Task Categorization
**Objective:** Verify creative tasks categorized correctly  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Design logo and brand identity for startup"
2. Wait for auto-categorization

**Expected Result:**
- Skills include: "Artist"
- May include "Craftsman" for execution
- No purely physical or social skills

---

### TC-AC-011: Physical Task Categorization
**Objective:** Verify physical tasks categorized correctly  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Go to gym and complete workout routine"
2. Wait for auto-categorization

**Expected Result:**
- Skills include: "Physical" and/or "Health"
- No technical skills like "Craftsman"
- Appropriate for exercise/wellness

---

### TC-AC-012: Social/Communication Task Categorization
**Objective:** Verify social tasks categorized correctly  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Present quarterly results to executive team"
2. Wait for auto-categorization

**Expected Result:**
- Skills include: "Charisma" and/or "Connector"
- May include "Merchant" for business context
- Reflects communication aspect

---

### TC-AC-013: Business Task Categorization
**Objective:** Verify business tasks categorized correctly  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Negotiate vendor contract and pricing"
2. Wait for auto-categorization

**Expected Result:**
- Skills include: "Merchant"
- May include "Charisma" for negotiation
- Business-appropriate categorization

---

## Edge Cases

### TC-AC-014: Very Short Task Title
**Objective:** Verify categorization with minimal information  
**Prerequisites:** User logged in  
**Steps:**
1. Create task:
   - Title: "Meeting"
   - No details
2. Wait for categorization

**Expected Result:**
- AI still attempts categorization
- May use generic/default skills
- Or minimal skills assigned
- No errors thrown

---

### TC-AC-015: Very Long Task Details
**Objective:** Verify system handles lengthy task descriptions  
**Prerequisites:** User logged in  
**Steps:**
1. Create task with 2000+ character details
2. Wait for categorization

**Expected Result:**
- AI processes entire text (or truncates safely)
- Categorization completes successfully
- No performance issues
- Relevant skills assigned based on content

---

### TC-AC-016: Special Characters in Task
**Objective:** Verify special characters don't break categorization  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Fix bug: user@email.com → 500 error (urgent!)"
2. Wait for categorization

**Expected Result:**
- Special characters handled safely
- AI extracts meaning correctly
- Categorized as technical task
- No parsing errors

---

### TC-AC-017: Rapid Task Creation
**Objective:** Verify multiple tasks categorized concurrently  
**Prerequisites:** User logged in  
**Steps:**
1. Create 5 tasks rapidly (within 10 seconds)
2. Observe all tasks
3. Wait for all categorizations

**Expected Result:**
- All 5 tasks created immediately
- All 5 queued for categorization
- All complete within 10-15 seconds
- No categorization failures
- No race conditions or conflicts

---

### TC-AC-018: Duplicate Task Titles
**Objective:** Verify same title doesn't always get same skills  
**Prerequisites:** User logged in  
**Steps:**
1. Create task: "Review code"
2. Wait for categorization
3. Create another: "Review code" (different context in details)
4. Wait for categorization

**Expected Result:**
- Each task analyzed independently
- Skills may differ based on details
- Or similar if context is similar
- No hardcoded mappings

---

## Integration Tests

### TC-AC-019: Auto-Categorization + Manual Adjustment
**Objective:** Verify users can adjust auto-categorized skills  
**Prerequisites:** Task auto-categorized  
**Steps:**
1. Create task (auto-categorized with ["Craftsman"])
2. Select task
3. Click "Recategorize" button
4. Manually adjust to ["Artist", "Mindset"]
5. Save changes

**Expected Result:**
- Initial auto-categorization provides baseline
- User can override AI suggestions
- Manual changes saved correctly
- New categorization becomes training data
- AI learns from correction

---

### TC-AC-020: Auto-Categorization + Task Completion
**Objective:** Verify XP awarded to auto-categorized skills  
**Prerequisites:** Task auto-categorized  
**Steps:**
1. Create task "Build landing page" (auto-categorized to ["Craftsman", "Artist"])
2. Wait for categorization
3. Complete task
4. Check skill XP gains

**Expected Result:**
- XP awarded to "Craftsman" skill
- XP awarded to "Artist" skill
- Both skills show progress bars updated
- Auto-categorized skills work for XP system
- Gold also awarded correctly

---

## Test Execution Summary

### Passing Criteria
- **Core Functionality:** 8/8 passing (100%)
- **AI Accuracy:** 5/5 passing (100%)
- **Edge Cases:** 5/5 passing (100%)
- **Integration:** 2/2 passing (100%)

### Priority Levels
- **P0 (Critical):** TC-AC-001, TC-AC-002, TC-AC-007, TC-AC-020
- **P1 (High):** TC-AC-004, TC-AC-006, TC-AC-019
- **P2 (Medium):** All accuracy tests, TC-AC-017
- **P3 (Low):** TC-AC-014, TC-AC-016, TC-AC-018

### Test Environment
- **Browser:** Chrome 120+, Firefox 120+
- **Backend:** Node.js with OpenAI API integration
- **Database:** PostgreSQL (Neon)
- **AI Model:** GPT-4 (via OpenAI API)

---

## Notes
- Auto-categorization uses same AI as manual categorization
- Runs asynchronously - doesn't block task creation
- Uses up to 50 training examples per user
- Gracefully fails if AI unavailable
- Console logs success: "✓ Auto-categorized task X: Skill1, Skill2"
- Background process typically completes in 1-3 seconds

---

**End of Test Cases**
