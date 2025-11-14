# AI Task Categorization Feature

## Overview
This feature uses OpenAI's GPT-4o-mini model to automatically categorize tasks based on their title and details, assigning relevant skill tags from your 9 available skills.

## Skills Available
1. **Craftsman** 🔧 - Building, fixing, creating physical things
2. **Artist** 🎨 - Creative expression, design, aesthetics
3. **Alchemist** 🧪 - Experimentation, science, transformation
4. **Merchant** 💼 - Business, sales, entrepreneurship
5. **Physical** ⚔️ - Physical fitness, sports, combat training
6. **Scholar** 📚 - Learning, research, knowledge acquisition
7. **Health** 📊 - Wellness, nutrition, medical care
8. **Connector** 🔗 - Networking, relationships, friendships
9. **Charisma** 👥 - Communication, leadership, social influence

## How It Works

### Backend (Server)
1. **OpenAI Service** (`server/openai-service.ts`)
   - `categorizeTaskWithAI(title, details)` - Categorizes a single task
   - `categorizeMultipleTasks(tasks[])` - Batch processes multiple tasks (5 at a time)
   - Uses GPT-4o-mini model with temperature 0.7
   - Returns 1-3 relevant skills per task with reasoning
   - Falls back to "Scholar" if AI fails

2. **API Endpoint** (`server/routes.ts`)
   - `POST /api/tasks/categorize`
   - Input: `{ taskIds: number[] }`
   - Output: `{ success: boolean, categorizedCount: number, tasks: Task[] }`
   - Fetches tasks from storage
   - Calls OpenAI service
   - Updates tasks with skillTags array
   - Saves back to database

3. **Database** (`shared/schema.ts`)
   - Added `skillTags` field to tasks table
   - Type: JSONB array of strings
   - Default: empty array `[]`

### Frontend (Client)
1. **Task Card Display** (`client/src/components/task-card.tsx`)
   - Displays skill tags as colored badges with icons
   - Each skill has unique color scheme
   - Shows after recurrence badge
   - Icon + skill name format

2. **Categorization UI** (`client/src/pages/home.tsx`)
   - "Categorize Skill" button in bulk actions toolbar
   - Purple themed to match AI/magic aesthetic
   - Disabled when no tasks selected
   - Shows progress toast during processing
   - Shows success toast with count
   - Clears selection and refreshes tasks

## Usage

### Step 1: Create Tasks
Create tasks with descriptive titles and details:
- "Run 5 miles at the park"
- "Read philosophy book on stoicism"
- "Attend networking event downtown"
- "Build a wooden bookshelf"

### Step 2: Select Tasks
- Check the boxes next to tasks you want to categorize
- Or use "Select All" button

### Step 3: Categorize
- Click "Categorize Skill" button (purple, with tag icon)
- Wait for AI processing (toast will show progress)
- Tasks will automatically refresh with new skill tags

### Step 4: View Results
- Skill tags appear as colored badges on each task card
- Each badge shows the skill icon and name
- Multiple skills can be assigned to complex tasks

## Example Categorizations

| Task | Expected Skills |
|------|----------------|
| "Run a mile" | Health, Physical |
| "Read philosophy book" | Scholar |
| "Build a chair" | Craftsman |
| "Design a logo" | Artist |
| "Chemistry experiment" | Alchemist, Scholar |
| "Sales pitch meeting" | Merchant, Charisma |
| "Coffee with old friend" | Connector |
| "Team presentation" | Charisma, Scholar |
| "Yoga class" | Health, Physical |

## Configuration

### OpenAI API Key
Set your OpenAI API key in environment variables:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Model Settings
Located in `server/openai-service.ts`:
- **Model**: `gpt-4o-mini` (cost-effective)
- **Temperature**: `0.7` (balanced creativity/consistency)
- **Max Tokens**: `300` (sufficient for categorization)
- **Batch Size**: `5` (rate limit friendly)

## Error Handling

### No API Key
- Error toast: "Failed to categorize tasks. Check your OpenAI API key."
- Check environment variables

### Rate Limits
- Batch processing limits to 5 concurrent requests
- If rate limited, try again in a few moments

### Network Errors
- Error toast shown to user
- Tasks remain unchanged
- Can retry categorization

## Technical Details

### AI Prompt Structure
```typescript
You are a task categorization AI for a gamified productivity app.
Given a task with title and details, categorize it into 1-3 of these skills:

1. Craftsman - building, fixing, creating...
2. Artist - creative work, design...
[... all 9 skills ...]

Examples:
- "Run a mile" → Health, Physical
- "Read philosophy" → Scholar
- "Networking event" → Merchant, Connector, Charisma
```

### Response Format
```json
{
  "skills": ["Health", "Physical"],
  "reasoning": "This task involves physical activity (running) which develops both Physical and Health skills."
}
```

### Database Schema
```typescript
{
  id: number,
  title: string,
  details: string,
  skillTags: string[], // ["Health", "Physical"]
  // ... other fields
}
```

## Future Enhancements

### Potential Improvements
- [ ] Add manual skill tag editing
- [ ] Show AI reasoning in task details
- [ ] Skill-based filtering and search
- [ ] Analytics: which skills are most common
- [ ] Auto-categorize on task creation
- [ ] Custom skill definitions per user
- [ ] Skill tag suggestions as you type

### Integration Opportunities
- Use skill tags for XP distribution
- Skill-based quest recommendations
- Progress tracking per skill category
- Leaderboards by skill mastery

## Troubleshooting

### Tags Not Showing
1. Check if tasks were successfully categorized (check toast message)
2. Refresh the page manually
3. Check browser console for errors
4. Verify database has skillTags field

### AI Returns Wrong Skills
1. Add more details to task description
2. AI uses context from both title and details
3. Can manually adjust if needed (future feature)

### Performance Issues
1. Batch size can be adjusted in openai-service.ts
2. Consider upgrading to faster OpenAI model
3. Add caching for common task patterns

## Cost Estimation

**GPT-4o-mini pricing** (as of 2024):
- ~$0.00015 per task categorization
- 100 tasks = ~$0.015 (1.5 cents)
- 1000 tasks = ~$0.15 (15 cents)

Very cost-effective for typical usage!
