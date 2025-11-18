# Dashboard Active Questlines Redesign

## Summary
Redesigned the campaign section on the dashboard to display active questlines in a collapsible format with an empty state when no campaigns are selected.

## Changes Made

### 1. **Imports Updated**
Added `Plus` icon to the existing lucide-react imports for the empty state CTA button.

### 2. **State Management** (Already Added Previously)
```typescript
const [expandedCampaigns, setExpandedCampaigns] = useState<{ [key: string]: boolean }>({});
```

### 3. **Mock Data Structure** (Already Added Previously)
```typescript
const selectedCampaigns = [
  {
    id: 'maximize-looks',
    title: 'Maximize Looks',
    description: 'A comprehensive transformation journey...',
    progress: 35,
    quests: [
      { id: 1, title: 'Foundation Assessment Complete', status: 'completed' },
      { id: 2, title: 'Skincare Routine Established', status: 'completed' },
      { id: 3, title: 'Fitness Fundamentals', status: 'in-progress' },
      { id: 4, title: 'Wardrobe Optimization', status: 'locked' },
      { id: 5, title: 'Confidence & Presence', status: 'locked' },
    ],
  },
  {
    id: 'remote-business',
    title: 'Build a Self-Sufficient Remote Business',
    description: 'Launch and scale a profitable online business...',
    progress: 60,
    quests: [
      { id: 1, title: 'Market Research & Niche Selection', status: 'completed' },
      { id: 2, title: 'MVP Development & Launch', status: 'completed' },
      { id: 3, title: 'First 10 Paying Customers', status: 'completed' },
      { id: 4, title: 'Scale to $10K MRR', status: 'in-progress' },
      { id: 5, title: 'Automation & Systems', status: 'locked' },
      { id: 6, title: 'Full Location Independence', status: 'locked' },
    ],
  },
];
```

### 4. **Toggle Function** (Already Added Previously)
```typescript
const toggleCampaign = (campaignId: string) => {
  setExpandedCampaigns(prev => ({
    ...prev,
    [campaignId]: !prev[campaignId]
  }));
};
```

### 5. **Campaign Section Redesign**
Completely replaced the hardcoded "Main Campaign" section with:

#### Empty State (when `selectedCampaigns.length === 0`)
- Target icon (12x12) with low opacity
- Heading: "No Active Questlines"
- Description text explaining the feature
- CTA button with Plus icon linking to `/campaigns`

#### Active Questlines (when campaigns selected)
Each campaign card shows:

**Collapsed View:**
- Campaign title + progress percentage
- Progress bar with purple gradient
- One-line description (truncated)
- Chevron down icon

**Expanded View (on click):**
- Full description
- List of quest milestones with status indicators:
  - ✓ Green checkmark for completed quests
  - ⚠ Spinning yellow indicator for in-progress quests
  - 🔒 Grey locked icon for locked quests
- Each quest shows: "Quest {id}: {title}"

### 6. **Visual Design**
- Compact spacing (p-3, smaller text sizes) to match dashboard density
- Purple gradient theme consistent with existing campaign styling
- Hover effects on cards and buttons
- Smooth transitions for expand/collapse
- Background blur and border glow effects

## Features

### User Interactions
1. **Click anywhere on campaign card** → Toggles expand/collapse
2. **Click chevron icon** → Also toggles (with stopPropagation)
3. **Click "Manage" button** → Navigate to `/campaigns` page
4. **Empty state CTA** → Navigate to `/campaigns` to select questlines

### Quest Status Indicators
- **Completed** → Green CheckCircle icon + green text
- **In Progress** → Animated spinning yellow border + yellow text (bold)
- **Locked** → Grey circle with dot + grey text (muted)

### Responsive Design
- Text sizes scaled down for compact dashboard layout:
  - Title: text-xs
  - Progress: text-[10px]
  - Description: text-[9px] (collapsed), text-[10px] (expanded)
  - Quest items: text-[10px]

## Technical Details

### Component Structure
```
Card (Active Questlines)
├── Header (Title + Manage button)
└── Content
    ├── Empty State (conditional)
    │   ├── Icon
    │   ├── Title
    │   ├── Description
    │   └── CTA Button
    └── Campaign List (conditional)
        └── Campaign Card (map)
            ├── Collapsed Header
            │   ├── Title + Progress %
            │   ├── Progress Bar
            │   ├── Description (truncated)
            │   └── Chevron Icon
            └── Expanded Content (conditional)
                ├── Full Description
                └── Quest List
                    └── Quest Item (map)
                        ├── Status Icon
                        └── Quest Title
```

### State Flow
1. User clicks campaign card → `toggleCampaign(campaignId)` called
2. `setExpandedCampaigns` updates state for that campaign ID
3. Component re-renders showing/hiding expanded content
4. Multiple campaigns can be expanded simultaneously

## Next Steps (API Integration)

### Replace Mock Data
Currently using hardcoded `selectedCampaigns` array. Replace with:

```typescript
const { data: selectedCampaigns = [] } = useQuery({
  queryKey: ["/api/campaigns/selected"],
});
```

### Expected API Response
```json
{
  "campaigns": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "progress": number,
      "quests": [
        {
          "id": number,
          "title": "string",
          "status": "completed" | "in-progress" | "locked"
        }
      ]
    }
  ]
}
```

### Backend Requirements
1. Add endpoint: `GET /api/campaigns/selected`
2. Query user's selected campaigns (max 2)
3. Calculate progress percentage based on completed quests
4. Determine quest status (completed/in-progress/locked)
5. Return formatted data matching the structure above

## Testing Checklist

- [ ] Empty state displays when no campaigns selected
- [ ] "Select Questlines" button navigates to `/campaigns`
- [ ] Campaign cards display with correct titles and progress
- [ ] Clicking card toggles expand/collapse
- [ ] Clicking chevron icon toggles expand/collapse
- [ ] Progress bars show correct percentage
- [ ] Quest status icons match quest state (completed/in-progress/locked)
- [ ] Quest text colors match status
- [ ] Multiple campaigns can be expanded at once
- [ ] "Manage" button navigates to `/campaigns`
- [ ] Animations smooth (expand/collapse, hover effects)
- [ ] Responsive on mobile (if applicable)

## Files Modified
- `/client/src/pages/dashboard.tsx`
  - Added `Plus` import
  - Replaced campaign section (lines ~587-625)
  - Used existing `expandedCampaigns` state
  - Used existing `selectedCampaigns` mock data
  - Used existing `toggleCampaign` function

## Visual Reference
The new design shows:
- **Empty state**: Clean, centered message with icon and CTA
- **Collapsed campaigns**: Compact cards with title, progress bar, and chevron
- **Expanded campaigns**: Shows full quest list with status indicators matching the questlines page design
