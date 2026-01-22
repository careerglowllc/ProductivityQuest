# Skill XP Progression System

## Formula
The skill leveling system uses an RPG-style exponential growth formula:

```
XP_required = base * (1 + rate)^(level - 1)
```

### Constants (Modular - can be adjusted)
- **Base XP**: 100 (XP required to go from level 1 to level 2)
- **Growth Rate**: 0.02 (2% increase per level)
- **Max Level**: 99

### Implementation
Located in `server/storage.ts`:
- `SKILL_BASE_XP = 100`
- `SKILL_GROWTH_RATE = 0.02` ← Adjust this to change difficulty
- `calculateXpForLevel(level)` - Helper function using the formula

## XP Requirements by Level

| Level | XP Required | Cumulative XP | Notes |
|-------|-------------|---------------|-------|
| 1 → 2 | 100 | 100 | Base level |
| 2 → 3 | 102 | 202 | |
| 3 → 4 | 104 | 306 | |
| 4 → 5 | 106 | 412 | |
| 5 → 6 | 108 | 520 | |
| 10 → 11 | 119 | 1,095 | |
| 15 → 16 | 132 | 1,801 | |
| 20 → 21 | 146 | 2,653 | |
| 25 → 26 | 164 | 3,672 | |
| 30 → 31 | 181 | 4,883 | Skill milestone |
| 40 → 41 | 221 | 8,114 | |
| 50 → 51 | 269 | 12,642 | Grandmaster milestone |
| 60 → 61 | 328 | 18,850 | |
| 70 → 71 | 400 | 27,226 | |
| 80 → 81 | 488 | 38,440 | |
| 90 → 91 | 595 | 53,505 | |
| 99 (MAX) | 726 | 74,408 | Legendary milestone |

## Comparison to Old System

### Old System (1.5x multiplier)
- Level 1→2: 100 XP
- Level 5→6: 506 XP
- Level 10→11: 3,834 XP
- Level 20→21: 331,534 XP (exponentially too high!)

### New System (2% growth)
- Level 1→2: 100 XP
- Level 5→6: 108 XP
- Level 10→11: 119 XP
- Level 20→21: 146 XP (much more balanced!)

## Benefits of New System

1. **More Predictable**: Smooth, consistent growth rather than explosive
2. **Long-term Playability**: Takes ~74k total XP to reach max level vs impossible scaling
3. **Better Pacing**: Each level feels achievable but still requires effort
4. **Flexible**: Can adjust `SKILL_GROWTH_RATE` to tune difficulty
   - 1% rate = slower progression
   - 3% rate = faster progression
   - 5% rate = aggressive progression

## Adjusting Difficulty

To change the progression difficulty, modify in `server/storage.ts`:

```typescript
private readonly SKILL_GROWTH_RATE = 0.02; // Change this value
```

**Example rates:**
- `0.01` (1%) - Very gradual, ~57k total XP to max
- `0.02` (2%) - Balanced, ~74k total XP to max (current)
- `0.03` (3%) - Moderate, ~95k total XP to max
- `0.05` (5%) - Steep, ~131k total XP to max

## Task XP Values
With the current system, typical task completions should award:
- **Quick tasks**: 5-10 XP
- **Medium tasks**: 15-25 XP
- **Long tasks**: 30-50 XP
- **Major tasks**: 75-100+ XP

This means players will complete roughly:
- 10-20 tasks per early level (1-10)
- 15-30 tasks per mid level (11-50)
- 25-50 tasks per late level (51-99)

Perfect for a gamified productivity app!
