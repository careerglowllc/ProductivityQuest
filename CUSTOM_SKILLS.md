# Custom Skills System Documentation

## Overview

The Custom Skills System allows users to create, manage, and track their own personalized skills alongside the 9 default skills. Custom skills are fully integrated with:
- **AI Task Categorization** - OpenAI uses custom skill descriptions to intelligently categorize tasks
- **Spider Chart Visualization** - Custom skills appear in the dashboard spider chart
- **Skill Leveling System** - Custom skills use the same RPG-style XP formula as default skills
- **Training Data** - Manual skill adjustments teach the AI about custom skills
- **User Isolation** - All custom skills are private and tied to specific user accounts

---

## Architecture

### Database Schema

**Table: `user_skills`**
```sql
CREATE TABLE user_skills (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  skill_name VARCHAR NOT NULL,
  skill_icon TEXT,                    -- Icon name (e.g., "Star", "Heart", "Trophy")
  skill_description TEXT,              -- Custom description for AI categorization
  skill_milestones JSONB,              -- Array of milestone strings
  is_custom BOOLEAN DEFAULT false,     -- true = user-created, false = default
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  max_xp INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `skill_icon`: Name of Lucide React icon component (e.g., "Star", "Gem", "Flame")
- `skill_description`: Used by OpenAI to understand when to categorize tasks with this skill
- `skill_milestones`: Optional array like `["Level 10: Beginner", "Level 25: Expert", "Level 99: Master"]`
- `is_custom`: Distinguishes custom skills (can be deleted) from default skills (cannot be deleted)

---

## API Endpoints

### 1. GET `/api/skills`
**Description:** Get all user skills (default + custom)

**Response:**
```json
{
  "skills": [
    {
      "id": 1,
      "userId": "user_123",
      "skillName": "Craftsman",
      "skillIcon": "Wrench",
      "skillDescription": null,
      "skillMilestones": null,
      "isCustom": false,
      "level": 5,
      "xp": 750,
      "maxXp": 1000
    },
    {
      "id": 15,
      "userId": "user_123",
      "skillName": "Photography",
      "skillIcon": "Camera",
      "skillDescription": "Taking photos, editing images, composition, lighting",
      "skillMilestones": ["Level 10: First exhibition", "Level 99: Master photographer"],
      "isCustom": true,
      "level": 3,
      "xp": 200,
      "maxXp": 300
    }
  ]
}
```

### 2. POST `/api/skills/custom`
**Description:** Create a new custom skill

**Request Body:**
```json
{
  "skillName": "Photography",
  "skillIcon": "Camera",
  "skillDescription": "Taking photos, editing images, composition, lighting, visual storytelling",
  "skillMilestones": [
    "Level 10: First photo exhibition",
    "Level 25: Professional photographer",
    "Level 99: Master photographer with published work"
  ],
  "level": 1
}
```

**Response:**
```json
{
  "skill": {
    "id": 15,
    "userId": "user_123",
    "skillName": "Photography",
    "skillIcon": "Camera",
    "skillDescription": "Taking photos, editing images...",
    "skillMilestones": ["Level 10: First exhibition", ...],
    "isCustom": true,
    "level": 1,
    "xp": 0,
    "maxXp": 100
  }
}
```

**Error Responses:**
- `400`: Missing required fields (skillName)
- `409`: Skill with this name already exists for this user
- `500`: Server error

### 3. DELETE `/api/skills/:skillId`
**Description:** Delete a custom skill (only custom skills can be deleted)

**Response:**
```json
{
  "message": "Skill deleted successfully"
}
```

**Side Effects:**
- Removes skill from user's skill list
- Removes skill from ALL task `skillTags` arrays for this user
- Removes skill from AI categorization options

**Error Responses:**
- `400`: Invalid skill ID
- `403`: Cannot delete default skills
- `404`: Skill not found
- `500`: Server error

---

## Backend Implementation

### storage.ts Methods

```typescript
// Create a custom skill
async createCustomSkill(userId: string, skillData: {
  skillName: string;
  skillIcon?: string;
  skillDescription?: string;
  skillMilestones?: string[];
  level?: number;
}): Promise<UserSkill>

// Delete a custom skill
async deleteCustomSkill(userId: string, skillId: number): Promise<boolean>

// Get all user skills (default + custom)
async getUserSkills(userId: string): Promise<UserSkill[]>
```

### OpenAI Service Integration

The `categorizeTaskWithAI` function now accepts a `userSkills` parameter:

```typescript
export async function categorizeTaskWithAI(
  title: string,
  details?: string,
  trainingExamples: TrainingExample[] = [],
  userSkills: UserSkill[] = []
): Promise<CategorizationResult>
```

**How it works:**
1. Builds dynamic skill list from `userSkills` array
2. Uses `skill.skillDescription` if available, falls back to default descriptions
3. For custom skills without descriptions, generates basic description from skill name
4. AI receives all skills (default + custom) as categorization options

**Example Prompt:**
```
Available skills and their descriptions:
- Craftsman: Building, creating, repairing physical objects...
- Photography: Taking photos, editing images, composition, lighting (CUSTOM)
- Coding: Programming, software development, algorithms (CUSTOM)

Task to categorize:
Title: Edit wedding photos
Details: Adjust lighting and color grading

Select 1-3 most relevant skills...
```

---

## Frontend Implementation

### Components

#### 1. AddSkillModal (`/client/src/components/add-skill-modal.tsx`)

**Purpose:** Modal form for creating custom skills

**Features:**
- Skill name input (required, max 30 characters)
- Icon picker with 20 icon options (grid display)
- Description textarea (required, max 500 characters, helps AI)
- Starting level (1-99)
- 3 optional milestone inputs (Level 10, 25, 99 milestones)
- Form validation
- Loading state during submission

**Usage:**
```tsx
<AddSkillModal
  open={showAddModal}
  onOpenChange={setShowAddModal}
  onSubmit={async (skillData) => {
    await apiRequest("POST", "/api/skills/custom", skillData);
    queryClient.invalidateQueries(["/api/skills"]);
    toast({ title: "✓ Custom skill created!" });
  }}
/>
```

#### 2. Icon Mapping Utility (`/client/src/lib/skillIcons.ts`)

**Purpose:** Centralized icon mapping for skill icons

```typescript
import { Star, Heart, Trophy, ... } from "lucide-react";

export const SKILL_ICON_MAP: Record<string, LucideIcon> = {
  Star, Heart, Trophy, // ... 20+ icons
};

export function getSkillIcon(iconName: string | null): LucideIcon {
  return SKILL_ICON_MAP[iconName] || Star; // Fallback to Star
}
```

**Usage:**
```tsx
const Icon = getSkillIcon(skill.skillIcon);
return <Icon className="w-6 h-6" />;
```

### Skills Page Updates (`/client/src/pages/skills.tsx`)

**Required Changes:**

1. **Fetch Skills from API** (instead of hardcoded array)
```tsx
const { data: skills, isLoading } = useQuery<UserSkill[]>({
  queryKey: ["/api/skills"],
});
```

2. **Add "Create Custom Skill" Button**
```tsx
<Button 
  onClick={() => setShowAddModal(true)}
  className="bg-purple-600 hover:bg-purple-700"
>
  <Plus className="w-4 h-4 mr-2" />
  Create Custom Skill
</Button>
```

3. **Add Delete Button on Custom Skills**
```tsx
{skill.isCustom && (
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => {
      e.stopPropagation();
      setSkillToDelete(skill);
      setShowDeleteDialog(true);
    }}
    className="absolute top-2 right-2"
  >
    <Trash2 className="w-4 h-4 text-red-400" />
  </Button>
)}
```

4. **Delete Confirmation Dialog**
```tsx
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Custom Skill?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "{skillToDelete?.skillName}" and remove it from all tasks.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteSkill} className="bg-red-600">
        Delete Skill
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

5. **Handle Custom Skill Milestones**
```tsx
// In skill detail modal, show custom milestones if available
{skill.skillMilestones && skill.skillMilestones.length > 0 ? (
  skill.skillMilestones.map((milestone, i) => (
    <div key={i} className="bg-slate-900/30 rounded-lg p-4">
      <p className="text-yellow-200/80">{milestone}</p>
    </div>
  ))
) : (
  // Show default milestone template
  <p className="text-gray-400 italic">No custom milestones defined</p>
)}
```

### Dashboard Updates (`/client/src/pages/dashboard.tsx`)

**Spider Chart - Required Changes:**

1. **Fetch Skills Dynamically**
```tsx
const { data: skills } = useQuery<UserSkill[]>({
  queryKey: ["/api/skills"],
});
```

2. **Build Spider Chart Data from Skills**
```tsx
const skillData = skills?.map(skill => ({
  skill: skill.skillName,
  level: skill.level,
  icon: getSkillIcon(skill.skillIcon),
  color: generateSkillColor(skill.skillName, skill.isCustom)
})) || [];
```

3. **Dynamic Color Generation for Custom Skills**
```typescript
function generateSkillColor(skillName: string, isCustom: boolean): string {
  if (isCustom) {
    // Generate consistent color from skill name hash
    const hash = skillName.split('').reduce((acc, char) => 
      acc + char.charCodeAt(0), 0
    );
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }
  // Return default color for default skills
  return DEFAULT_SKILL_COLORS[skillName] || "#8B5CF6";
}
```

4. **Update Spider Chart Rendering**
```tsx
<ResponsiveContainer width="100%" height={400}>
  <RadarChart data={skillData}>
    <PolarGrid stroke="#475569" />
    <PolarAngleAxis 
      dataKey="skill" 
      tick={{ fill: "#CBD5E1", fontSize: 12 }}
    />
    <PolarRadiusAxis angle={90} domain={[0, 99]} />
    <Radar 
      name="Skills" 
      dataKey="level" 
      stroke="#8B5CF6" 
      fill="#8B5CF6" 
      fillOpacity={0.6} 
    />
  </RadarChart>
</ResponsiveContainer>
```

### Task Categorization UI Updates

#### SkillAdjustmentModal (`/client/src/components/skill-adjustment-modal.tsx`)

**Required Changes:**

1. **Fetch All User Skills**
```tsx
const { data: allSkills } = useQuery<UserSkill[]>({
  queryKey: ["/api/skills"],
});
```

2. **Render Skill Checkboxes Dynamically**
```tsx
{allSkills?.map(skill => {
  const Icon = getSkillIcon(skill.skillIcon);
  return (
    <label key={skill.id} className="flex items-center gap-2 p-2 hover:bg-gray-50">
      <Checkbox
        checked={selectedSkills.includes(skill.skillName)}
        onCheckedChange={(checked) => {
          if (checked) {
            setSelectedSkills([...selectedSkills, skill.skillName]);
          } else {
            setSelectedSkills(selectedSkills.filter(s => s !== skill.skillName));
          }
        }}
      />
      <Icon className="w-4 h-4" />
      <span>{skill.skillName}</span>
      {skill.isCustom && <Badge variant="outline">Custom</Badge>}
    </label>
  );
})}
```

#### TaskCard (`/client/src/components/task-card.tsx`)

**Required Changes:**

1. **Dynamic Skill Badge Rendering**
```tsx
{task.skillTags?.map(skillName => {
  const skill = allSkills?.find(s => s.skillName === skillName);
  const Icon = getSkillIcon(skill?.skillIcon);
  const color = generateSkillColor(skillName, skill?.isCustom || false);
  
  return (
    <span key={skillName} className="skill-badge" style={{ background: color }}>
      <Icon className="w-3 h-3" />
      {skillName}
    </span>
  );
})}
```

---

## User Workflows

### Creating a Custom Skill

1. **Navigate to Skills Page**
2. **Click "Create Custom Skill" Button**
3. **Fill Out Form:**
   - Name: "Photography"
   - Icon: Select camera icon from grid
   - Description: "Taking photos, editing images, composition, lighting, visual storytelling"
   - Starting Level: 1
   - Milestones (optional):
     - "Level 10: First photo exhibition"
     - "Level 25: Professional photographer"
     - "Level 99: Master photographer with published work"
4. **Click "Create Skill"**
5. **Skill Appears:**
   - In skills grid/list view
   - In spider chart on dashboard
   - In AI categorization options

### Using Custom Skills with AI

1. **Create Task:** "Edit wedding photos in Lightroom"
2. **Click "Categorize with AI"**
3. **AI Analysis:**
   - Reads all skills including custom "Photography"
   - Sees description: "Taking photos, editing images, composition, lighting..."
   - Categorizes task as: **Photography, Artist**
4. **Review & Adjust:**
   - Click "Adjust Skills" in toast notification
   - Check/uncheck skills as needed
   - Confirm - this becomes training data
5. **AI Learns:**
   - Next similar task automatically categorized correctly
   - Custom skill knowledge grows over time

### Deleting a Custom Skill

1. **Navigate to Skills Page**
2. **Find Custom Skill Card** (marked with "Custom" badge)
3. **Click Trash Icon**
4. **Confirm Deletion Dialog:**
   - Warning: "This will remove Photography from all tasks"
   - Cannot be undone
5. **Click "Delete Skill"**
6. **Skill Removed From:**
   - Skills list
   - Spider chart
   - All task skill tags
   - AI categorization options

---

## Data Isolation & Privacy

### Per-User Isolation

**Database Level:**
- All queries filter by `user_id`: 
  ```sql
  WHERE user_skills.user_id = $1
  ```
- Foreign key constraint ensures data integrity
- No cross-user data leakage possible

**API Level:**
- All endpoints require authentication (`requireAuth` middleware)
- Use `req.session.userId` for all queries
- Skills created by User A never appear for User B

**AI Categorization:**
- Each user's OpenAI requests include only THEIR skills
- Training examples are per-user (already implemented)
- Custom skill descriptions are private

### What's Isolated

✅ Custom skill names  
✅ Custom skill descriptions  
✅ Custom skill icons  
✅ Custom skill milestones  
✅ Skill levels and XP progress  
✅ Task categorizations using custom skills  
✅ Training data with custom skills  

### What's Shared

❌ Nothing - All data is per-user private

---

## Examples

### Example 1: Musician Creating Custom Skills

**Skills Created:**
1. **Guitar**
   - Icon: Music
   - Description: "Playing guitar, music theory, songwriting, performance"
   - Milestones: 
     - Level 10: "Learn 20 songs"
     - Level 25: "Write original music"
     - Level 99: "Professional musician"

2. **Music Production**
   - Icon: Zap
   - Description: "Audio engineering, mixing, mastering, DAW proficiency"
   - Milestones:
     - Level 10: "Produce first track"
     - Level 99: "Grammy-level production"

**Task Examples:**
- "Practice scales for 30 min" → AI suggests: **Guitar**
- "Mix vocals for new song" → AI suggests: **Music Production, Artist**
- "Write chord progression" → AI suggests: **Guitar, Artist**

### Example 2: Entrepreneur's Custom Skills

**Skills Created:**
1. **Marketing**
   - Icon: Megaphone
   - Description: "Digital marketing, SEO, social media, advertising campaigns"
   
2. **Product Design**
   - Icon: Palette
   - Description: "UX/UI design, user research, prototyping, product strategy"

**Task Examples:**
- "Create Instagram ad campaign" → AI suggests: **Marketing, Merchant**
- "User interview for new feature" → AI suggests: **Product Design, Connector**
- "A/B test landing page" → AI suggests: **Marketing, Scholar**

### Example 3: Parent's Life Skills

**Skills Created:**
1. **Parenting**
   - Icon: Heart
   - Description: "Child development, communication with kids, patience, nurturing"
   
2. **Home Management**
   - Icon: Home
   - Description: "Organizing household, meal planning, cleaning systems, family logistics"

**Task Examples:**
- "Plan week's meals" → AI suggests: **Home Management, Health**
- "Read bedtime stories" → AI suggests: **Parenting, Connector**
- "Teach kid to ride bike" → AI suggests: **Parenting, Physical**

---

## Testing Scenarios

### 1. Create Custom Skill
- ✅ Create skill with all fields
- ✅ Create skill with minimal fields (name + description only)
- ❌ Try creating skill without name (should fail with 400)
- ❌ Try creating duplicate skill name (should fail with 409)
- ✅ Verify skill appears in skills list
- ✅ Verify skill appears in spider chart
- ✅ Verify skill level matches input (or defaults to 1)

### 2. AI Categorization with Custom Skills
- ✅ Create custom "Cooking" skill
- ✅ Create task "Bake chocolate chip cookies"
- ✅ Categorize with AI
- ✅ Verify "Cooking" appears in suggestions
- ✅ Adjust categorization to include "Cooking"
- ✅ Create similar task "Make lasagna"
- ✅ Verify AI learned and auto-suggests "Cooking"

### 3. Delete Custom Skill
- ✅ Create custom skill "Photography"
- ✅ Categorize 3 tasks with "Photography"
- ✅ Delete "Photography" skill
- ✅ Verify skill removed from skills list
- ✅ Verify skill removed from spider chart
- ✅ Verify "Photography" tag removed from all 3 tasks
- ✅ Verify AI no longer suggests "Photography"
- ❌ Try deleting default skill "Craftsman" (should fail with 403)

### 4. Multi-User Isolation
- ✅ User A creates "Coding" skill
- ✅ User B logs in
- ❌ Verify User B does NOT see "Coding" skill
- ✅ User B creates "Coding" skill (should succeed - different user)
- ✅ User A's "Coding" skill level 5
- ✅ User B's "Coding" skill level 1
- ✅ No cross-contamination

### 5. Spider Chart Updates
- ✅ Create custom skill "Dancing" at level 1
- ✅ Verify appears in spider chart at level 1
- ✅ Complete tasks to level up "Dancing" to level 10
- ✅ Verify spider chart updates to show level 10
- ✅ Delete "Dancing" skill
- ✅ Verify removed from spider chart

---

## Migration Guide

### For Existing Users

**No Action Required:**
- Default skills automatically have `isCustom = false`
- Existing skills work exactly as before
- Can start creating custom skills immediately

### Database Migration

Run migration to add new columns:

```sql
ALTER TABLE user_skills 
ADD COLUMN skill_icon TEXT,
ADD COLUMN skill_description TEXT,
ADD COLUMN skill_milestones JSONB,
ADD COLUMN is_custom BOOLEAN DEFAULT false NOT NULL;

-- Set existing skills as non-custom
UPDATE user_skills SET is_custom = false WHERE is_custom IS NULL;
```

---

## Future Enhancements

### Phase 1 (Current Implementation)
✅ Create custom skills  
✅ Delete custom skills  
✅ AI categorization with custom skills  
✅ Spider chart integration  
✅ Icon customization  

### Phase 2 (Potential)
- ⏳ Edit existing custom skills
- ⏳ Reorder skills in UI
- ⏳ Skill categories/tags
- ⏳ Share custom skill templates with community
- ⏳ Import/export skill sets
- ⏳ Skill recommendations based on tasks
- ⏳ Custom XP formulas per skill
- ⏳ Skill dependencies (unlock Guitar Level 25 to create Music Production)

### Phase 3 (Advanced)
- ⏳ Skill analytics (most used, fastest growing)
- ⏳ AI suggests new custom skills based on tasks
- ⏳ Collaborative skills (track team/family skills)
- ⏳ Skill certifications/badges
- ⏳ Integration with external learning platforms

---

## Troubleshooting

### Issue: Custom skill not appearing in AI suggestions

**Diagnosis:**
1. Check skill has description
2. Verify task is relevant to description
3. Check AI categorization logs

**Solution:**
```typescript
// Ensure skill has meaningful description
await apiRequest("POST", "/api/skills/custom", {
  skillName: "Photography",
  skillDescription: "Taking photos, editing images, composition, lighting, visual storytelling, camera settings"
  // ^^ Detailed description helps AI understand
});
```

### Issue: Skill icon not showing

**Diagnosis:**
1. Check `skill.skillIcon` value in database
2. Verify icon name exists in `SKILL_ICON_MAP`

**Solution:**
```typescript
// Always use valid icon name from SKILL_ICON_MAP
const validIcons = Object.keys(SKILL_ICON_MAP);
// "Star", "Heart", "Trophy", etc.
```

### Issue: Cannot delete custom skill

**Diagnosis:**
1. Check `skill.isCustom === true`
2. Verify user owns the skill
3. Check for deletion constraints

**Solution:**
```typescript
// Only custom skills can be deleted
if (!skill.isCustom) {
  throw new Error("Cannot delete default skills");
}
```

---

## API Response Examples

### Success: Get All Skills
```json
{
  "skills": [
    {
      "id": 1,
      "userId": "user_123",
      "skillName": "Craftsman",
      "skillIcon": "Wrench",
      "skillDescription": null,
      "skillMilestones": null,
      "isCustom": false,
      "level": 5,
      "xp": 750,
      "maxXp": 1000,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T12:30:00Z"
    },
    {
      "id": 15,
      "userId": "user_123",
      "skillName": "Photography",
      "skillIcon": "Camera",
      "skillDescription": "Taking photos, editing images, composition, lighting",
      "skillMilestones": [
        "Level 10: First photo exhibition",
        "Level 25: Professional photographer",
        "Level 99: Master photographer with published work"
      ],
      "isCustom": true,
      "level": 3,
      "xp": 200,
      "maxXp": 300,
      "createdAt": "2025-01-10T15:00:00Z",
      "updatedAt": "2025-01-14T09:45:00Z"
    }
  ]
}
```

### Error: Duplicate Skill Name
```json
{
  "error": "A skill with this name already exists"
}
```

### Error: Cannot Delete Default Skill
```json
{
  "error": "Cannot delete default skills"
}
```

---

## Summary

The Custom Skills System provides:
- **Full Personalization** - Create unlimited custom skills
- **AI Integration** - Custom skills work seamlessly with OpenAI categorization
- **Visual Integration** - Custom skills appear in spider chart and all UI
- **Complete Privacy** - All custom skills are user-specific
- **Flexible Design** - Custom icons, descriptions, and milestones
- **Intelligent Learning** - AI learns from manual categorizations

This system transforms ProductivityQuest from a fixed 9-skill system into a fully customizable personal development platform where users can track ANY skill that matters to them.
