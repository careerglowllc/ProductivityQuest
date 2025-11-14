# AI Categorization Training System

## Overview
The AI task categorization system now includes **feedback-based learning** that improves over time based on your corrections and approvals.

## 🔒 **Privacy & Data Isolation**

**IMPORTANT:** All data is **completely isolated per user account**. 

### Training Data Isolation
- Your training examples are stored with your unique userId
- Only YOUR training data is used when categorizing YOUR tasks
- You never see or benefit from other users' categorizations
- Each person's AI learns their unique journey independently

### Skill Progress Isolation
- All skill levels (1-99) are unique to YOUR account
- Your XP progress is completely separate from other users
- New users start with all 9 skills at level 1, XP 0
- Existing users keep their current levels and progress

This ensures the AI and skill system adapts to YOUR specific goals and preferences, not a generic "everyone's" approach.

**Default Skills for New Users:**
1. Craftsman - Level 1, XP 0
2. Artist - Level 1, XP 0
3. Mindset - Level 1, XP 0
4. Merchant - Level 1, XP 0
5. Physical - Level 1, XP 0
6. Scholar - Level 1, XP 0
7. Health - Level 1, XP 0
8. Connector - Level 1, XP 0
9. Charisma - Level 1, XP 0

## How It Works

### 1. **Few-Shot Learning**
- AI uses approved examples as training data
- When you categorize tasks, AI learns from your feedback
- Similar future tasks will be categorized more accurately
- System stores up to 50 most recent approved examples **per user**

### 2. **Training Data Flow**

```
User categorizes task → AI suggests skills → User approves/corrects
                                                      ↓
                                            Saved to training database
                                                      ↓
                                            Used in future categorizations
```

### 3. **Database Schema**

New table: `skill_categorization_training`

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| userId | varchar | User who provided feedback |
| taskTitle | text | Original task title |
| taskDetails | text | Task details/description |
| correctSkills | jsonb | User-approved skills (array) |
| aiSuggestedSkills | jsonb | What AI originally suggested |
| isApproved | boolean | Whether user approved AI suggestion |
| createdAt | timestamp | When feedback was given |

### 4. **API Endpoints**

#### POST `/api/tasks/categorize`
Categorizes tasks using AI + training examples
- **Request**: `{ taskIds: number[] }`
- **Response**: 
```json
{
  "success": true,
  "categorizedCount": 5,
  "tasks": [{
    "id": 1,
    "title": "Run a mile",
    "skillTags": ["Health", "Physical"],
    "aiSuggestion": {
      "skills": ["Health", "Physical"],
      "reasoning": "Physical exercise developing health and fitness"
    }
  }]
}
```

#### POST `/api/tasks/categorize-feedback`
Submit feedback on categorization
- **Request**: 
```json
{
  "taskId": 123,
  "approvedSkills": ["Health", "Physical"],
  "aiSuggestedSkills": ["Health"],  // optional
  "isApproved": true  // optional, defaults to true
}
```
- **Response**: `{ success: true, message: "Feedback recorded" }`

#### GET `/api/tasks/training-examples`
Get all training examples for review
- **Response**: 
```json
{
  "examples": [{
    "id": 1,
    "taskTitle": "Morning jog",
    "taskDetails": "5k run in the park",
    "correctSkills": ["Health", "Physical"],
    "aiSuggestedSkills": ["Health"],
    "isApproved": true,
    "createdAt": "2025-01-15T10:30:00Z"
  }]
}
```

## Usage Examples

### Example 1: AI Suggests Correctly
```
Task: "Read philosophy book"
AI suggests: ["Scholar"]
User: ✅ Approves
Result: Saved as training example, will influence future book-reading tasks
```

### Example 2: AI Misses a Skill
```
Task: "Networking lunch"
AI suggests: ["Connector"]
User: Corrects to ["Connector", "Merchant", "Charisma"]
Result: AI learns that networking involves multiple social/business skills
```

### Example 3: Learning Takes Effect
```
Task: "Coffee meeting with potential client"
AI suggests: ["Connector", "Merchant", "Charisma"]
Reasoning: "Similar to networking lunch from training examples"
```

## Improvement Over Time

### Week 1 (No Training Data)
- Generic categorizations
- Single skills assigned
- Limited context understanding

### Month 1 (20-30 examples)
- Better at YOUR specific task types
- Multi-skill assignments improve
- Recognizes your patterns

### Month 3 (100+ examples)
- Highly personalized to your workflow
- Understands your specific terminology
- Matches your categorization style

## Frontend Integration (TODO)

### Option 1: Inline Feedback in Task Detail Modal
```tsx
// After AI categorization
<div className="mt-2">
  <p className="text-sm text-yellow-200">AI suggested: {skills.join(', ')}</p>
  <div className="flex gap-2 mt-2">
    <Button onClick={() => approveCategorization(taskId, skills)}>
      ✓ Correct
    </Button>
    <Button onClick={() => openSkillSelector(taskId)}>
      ✗ Correct to...
    </Button>
  </div>
</div>
```

### Option 2: Batch Review Page
- List all recently categorized tasks
- Show AI suggestions vs current tags
- Bulk approve/correct interface
- Training progress stats

### Option 3: Training Dashboard
- View all training examples
- Edit/remove incorrect examples
- See categorization accuracy over time
- Download training data

## Best Practices

### For Users:
1. **Be Consistent**: Categorize similar tasks the same way
2. **Provide Feedback**: Approve or correct at least 10-20 tasks initially
3. **Be Specific**: Use task details to help AI understand context
4. **Review Periodically**: Check training examples for inconsistencies

### For Development:
1. **Limit Training Data**: Currently capped at 50 examples (prevents token limits)
2. **Filter by User**: Each user has personalized training data
3. **Order Matters**: Most recent examples prioritized
4. **Validate Skills**: Ensure suggested skills exist in AVAILABLE_SKILLS array

## Technical Details

### OpenAI Prompt Enhancement
```typescript
// Before (generic)
"Categorize this task into skills"

// After (with training)
"Categorize this task into skills

Learned Examples (from your feedback):
- 'Morning run' (Go for a jog) → Health, Physical
- 'Read book' (Philosophy text) → Scholar
- 'Client meeting' (Sales pitch) → Merchant, Charisma, Connector

Task: [new task]"
```

### Performance Impact
- **Minimal**: Training data fetched once per batch
- **Token Usage**: +50-200 tokens per request (acceptable)
- **Database**: Simple indexed query on userId
- **Caching**: Consider adding Redis cache for training data

## Future Enhancements

1. **Automatic Learning**: Auto-save when user manually edits skill tags
2. **Confidence Scores**: AI returns confidence, only ask feedback on low-confidence
3. **Negative Examples**: Track what AI got wrong to avoid repeating
4. **Skill Combinations**: Learn common skill pairs (e.g., Physical+Health)
5. **Export/Import**: Share training data between users or workspaces
6. **Analytics**: Show improvement metrics over time

## Migration Guide

### Existing Users
- Training table is empty initially
- AI works same as before
- Start providing feedback to improve
- No action required

### New Users
- Can benefit from example categorizations
- Encouraged to provide feedback early
- System improves faster with more data

## Example Code: Approve Categorization

```typescript
// Frontend
const approveCategorization = async (taskId: number, skills: string[]) => {
  await apiRequest("POST", "/api/tasks/categorize-feedback", {
    taskId,
    approvedSkills: skills,
    aiSuggestedSkills: skills, // Same = approved
    isApproved: true
  });
  
  toast({ title: "Feedback saved!", description: "AI will learn from this" });
};

// Or correct it
const correctCategorization = async (taskId: number, correctSkills: string[], aiSuggested: string[]) => {
  await apiRequest("POST", "/api/tasks/categorize-feedback", {
    taskId,
    approvedSkills: correctSkills,
    aiSuggestedSkills: aiSuggested,
    isApproved: false
  });
  
  toast({ title: "Correction saved!", description: "AI will improve" });
};
```

---

**The system is now live and ready to learn from your feedback!** 🎯
