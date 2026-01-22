# ML Task Sorting Feature

## Overview

The ML Task Sorting feature is an intelligent scheduling system that learns from your preferences to better organize your daily tasks. It uses priority-based sorting combined with feedback learning to continuously improve.

## How It Works

### 1. Click "Sort" Button
In the **Day View** of the calendar, click the ✨ **Sort** button to trigger AI-powered task sorting.

### 2. Review the Sorted Schedule
A modal will appear showing how the AI suggests organizing your day's tasks:
- Tasks are sorted by **priority** (High → Low)
- **High priority** tasks are scheduled first (or based on your learned preference)
- **Break times** are added between tasks (default: 15 minutes)
- Tasks fit within your **working hours** (default: 9 AM - 6 PM)

### 3. Provide Feedback
You have two options:

#### 👍 **Looks Good!** (Thumbs Up)
- Approves the AI's suggestion
- Applies the schedule to your calendar
- Reinforces the AI that this was a good sort

#### 👎 **Needs Changes** (Thumbs Down)
- Opens a drag-and-drop interface
- Drag tasks to reorder them as you prefer
- Write an explanation of why you made changes
- Submit to train the AI for next time

## Learning System

The AI learns from your feedback to improve future sorting:

### Learned Preferences
- **Preferred Start Hour**: When you typically start your day
- **Preferred End Hour**: When you typically end your day
- **Break Duration**: How much break time you prefer between tasks
- **Priority Time Preference**: Whether you prefer high-priority tasks in morning, afternoon, or evening
- **Priority Weights**: How important each priority level is to you

### How Learning Works
1. **Approvals** reinforce current sorting behavior
2. **Corrections** analyze what you changed:
   - If you move high-priority tasks later → learns you prefer them later
   - If you add more break time → learns you like longer breaks
   - If you start tasks earlier/later → learns your preferred start time
3. **Feedback text** is analyzed for keywords like "morning", "afternoon", "break", etc.

## Technical Details

### Algorithm
```
1. Get tasks for the selected date
2. Score each task: Priority Weight × Time Preference Multiplier
3. Sort tasks by score (highest first)
4. Schedule in order, adding breaks between tasks
5. Skip tasks that don't fit in working hours
```

### Priority Weights (Default)
| Priority | Weight |
|----------|--------|
| High | 100 |
| Med-High | 75 |
| Medium | 50 |
| Med-Low | 25 |
| Low | 10 |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/preferences` | GET | Get user's learned preferences |
| `/api/ml/sort-tasks` | POST | Sort tasks for a specific date |
| `/api/ml/apply-sort` | POST | Apply a sorted schedule |
| `/api/ml/feedback` | POST | Submit approval or correction feedback |

## Database Schema

### ml_sorting_feedback
Stores all feedback for future analysis:
- Original schedule before sorting
- ML's suggested schedule
- User's corrected schedule (if corrected)
- Feedback type (approved/corrected)
- User's explanation
- Task metadata for context

### ml_sorting_preferences
Stores learned preferences per user:
- Preferred start/end hours
- Priority weights
- Break duration
- Time preference for high-priority tasks
- Total approved/corrected counts

## Migration

Run this SQL in your Neon database:

```sql
-- See migrations/add_ml_sorting_tables.sql
```

## Test Cases

### Basic Sorting
1. Add multiple tasks with different priorities to a single day
2. Click Sort in Day view
3. Verify high-priority tasks appear first
4. Approve and verify schedule is applied

### Feedback Learning
1. Sort tasks and get a suggestion
2. Click "Needs Changes"
3. Drag to reorder tasks
4. Explain: "I prefer important tasks after lunch"
5. Submit correction
6. Sort again next day
7. Verify AI suggests high-priority tasks later

### Edge Cases
- No tasks on selected day → Shows "No tasks to sort"
- Not in Day view → Prompts to switch to Day view
- Single task → Sorts successfully (just schedules at start time)

## Future Improvements

1. **Time-of-day learning**: Learn that user does creative work in morning, meetings in afternoon
2. **Task type learning**: Certain types of tasks (meetings, focus work) at preferred times
3. **Calendar integration**: Respect existing Google Calendar events when sorting
4. **Multi-day planning**: Sort and balance tasks across the week
5. **Energy level modeling**: Learn when user is most productive
