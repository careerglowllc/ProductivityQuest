# ProductivityQuest 🎮⚔️ — Comprehensive Technical Reference

> **Purpose of this document:** This file is the single source of truth for any AI coding agent or developer working on ProductivityQuest. It describes every feature, API endpoint, component, data model, interaction pattern, and provides comprehensive test cases. Read this first before making any changes.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Task Management System](#6-task-management-system)
7. [Gold & XP Calculation System](#7-gold--xp-calculation-system)
8. [Skills System](#8-skills-system)
9. [AI Categorization System](#9-ai-categorization-system)
10. [Calendar System](#10-calendar-system)
11. [Google Calendar Integration](#11-google-calendar-integration)
12. [Notion Integration](#12-notion-integration)
13. [Item Shop & Purchases](#13-item-shop--purchases)
14. [Campaigns System](#14-campaigns-system)
15. [Finance Tracking](#15-finance-tracking)
16. [ML Task Sorting](#16-ml-task-sorting)
17. [Recycling Bin](#17-recycling-bin)
18. [Dashboard](#18-dashboard)
19. [Navigation & Layout](#19-navigation--layout)
20. [Mobile-Specific Behaviors](#20-mobile-specific-behaviors)
21. [Frontend Components Reference](#21-frontend-components-reference)
22. [Complete API Reference](#22-complete-api-reference)
23. [Environment Variables](#23-environment-variables)
24. [Comprehensive Test Cases](#24-comprehensive-test-cases)
25. [Important Gotchas for AI Agents](#25-important-gotchas-for-ai-agents)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      Client (React + Vite)                      │
│  Pages: Dashboard, Tasks, Calendar, Skills, Shop, Campaigns,   │
│         Finances, Profile, Settings, Recycling Bin              │
│  State: TanStack Query (server cache) + useState (local)       │
│  Routing: Wouter (lightweight)                                  │
│  Styling: Tailwind CSS + shadcn/ui + Radix UI primitives       │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP/REST API (JSON)
┌──────────────────────────┴─────────────────────────────────────┐
│                    Express.js Server                            │
│  Auth: express-session + bcryptjs (email/password)             │
│  Routes: server/routes.ts (~4600 lines, 90+ endpoints)         │
│  Storage: server/storage.ts (Drizzle ORM abstraction)          │
│  Services: OpenAI, Google Calendar, Notion, ML Sorting         │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│               PostgreSQL (Neon Serverless)                       │
│  Tables: users, tasks, user_skills, user_progress, shop_items, │
│          purchases, campaigns, financial_items, sessions,       │
│          calendar_events, skill_categorization_training,        │
│          ml_sorting_feedback, ml_sorting_preferences,           │
│          password_reset_tokens                                   │
└────────────────────────────────────────────────────────────────┘
```

### Request Flow (Example: Complete a Task)

1. User clicks "Complete" → React calls `PATCH /api/tasks/:id/complete`
2. Express `requireAuth` middleware checks `req.session.userId`
3. Route handler in `routes.ts` calls `storage.completeTask(id, userId)`
4. Storage layer: marks task completed, awards gold via `addGold()`, awards XP via `addSkillXp()` for each skill tag
5. If recurring task → creates next occurrence instead of marking completed
6. If Google Calendar instant sync enabled → deletes/updates GCal event
7. Returns `{ task, goldEarned, skillXPGains }` to client
8. TanStack Query invalidates `["/api/tasks"]`, `["/api/stats"]`, `["/api/skills"]`, `["/api/progress"]`
9. UI updates: completion animation, gold toast, level-up modal if applicable

---

## 2. Tech Stack

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.6.3 | Type safety |
| Vite | 5.4.19 | Build tool & dev server |
| Wouter | 3.3.5 | Client-side routing |
| TanStack Query | 5.60.5 | Server state management |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui + Radix | Various | Component primitives |
| Lucide React | 0.453.0 | Icons |
| Framer Motion | 11.13.1 | Animations |
| Recharts | 2.15.2 | Charts (spider, pie) |
| date-fns | 3.6.0 | Date utilities |
| react-resizable-panels | 2.1.7 | Dashboard grid resize |
| Capacitor | 7.x | iOS native wrapper |

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| Express | 4.21.2 | HTTP server |
| Drizzle ORM | 0.39.1 | Database ORM |
| @neondatabase/serverless | 0.10.4 | PostgreSQL driver |
| OpenAI | 6.9.0 | AI categorization |
| googleapis | 153.0.0 | Google Calendar API |
| @notionhq/client | 4.0.1 | Notion API |
| bcryptjs | 3.0.3 | Password hashing |
| express-session | 1.18.1 | Session management |
| connect-pg-simple | 10.0.0 | Session store in Postgres |
| resend | 6.6.0 | Password reset emails |
| nanoid | 5.1.5 | Token generation |

---

## 3. Project Structure

```
ProductivityQuest/
├── client/src/
│   ├── App.tsx                          # Router + auth gate
│   ├── main.tsx                         # Entry point + Capacitor init
│   ├── index.css                        # Global styles + safe-area classes
│   ├── pages/
│   │   ├── dashboard.tsx                # Main dashboard with 4 widgets
│   │   ├── home.tsx                     # Tasks/Quests page (primary task management)
│   │   ├── calendar.tsx                 # Calendar page (Day/3-Day/Week/Month views)
│   │   ├── skills.tsx                   # Skills page (list + spider chart + constellation)
│   │   ├── shop.tsx                     # Item shop + inventory
│   │   ├── campaigns.tsx                # Campaign/questline management
│   │   ├── finances.tsx                 # Income/expense tracking
│   │   ├── profile.tsx                  # User profile
│   │   ├── settings.tsx                 # Settings hub
│   │   ├── settings-timezone.tsx        # Timezone configuration
│   │   ├── settings-calendar.tsx        # Calendar settings
│   │   ├── settings-finances.tsx        # Finance settings
│   │   ├── settings-guides.tsx          # Help guides hub
│   │   ├── settings-guides-*.tsx        # Individual guide pages
│   │   ├── google-calendar-integration.tsx # Google Calendar OAuth setup
│   │   ├── google-calendar.tsx          # Google Calendar settings
│   │   ├── notion-integration.tsx       # Notion setup page
│   │   ├── recycling-bin.tsx            # Deleted/completed task recovery
│   │   ├── landing.tsx                  # Unauthenticated landing page
│   │   ├── login.tsx / register.tsx     # Auth pages
│   │   ├── forgot-password.tsx          # Password reset request
│   │   ├── reset-password.tsx           # Password reset form
│   │   ├── getting-started.tsx          # Onboarding guide
│   │   └── not-found.tsx               # 404 page
│   ├── components/
│   │   ├── tab-bar.tsx                  # Bottom nav (mobile) / top nav (desktop)
│   │   ├── task-card.tsx                # Task card (list + compact grid views)
│   │   ├── task-detail-modal.tsx        # Full task detail/edit modal
│   │   ├── add-task-modal.tsx           # New task creation modal
│   │   ├── add-campaign-modal.tsx       # Campaign creation
│   │   ├── add-skill-modal.tsx          # Custom skill creation
│   │   ├── edit-milestones-modal.tsx    # Milestone editor for skills
│   │   ├── edit-skill-icon-modal.tsx    # Skill icon customizer
│   │   ├── calendar-sync-modal.tsx      # Calendar sync confirmation
│   │   ├── skill-adjustment-modal.tsx   # Adjust skill tags on tasks
│   │   ├── categorization-feedback-modal.tsx # AI categorization feedback
│   │   ├── ml-sort-feedback-modal.tsx   # ML sort approval/correction
│   │   ├── why-skills-modal.tsx         # Skills explanation modal
│   │   ├── completion-animation.tsx     # Gold/XP reward animation
│   │   ├── level-up-modal.tsx           # Level-up celebration
│   │   ├── item-shop-modal.tsx          # Shop purchase interface
│   │   ├── emoji-picker.tsx             # Emoji selector for tasks
│   │   └── ui/                          # shadcn/ui base components
│   ├── hooks/
│   │   ├── use-mobile.ts               # useIsMobile() — detects <768px
│   │   ├── use-toast.ts                # Toast notification hook
│   │   └── useAuth.ts                  # Authentication state hook
│   └── lib/
│       ├── utils.ts                     # cn() and general utilities
│       ├── queryClient.ts              # TanStack Query configuration
│       ├── skillIcons.ts               # Skill icon mapping
│       └── goldCalculation.ts          # Client-side gold formula (mirrors server)
├── server/
│   ├── index.ts                         # Server entry (Express + Vite middleware)
│   ├── routes.ts                        # All API routes (~4600 lines)
│   ├── storage.ts                       # Database abstraction layer
│   ├── db.ts                            # Drizzle + Neon connection
│   ├── auth.ts                          # requireAuth middleware + helpers
│   ├── goldCalculation.ts              # Gold formula: Base × TimeWeight × (1 + PriorityBonus)
│   ├── xpCalculation.ts               # XP formula: Base × TimeWeight × (1 + PriorityBonus)
│   ├── openai-service.ts              # AI skill categorization via OpenAI
│   ├── google-calendar.ts             # Google Calendar API wrapper
│   ├── ml-sorting.ts                  # ML-based task scheduling
│   ├── ai-sort-service.ts             # AI sorting integration
│   ├── notion.ts                       # Notion API wrapper
│   ├── seed-shop.ts                    # Default shop item seeding
│   ├── migrations.ts                   # Database migration helpers
│   └── vite.ts                         # Vite dev middleware for Express
├── shared/
│   ├── schema.ts                        # Drizzle table definitions + Zod schemas
│   └── notionUtils.ts                  # Notion URL/ID parsing
├── drizzle.config.ts                    # Drizzle Kit configuration
├── capacitor.config.ts                  # Capacitor (iOS) config
├── vite.config.ts                       # Vite build config
└── package.json                         # Scripts: dev, build, migrate, cap:*
```

---

## 4. Database Schema

All tables are defined in `shared/schema.ts` using Drizzle ORM.

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (PK) | UUID-style user identifier |
| username | varchar (unique) | Display name |
| email | varchar (unique) | Login email |
| passwordHash | varchar | bcrypt-hashed password |
| firstName, lastName | varchar | Profile fields |
| profileImageUrl | varchar | Avatar URL |
| notionApiKey | text | Notion integration token |
| notionDatabaseId | text | Notion database ID |
| googleCalendarClientId | text | User-provided OAuth Client ID |
| googleCalendarClientSecret | text | User-provided OAuth Client Secret |
| googleCalendarAccessToken | text | OAuth access token |
| googleCalendarRefreshToken | text | OAuth refresh token |
| googleCalendarTokenExpiry | timestamptz | Token expiration |
| googleCalendarEnabled | boolean | Sync enabled flag |
| googleCalendarSyncDirection | text | "import"/"export"/"both" |
| googleCalendarInstantSync | boolean | Instant sync on task changes |
| googleCalendarSelectedCalendars | jsonb | Array of calendar IDs to sync |
| timezone | text | User timezone (default: "America/New_York") |
| createdAt, updatedAt | timestamp | Timestamps |

### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| userId | varchar (FK→users) | Owner |
| notionId | text | Linked Notion page ID (nullable) |
| googleEventId | text | Linked Google Calendar event ID (nullable) |
| title | text | Task name |
| description | text | Short description |
| details | text | Extended details / notes |
| duration | integer | Estimated minutes |
| goldValue | integer | Calculated gold reward |
| dueDate | timestamptz | When task is due |
| scheduledTime | timestamptz | Calendar time slot (null = unscheduled) |
| completed | boolean | Done flag |
| completedAt | timestamptz | When completed |
| importance | text | "Pareto"/"High"/"Med-High"/"Medium"/"Med-Low"/"Low" |
| kanbanStage | text | "Not Started"/"In Progress"/"Incubate"/"Review"/"Done" |
| recurType | text | Recurrence pattern (see section 6) |
| businessWorkFilter | text | "Apple"/"General"/"MW" |
| campaign | text | "unassigned"/"Main"/"Side" |
| apple | boolean | Apple-specific task flag |
| smartPrep | boolean | SmartPrep task flag |
| delegationTask | boolean | Delegation task flag |
| velin | boolean | Velin task flag |
| recycled | boolean | Soft-delete flag |
| recycledAt | timestamptz | When recycled |
| recycledReason | text | "completed" or "deleted" |
| skillTags | jsonb (string[]) | AI-assigned skill names |
| calendarColor | text | Hex color for calendar display |
| emoji | text | User-chosen emoji (default "📝") |
| createdAt | timestamptz | Creation timestamp |

### `user_skills`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| skillName | varchar | e.g. "Craftsman", "Health", or custom |
| skillIcon | text | Custom icon/emoji |
| skillDescription | text | What this skill represents |
| skillMilestones | jsonb (string[]) | Custom milestone titles |
| constellationMilestones | jsonb | `[{ id, title, level, x, y }]` — node positions for constellation view |
| completedMilestones | jsonb (string[]) | Array of completed milestone IDs |
| isCustom | boolean | true = user-created |
| level | integer | Current level (starts at 1) |
| xp | integer | Current XP toward next level |
| maxXp | integer | XP needed to reach next level |

### `user_progress`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| goldTotal | integer | Current gold balance |
| tasksCompleted | integer | Lifetime completed count |
| goldSpent | integer | Lifetime gold spent |

### `shop_items`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK, nullable) | null = global default item |
| name | text | Item name |
| description | text | Item description |
| cost | integer | Gold price |
| icon | text | Emoji icon |
| category | text | "general" default |
| isGlobal | boolean | true = available to all users |

### `purchases`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| shopItemId | integer (FK) | |
| cost | integer | Gold spent |
| purchasedAt | timestamptz | When purchased |
| used | boolean | Whether item has been used |
| usedAt | timestamptz | When used |

### `campaigns`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| title | text | Campaign name |
| description | text | Campaign description |
| icon | text | Lucide icon name |
| quests | jsonb | `[{ id, title, status }]` |
| rewards | jsonb | `["reward string", ...]` |
| progress | integer | 0-100 percentage |
| isActive | boolean | Currently pursuing |

### `financial_items`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| item | text | Item name |
| category | text | Category label |
| monthlyCost | integer | Monthly cost in cents |
| recurType | text | "monthly"/"yearly"/"biweekly"/"2x a year" |

### `calendar_events`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| title | text | Event title |
| description | text | Event description |
| date | timestamptz | Event date |
| startTime | text | Start time string |
| duration | integer | Duration in minutes |
| color | text | Hex color |

### `skill_categorization_training`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| taskTitle | text | Task title that was categorized |
| taskDetails | text | Task details |
| correctSkills | jsonb | Skills the user approved/corrected to |
| aiSuggestedSkills | jsonb | Skills the AI originally suggested |
| isApproved | boolean | true = user approved AI suggestion |

### `ml_sorting_feedback`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| date | text | Date string for the sort |
| originalSchedule | jsonb | Tasks before sorting |
| mlSortedSchedule | jsonb | ML-proposed schedule |
| userCorrectedSchedule | jsonb | User's corrections (nullable) |
| feedbackType | text | "approved"/"corrected"/"rejected" |
| feedbackReason | text | User's reason |
| taskMetadata | jsonb | Additional task context |

### `ml_sorting_preferences`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK, unique) | |
| preferredStartHour | integer | Learned preferred start |
| preferredEndHour | integer | Learned preferred end |
| priorityWeights | jsonb | Priority scoring weights |
| breakDuration | integer | Preferred break minutes |
| highPriorityTimePreference | text | When to schedule high-priority |
| totalApproved | integer | Lifetime approvals |
| totalCorrected | integer | Lifetime corrections |

### `sessions`
Express session storage in Postgres (connect-pg-simple). Fields: sid (PK), sess (jsonb), expire (timestamptz).

### `password_reset_tokens`
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | |
| userId | varchar (FK) | |
| token | varchar | Unique reset token |
| expiresAt | timestamptz | Token expiry |
| used | boolean | Whether already used |

---

## 5. Authentication System

### Overview
- **Method:** Email/password with bcryptjs hashing
- **Session:** express-session stored in PostgreSQL via connect-pg-simple
- **Middleware:** `requireAuth` in `server/auth.ts` — checks `req.session.userId`
- **Client hook:** `useAuth()` in `client/src/hooks/useAuth.ts` — calls `GET /api/auth/user`

### Flows

**Registration:** `POST /api/auth/register` → validates with Zod schema → hashes password → creates user + default skills (9 defaults) + user progress → sets session

**Login:** `POST /api/auth/login` → finds user by username OR email → verifies bcrypt hash → sets `req.session.userId`

**Logout:** `POST /api/auth/logout` → destroys session

**Password Reset:**
1. `POST /api/auth/forgot-password` → generates nanoid token → stores in `password_reset_tokens` → sends email via Resend
2. `GET /api/auth/validate-reset-token` → checks token exists, not expired, not used
3. `POST /api/auth/reset-password` → validates token → hashes new password → marks token used

### Client Routing
- Unauthenticated: only `/login`, `/register`, `/forgot-password`, `/reset-password`, `/` (landing) accessible
- Authenticated: redirects `/` → `/dashboard`, shows TabBar navigation
- Protected routes use `requireAuth` middleware on all `/api/*` endpoints (except auth endpoints)

---

## 6. Task Management System

### Core Concepts
- Tasks are "Quests" in the gamified UI
- Each task has: title, description, details, duration, importance, due date, skill tags, emoji, gold value
- Gold value is auto-calculated from duration + importance (see section 7)
- Skill tags are auto-assigned by AI when task is created (see section 9)

### Task Lifecycle
```
Created → [Active] → Completed (gold + XP awarded, moved to recycling bin)
                   → Deleted (moved to recycling bin, no rewards)
                   → Recycled → Restored (back to active) or Permanently Deleted
```

### Recurring Tasks
When a recurring task is completed, instead of being marked done, it:
1. Awards gold and XP normally
2. Calculates the next due date based on `recurType`
3. Updates `dueDate` and resets `completed` to false
4. Resets `scheduledTime` to null (removed from calendar)

**Supported recurrence patterns:**
| recurType | Behavior |
|-----------|----------|
| `one-time` | Normal completion |
| `daily` | Next day |
| `every other day` | +2 days |
| `2x week` | +3-4 days |
| `3x week` | +2-3 days |
| `weekly` | +7 days |
| `2x month` | +14 days |
| `monthly` | +1 month |
| `every 2 months` | +2 months |
| `quarterly` | +3 months |
| `every 6 months` | +6 months |
| `yearly` | +1 year |

### Batch Operations
- **Complete Selected:** `POST /api/tasks/complete-batch` — completes multiple tasks, awards gold/XP for each
- **Delete Selected:** `POST /api/tasks/delete-batch` — soft-deletes to recycling bin (no rewards)
- **Undo Complete:** `POST /api/tasks/undo-complete` — reverses completion, deducts gold/XP
- **Move Overdue to Today:** `POST /api/tasks/move-overdue-to-today` — updates due dates of overdue tasks to today (uses user timezone)
- **Reschedule Selected:** `PATCH /api/tasks/:id` with `{ dueDate }` — changes due date
- **Push Days:** `PATCH /api/tasks/:id` with new calculated dueDate — pushes 1/3/5/7/14/30 days

### Task Views (home.tsx)
- **List View:** Full task cards with all metadata, description, skill tags, buttons
- **Grid View:** 6-column compact cards (6 desktop, 3 tablet, 1 mobile) with truncated info

### Task Card Interactions (task-card.tsx)
- **Single tap/click:** Selects/deselects the task (350ms delay to detect double)
- **Double tap/click:** Opens the full TaskDetailModal
- **"View Full" button:** Also opens TaskDetailModal
- **Emoji click:** Opens EmojiPicker (stopPropagation to avoid selection)
- **Skill badge click:** Opens SkillAdjustmentModal

### Selection Bar (mobile)
When tasks are selected, a fixed bottom bar appears above the tab bar with a 4-column grid of action buttons:
- Row 1: Complete, Sync, Unsync, Clear Cal
- Row 2: Delete, Notion, Del Notion, Skill
- Row 3: Recat, Resched, Push

All 11 buttons use `h-8` tap targets in `grid grid-cols-4 gap-1` layout.

### Filters Available
- **Sort:** AI Smart Sort, Due Date, Created Date, Gold Value, Duration, Importance, Title
- **Search:** Real-time text search on title
- **Show Completed:** Toggle to show/hide completed tasks
- **Business Filter:** All, Apple, General, MW
- **Quick Filters:** Quick Tasks (<30min), Routines (recurring), Overdue

### CSV Export
`GET /api/tasks/export/csv` — downloads all tasks as CSV with columns: Title, Description, Details, Duration, Gold, Due Date, Importance, Kanban, Recurrence, Business Filter, Campaign, Skills, Completed, Completed At, Created At.

---

## 7. Gold & XP Calculation System

### Gold Formula (server/goldCalculation.ts)
```
Gold = GOLD_BASE × (duration / TIME_DIVISOR) × (1 + PriorityBonus)
```

| Parameter | Value |
|-----------|-------|
| GOLD_BASE | 20 |
| TIME_DIVISOR | 20 |

| Importance | PriorityBonus |
|------------|---------------|
| Low | 0% |
| Med-Low | 3% |
| Medium | 5% |
| Med-High | 7% |
| High | 10% |
| Pareto | 15% |

**Examples:**
- 60min High → `20 × (60/20) × 1.10 = 66 gold`
- 30min Medium → `20 × (30/20) × 1.05 = 31.5 → 32 gold` (rounded)
- 120min Pareto → `20 × (120/20) × 1.15 = 138 gold`

Gold is auto-calculated both server-side (`server/goldCalculation.ts`) and client-side (`client/src/lib/goldCalculation.ts`) when creating/editing tasks. The gold value is stored on the task record.

### XP Formula (server/xpCalculation.ts)
```
XP = XP_BASE × (duration / XP_TIME_DIVISOR) × (1 + PriorityBonus)
XP per skill = Total XP / number of skill tags
```

| Parameter | Value |
|-----------|-------|
| XP_BASE | 15 |
| XP_TIME_DIVISOR | 15 |

| Importance | PriorityBonus |
|------------|---------------|
| Low | 0% |
| Med-Low | 5% |
| Medium | 10% |
| Med-High | 15% |
| High | 20% |
| Pareto | 30% |

**Examples:**
- 60min High, 2 skills → Total XP = `15 × 4 × 1.20 = 72`, per skill = `36 XP`
- 30min Medium, 1 skill → Total XP = `15 × 2 × 1.10 = 33`, per skill = `33 XP`
- 45min Pareto, 3 skills → Total XP = `15 × 3 × 1.30 = 58.5 → 59`, per skill = `~20 XP`

### Leveling System
- Level 1 starts at 0 XP, needs `maxXp` (default 100) to level up
- On level-up: `xp` resets to overflow amount, `level` increments, `maxXp` increases by 15%
- Level-up triggers `LevelUpModal` celebration animation on client
- Level progression example: L1 needs 100XP, L2 needs 115XP, L3 needs 132XP, L4 needs 152XP...

---

## 8. Skills System

### Default Skills (9)
Created automatically on user registration:
1. **Craftsman** — Building, DIY, hands-on creation
2. **Artist** — Creative expression, arts, design
3. **Mindset** — Mental wellness, resilience, mindfulness
4. **Merchant** — Business, entrepreneurship, finance
5. **Physical** — Martial arts, fitness, combat
6. **Scholar** — Learning, research, education
7. **Health** — Nutrition, sleep, longevity
8. **Connector** — Networking, relationships
9. **Charisma** — Communication, leadership, persuasion

### Custom Skills
Users can create unlimited additional skills via `POST /api/skills/custom`. Custom skills:
- Participate in AI categorization equally with defaults
- Have the same level/XP/milestone system
- Can be deleted (defaults cannot)
- Are included in spider/radar chart and constellation view

### Skill Views (skills.tsx)
1. **List View:** Skill cards with level, XP progress bar, description, edit controls
2. **Spider/Radar Chart:** Recharts radar visualization of all skill levels
3. **Constellation View:** Interactive star-map where skills are center nodes and milestones are branching paths. Users can drag nodes to reposition. Milestone nodes can be toggled completed.

### Constellation Milestones
Each skill can have a `constellationMilestones` array: `[{ id, title, level, x, y }]`. These define:
- Position on the constellation canvas (x, y as percentages)
- Level requirement for the milestone
- Completion state (tracked in `completedMilestones` array)

Users can add, edit, reposition, and toggle milestones via the EditMilestonesModal.

### Skill API
- **Edit icon:** `PATCH /api/skills/:skillId/icon` — change emoji/icon
- **Edit level/XP:** `PATCH /api/skills/id/:skillId` — directly set level, xp, maxXp
- **Edit description:** `PATCH /api/skills/:skillName` — update description
- **Edit milestones:** `PATCH /api/skills/:skillId/milestones` — update constellation nodes
- **Toggle milestone:** `PATCH /api/skills/:skillId/milestones/:milestoneId/toggle`
- **Delete custom skill:** `DELETE /api/skills/:skillId`
- **Restore defaults:** `POST /api/skills/restore-defaults` — re-creates any missing default skills

---

## 9. AI Categorization System

### How It Works
1. When a task is created (`POST /api/tasks`), after saving to DB, the server fires a background AI categorization call
2. `openai-service.ts` sends the task title + details to OpenAI GPT-4o-mini
3. The prompt includes: all user's skill names + descriptions, plus up to 10 training examples from past feedback
4. AI returns 1-3 skill tags from the user's available skills
5. Tags are saved to `task.skillTags` via a PATCH update

### Training/Feedback Loop
- When AI categorizes a task, user can approve or correct the suggestions
- Corrections are stored in `skill_categorization_training` table
- Future categorizations include these corrections as few-shot examples in the prompt
- `POST /api/tasks/categorize-feedback` — save user's correction
- `GET /api/tasks/training-examples` — fetch training data for prompt

### Batch Operations
- `POST /api/tasks/categorize` — categorize a single task
- `POST /api/tasks/categorize-all` — categorize all uncategorized tasks (with rate limiting)

### Recategorize Feature
From the Tasks page selection bar, "Recat" button opens SkillAdjustmentModal for each selected task sequentially. User can manually adjust skill tags which are saved and also stored as training examples.

### Default Skill Descriptions for AI
The AI prompt describes each default skill to guide categorization:
- Craftsman: "Building things, DIY projects, woodworking, hands-on creation and construction"
- Artist: "Creative work, artistic expression, painting, photography, music, design, crafts"
- Mindset: "Mental wellness, resilience, mindfulness, meditation, personal growth, journaling"
- Merchant: "Business, entrepreneurship, financial planning, investing, marketing, sales"
- Physical: "Martial arts, boxing, fitness, athletic training, combat sports, physical endurance"
- Scholar: "Learning, studying, research, reading, education, academic pursuits"
- Health: "Nutrition, diet, sleep optimization, longevity, medical care, wellness"
- Connector: "Networking, building relationships, community, mentorship, collaboration"
- Charisma: "Communication skills, public speaking, leadership, persuasion, negotiation"

Custom skills use their user-provided `skillDescription` in the AI prompt.

---

## 10. Calendar System

### Overview
The Calendar page (`calendar.tsx`, ~3400 lines) displays tasks and events in an interactive calendar with 4 view modes. Events come from 3 sources:

1. **ProductivityQuest tasks** — tasks with `scheduledTime` set
2. **Google Calendar events** — imported via Google Calendar API
3. **Standalone events** — calendar-only events not linked to any task

### View Modes
| Mode | Description |
|------|-------------|
| Day | Single day, hourly time grid (6am–midnight) |
| 3-Day | Three-day spread with hourly grid |
| Week | 7-day view with hourly grid |
| Month | Traditional month grid with event dots/blocks |

View selection persists to `localStorage` key `calendar-view-mode`.

### Drag & Drop
- **Move events:** Drag events to different time slots or days
- **Resize events:** Drag the bottom handle to change duration
- Touch drag supported on mobile with `touch-none` class during drag
- On drop: `PATCH /api/tasks/:id` to update `scheduledTime` and `duration`
- If Google Calendar instant sync enabled → also updates the Google Calendar event

### Standalone Events
- **Create:** Double-click/double-tap an empty time slot → opens New Event modal
- **Edit:** Click event → event detail popover with edit/delete options
- **API:** `POST /api/standalone-events`, `PATCH /api/standalone-events/:id`, `DELETE /api/standalone-events/:id`

### Event Sources & Display
Calendar events are fetched via `GET /api/google-calendar/events?year=X&month=Y` which merges:
- Tasks with `scheduledTime` (source: `productivityquest`)
- Google Calendar events if sync enabled (source: `google`)
- Standalone calendar events (source: `standalone`)

Events are color-coded: tasks use `task.calendarColor` or a default, Google events use their GCal color, standalone events use user-selected color.

### Timezone Handling
- **CRITICAL:** `scheduledTime` and `dueDate` are stored as UTC in the database
- When syncing tasks to calendar, if `scheduledTime` is midnight UTC (00:00:00Z), it's corrected to 17:00 UTC (9 AM PST) to avoid wrong-day display
- Frontend uses `getUTCMonth()`, `getUTCDate()`, `getUTCFullYear()` in `task-card.tsx` to display dates correctly
- The calendar page uses local timezone for rendering (events positioned by `getHours()`/`getMinutes()`)
- User timezone stored in `users.timezone`, configurable at `/settings/timezone`

### Calendar Auto-Scroll
When calendar loads, it auto-scrolls to the current time minus some offset so the current hour is visible in the viewport.

### Mobile Layout
- Uses `100dvh` (dynamic viewport height) instead of `100vh` to prevent bottom nav shifting on iOS
- Sticky header with navigation arrows and view selector tabs
- Inner content area uses `flex-1 min-h-0` for proper scrolling

---

## 11. Google Calendar Integration

### OAuth Flow
1. User provides their own Google Cloud OAuth Client ID + Secret at `/settings/google-calendar`
2. `GET /api/google-calendar/authorize-url` generates the OAuth URL
3. User clicks authorize → redirected to Google consent screen
4. Google redirects to `/api/google-calendar/callback`
5. Callback stores access token, refresh token, and expiry on the user record
6. Tokens auto-refresh when expired (handled in `google-calendar.ts`)

### Sync Directions
| Direction | Behavior |
|-----------|----------|
| import | Google → App (shows GCal events in PQ calendar) |
| export | App → Google (pushes PQ tasks to GCal) |
| both | Bidirectional sync |

### Syncing Tasks to Google Calendar
`POST /api/calendar/sync` with `{ selectedTasks: [taskId, ...] }`:
1. For each task, checks if it already has a `googleEventId`
2. If yes → updates existing event
3. If no → creates new event, stores `googleEventId` on task
4. Returns `{ exported, created, updated, skipped }`

### Instant Sync
When enabled (`googleCalendarInstantSync = true`), changes to tasks automatically propagate to Google Calendar:
- Task completed → deletes GCal event
- Task rescheduled (drag/drop) → updates GCal event time
- Task deleted → deletes GCal event

### Calendar Selection
Users can select which Google Calendars to display via `GET /api/google-calendar/calendars` (lists all calendars) and `PUT /api/google-calendar/settings` to save the selection.

### Calendar Color Sync
Google Calendar event colors are preserved and displayed in the app calendar. Task colors can be customized via `PATCH /api/tasks/:id/color`.

---

## 12. Notion Integration

### Setup
User provides Notion API key and database ID/URL at `/settings/notion`. The database ID is extracted from various Notion URL formats via `shared/notionUtils.ts`.

### Import
`POST /api/notion/import` → fetches all pages from Notion database → creates tasks in PQ:
- `replaceAll` option: delete all existing tasks first (with Google Calendar cleanup)
- Maps Notion properties: Name → title, Duration → duration, Due Date → dueDate, Priority → importance, Description → description, etc.
- Deduplication: skips tasks that already have a matching `notionId`

### Export/Append
- `POST /api/notion/export` — export selected tasks TO Notion (creates new pages)
- `POST /api/notion/append` — append selected tasks to Notion database
- `POST /api/notion/delete` — delete selected tasks from Notion

### Undo Operations
Each Notion operation has an undo endpoint:
- `POST /api/notion/undo-import` — restore tasks deleted during import
- `POST /api/notion/undo-export` — remove pages created during export
- `POST /api/notion/undo-append` — reverse append
- `POST /api/notion/undo-delete` — restore deleted Notion pages

### Diagnostics
- `GET /api/notion/databases` — list accessible databases
- `GET /api/notion/test` — test connection validity
- `GET /api/notion/count` — count pages in database
- `GET /api/notion/check-duplicates` — find tasks that exist in both systems

---

## 13. Item Shop & Purchases

### Shop Items
- Default items seeded on first user login via `seed-shop.ts`
- Users can add custom items: `POST /api/shop/items`
- Items have: name, description, cost (gold), icon (emoji), category
- Edit item: `PATCH /api/shop/items/:id`
- Delete: `DELETE /api/shop/items/:id`

### Purchasing Flow
`POST /api/shop/purchase` with `{ itemId }`:
1. Checks user has enough gold
2. Deducts gold from `user_progress.goldTotal`
3. Adds to `user_progress.goldSpent`
4. Creates `purchase` record
5. Returns updated gold balance

### Inventory
- `GET /api/inventory` — returns unused purchases grouped by item
- `PATCH /api/purchases/:id/use` — marks a purchase as used (sets `used=true`, `usedAt=now`)

### Mobile Layout
Shop page has a sticky header on mobile showing title + gold balance + Add Item button, positioned below the safe area inset.

---

## 14. Campaigns System

### Overview
Campaigns represent custom life goals (e.g., "Get Fit", "Launch Business"). Each has:
- Title, description, icon (Lucide icon name)
- Quests: array of `{ id, title, status }` where status is "completed"/"in-progress"/"locked"
- Rewards: array of reward strings
- Progress: 0-100 percentage
- isActive: whether currently being pursued

### API
- `GET /api/campaigns` — list user's campaigns
- `POST /api/campaigns` — create new (max 10 per user)
- `PATCH /api/campaigns/:id` — update fields
- `DELETE /api/campaigns/:id` — delete campaign

### Display
Desktop: grid layout. Mobile: scrollable card list.

---

## 15. Finance Tracking

### Overview
Simple income/expense tracker on the Finances page (`finances.tsx`). Items have:
- Item name, category, monthly cost (stored in cents), recurrence type

### Categories
General, Business, Entertainment, Food, Housing, Health, Transport, Utilities, Subscriptions, Education, Personal, Insurance, Savings, Debt, Gifts, Other.

### Recurrence Types & Monthly Conversion
| Type | Conversion |
|------|-----------|
| monthly | Direct (no conversion) |
| yearly | ÷ 12 |
| biweekly | × 26 ÷ 12 |
| 2x a year | ÷ 6 |

### Visualization
- Pie chart of expenses by category (Recharts)
- Savings rate calculation: `(income - expenses) / income × 100`
- Budget summary with totals

### API
- `GET /api/finances` — list all financial items
- `POST /api/finances` — create item
- `DELETE /api/finances/:id` — delete item

---

## 16. ML Task Sorting

### Overview
AI-powered task scheduling that learns from user feedback. Located in `server/ml-sorting.ts` (~408 lines) and `server/ai-sort-service.ts`.

### How It Works
1. User clicks "AI Smart Sort" on the calendar page
2. `POST /api/ml/sort-tasks` sends: tasks for the target date, user preferences, blocked time slots (Google Calendar events)
3. ML service creates a priority-weighted schedule:
   - Sort by priority (Pareto first, then High, Med-High, etc.)
   - Respect working hours (learned `preferredStartHour`/`preferredEndHour`)
   - Avoid overlaps with blocked slots (Google Calendar events)
   - Insert breaks between tasks (learned `breakDuration`)
4. Returns proposed schedule as `[{ taskId, startTime, endTime }]`
5. User reviews in `MlSortFeedbackModal` — can approve, correct, or reject
6. `POST /api/ml/apply-sort` applies the schedule (updates `scheduledTime` for each task)
7. `POST /api/ml/feedback` stores feedback for learning

### Preferences Learning
- Tracks `totalApproved` and `totalCorrected`
- Learns preferred start/end hours and break duration from corrections
- Adjusts priority weighting based on user patterns
- `GET /api/ml/preferences` — returns current learned preferences

---

## 17. Recycling Bin

### Overview
Page at `/recycling-bin` (`recycling-bin.tsx`) shows soft-deleted tasks. Tasks enter the recycling bin when:
- Completed (recycledReason = "completed", recycled = true)
- Deleted via Delete button (recycledReason = "deleted", recycled = true)
- Deleted via batch delete

### Features
- Search by title
- Filter by reason (completed/deleted)
- Sort by recycled date
- Restore individual: `POST /api/tasks/:id/restore` → sets recycled=false, recycledReason=null
- Restore batch: `POST /api/tasks/restore` with taskIds
- Permanently delete individual: `DELETE /api/tasks/:id/permanent` → removes from DB
- Permanently delete batch: `POST /api/tasks/permanent-delete` with taskIds

---

## 18. Dashboard

### Overview
The Dashboard page (`dashboard.tsx`) shows a 2×2 resizable widget grid:

1. **Skills Widget:** Spider/radar chart of all skill levels (Recharts)
2. **Calendar Widget:** Mini calendar showing today's scheduled events
3. **Tasks Widget:** Quick task overview with pending/overdue counts
4. **Finance Widget:** Budget summary with savings rate

### Desktop Resize
Uses `react-resizable-panels` with draggable borders between widgets. Panel sizes persist to `localStorage`.

### Mobile
Stacked single-column layout (no resize handles). Widgets adapt to full width.

---

## 19. Navigation & Layout

### TabBar (tab-bar.tsx)
- **Mobile (< 768px):** Fixed bottom bar with 5 icons: Dashboard (🏠), Quests (⚔️), Calendar (📅), Item Shop (🛒), Profile (👤)
- **Desktop (≥ 768px):** Fixed top bar with same navigation + additional links in a dropdown/menu for: Skills, Campaigns, Settings, Recycling Bin, Finances
- Bottom bar uses `safe-area-inset-bottom` CSS for notched iPhones
- z-index: 50

### Mobile Detection
`useIsMobile()` hook in `client/src/hooks/use-mobile.ts` returns true when viewport width < 768px. Used extensively throughout the app for responsive layouts.

### Page Layout Pattern
All pages follow this structure:
```tsx
<div className={`min-h-screen bg-gradient-... ${!isMobile ? 'pt-16' : ''} pb-24`}>
  {/* pt-16 = space for top nav on desktop */}
  {/* pb-24 = space for bottom nav on mobile */}
  {/* page content */}
</div>
```

### Safe Area CSS (index.css)
```css
.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-inset-top { padding-top: env(safe-area-inset-top); }
```

### Frontend Routes (App.tsx)
| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | Landing (unauth) / redirect to Dashboard (auth) | No |
| `/login` | Login page | No |
| `/register` | Register page | No |
| `/forgot-password` | Forgot password | No |
| `/reset-password` | Reset password form | No |
| `/dashboard` | Dashboard | Yes |
| `/tasks` | Tasks/Quests (home.tsx) | Yes |
| `/calendar` | Calendar | Yes |
| `/shop` | Item Shop | Yes |
| `/skills` | Skills | Yes |
| `/campaigns` | Campaigns | Yes |
| `/npcs` | NPCs page | Yes |
| `/finances` | Finance tracking | Yes |
| `/profile` | User profile | Yes |
| `/settings` | Settings hub | Yes |
| `/settings/finances` | Finance settings | Yes |
| `/settings/notion` | Notion integration | Yes |
| `/settings/calendar` | Calendar settings | Yes |
| `/settings/timezone` | Timezone settings | Yes |
| `/settings/google-calendar` | Google Calendar settings | Yes |
| `/settings/guides` | Guides hub | Yes |
| `/settings/guides/skill-classification` | Skill classification guide | Yes |
| `/settings/guides/measure-what-matters` | Measure What Matters guide | Yes |
| `/recycling-bin` | Recycling bin | Yes |
| `/getting-started` | Onboarding guide | Yes |

---

## 20. Mobile-Specific Behaviors

### Dynamic Viewport Height
Calendar page uses `100dvh` instead of `100vh` to prevent bottom nav shifting when iOS Safari URL bar collapses/expands.

### Task Detail Modal
On mobile, the TaskDetailModal renders fullscreen (`h-full w-full m-0 rounded-none`) with:
- `pt-[max(1rem,env(safe-area-inset-top))]` — Dynamic Island / notch clearance
- `pb-[max(1.5rem,env(safe-area-inset-bottom))]` — home indicator clearance
- Close button: `[&>button]:top-[max(0.75rem,env(safe-area-inset-top))]` — below safe area
- 2-column grid for key info (Due Date, Duration, Reward, Importance) on mobile
- 2-column grid for additional properties (Questline, Work Filter, Kanban, Recurrence) with stacked label/dropdown

### Selection Bar
Fixed above bottom nav with 4-column grid layout (`grid grid-cols-4 gap-1`) showing all 11 action buttons without scrolling. Uses `h-8` tap targets.

### Touch Interactions
- Double-tap on task card → opens detail modal (350ms detection window using `useRef` for last tap time)
- Single tap → selects task (delayed 350ms to allow double-tap detection)
- Calendar drag/drop works with touch events via `touch-none` CSS class during drag

### Shop Sticky Header
Item Shop page has a sticky header on mobile showing title + gold balance + "Add Item" button.

---

## 21. Frontend Components Reference

### TaskCard (`task-card.tsx`, ~500 lines)
**Props:** `{ task, onSelect, isSelected, isCompact }`
- `isCompact=true` → compact grid card (smaller, truncated title/description)
- `isCompact=false` → full list card with all metadata
- Contains double-tap/click detection: `lastTapTimeRef` + `tapTimeoutRef`, 350ms threshold
- Renders TaskDetailModal and SkillAdjustmentModal internally (each task card manages its own modals)
- Due date display uses `getUTCMonth()`, `getUTCDate()`, `getUTCFullYear()` for correct timezone handling

### TaskDetailModal (`task-detail-modal.tsx`, ~583 lines)
**Props:** `{ task, open, onOpenChange }`
Full-screen on mobile (DialogContent with mobile classes), dialog on desktop. Shows all task fields as editable:
- Description/Details: auto-saving textareas with debounced PATCH (saves after typing stops)
- Due Date: calendar picker popover
- Duration: inline edit with save/cancel buttons
- Importance, Questline, Work Filter, Kanban Stage, Recurrence: Select dropdowns
- Gold value: read-only (auto-calculated when duration/importance changes)
- Emoji: clickable EmojiPicker
- Skills: displayed as badges, click to adjust

### AddTaskModal (`add-task-modal.tsx`)
**Props:** `{ open, onOpenChange }`
Form for creating new tasks. Fields: title, description, details, duration, due date, importance, kanban stage, recurrence, business filter, campaign, boolean flags (apple, smartPrep, etc.).

### CompletionAnimation (`completion-animation.tsx`)
Framer Motion animation showing gold coins flying and XP sparkles when tasks are completed. Triggered by completion mutations.

### LevelUpModal (`level-up-modal.tsx`)
Celebration modal when a skill levels up. Shows skill name, new level, and animation.

### EmojiPicker (`emoji-picker.tsx`)
Popover-based emoji selector. Props: `{ value, onChange, size }`. Supports sm/md/lg sizes. Uses stopPropagation to prevent triggering parent click handlers.

### TabBar (`tab-bar.tsx`)
Responsive navigation component. Mobile: fixed bottom with 5 icon buttons + active state highlighting. Desktop: fixed top with text labels + dropdown menu for additional pages (Skills, Campaigns, Settings, etc.).

### SkillAdjustmentModal (`skill-adjustment-modal.tsx`)
Modal for adjusting skill tags on a task. Shows all available skills as checkboxes/toggles. Changes are saved and also stored as training examples for AI categorization.

### MlSortFeedbackModal (`ml-sort-feedback-modal.tsx`)
Shows AI-proposed task schedule with drag-to-reorder. User can approve, correct order, or reject.

### CalendarSyncModal (`calendar-sync-modal.tsx`)
Confirmation dialog for syncing selected tasks to Google Calendar.

---

## 22. Complete API Reference

### Authentication
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| POST | `/api/auth/register` | `{ username, email, password }` | `{ user }` + session |
| POST | `/api/auth/login` | `{ username, password }` | `{ user }` + session |
| POST | `/api/auth/logout` | — | 200 |
| GET | `/api/auth/user` | — | `{ user }` or 401 |
| POST | `/api/auth/forgot-password` | `{ email }` | 200 |
| GET | `/api/auth/validate-reset-token?token=X` | — | `{ valid: true }` |
| POST | `/api/auth/reset-password` | `{ token, newPassword }` | 200 |

### User Settings
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/user/settings` | — | Notion + Google settings |
| PUT | `/api/user/settings` | `{ notionApiKey?, googleCalendar*? }` | Updated settings |
| GET | `/api/settings` | — | `{ timezone }` |
| POST | `/api/settings/timezone` | `{ timezone }` | 200 |

### Tasks
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/tasks` | — | `Task[]` (non-recycled) |
| POST | `/api/tasks` | `{ title, duration, importance, ... }` | Created task |
| PATCH | `/api/tasks/:id` | Partial task fields | Updated task |
| PATCH | `/api/tasks/:id/complete` | — | `{ task, goldEarned, skillXPGains }` |
| PATCH | `/api/tasks/:id/color` | `{ color }` | Updated task |
| DELETE | `/api/tasks/:id` | — | Recycled task |
| GET | `/api/tasks/export/csv` | — | CSV file download |
| POST | `/api/tasks/add-to-calendar` | `{ taskId, scheduledTime }` | Updated task |
| POST | `/api/tasks/complete-batch` | `{ taskIds }` | Batch result |
| POST | `/api/tasks/delete-batch` | `{ taskIds }` | Batch result |
| POST | `/api/tasks/move-overdue-to-today` | — | Count updated |
| POST | `/api/tasks/undo-complete` | `{ taskIds }` | Tasks restored |
| POST | `/api/tasks/categorize` | `{ taskId }` | `{ skillTags }` |
| POST | `/api/tasks/categorize-all` | — | Categorization results |
| POST | `/api/tasks/categorize-feedback` | `{ taskId, correctSkills, aiSuggestedSkills, isApproved }` | 200 |
| GET | `/api/tasks/training-examples` | — | Training data array |
| POST | `/api/tasks/:id/unschedule` | — | Task unscheduled |

### Recycling Bin
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/recycled-tasks` | — | `Task[]` (recycled=true) |
| POST | `/api/tasks/:id/restore` | — | Restored task |
| DELETE | `/api/tasks/:id/permanent` | — | 200 |
| POST | `/api/tasks/restore` | `{ taskIds }` | Batch result |
| POST | `/api/tasks/permanent-delete` | `{ taskIds }` | Batch result |

### Notion
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/notion/databases` | — | Database list |
| GET | `/api/notion/test` | — | Connection status |
| GET | `/api/notion/count` | — | `{ count }` |
| GET | `/api/notion/check-duplicates` | — | Duplicate info |
| POST | `/api/notion/import` | `{ replaceAll? }` | Import result |
| POST | `/api/notion/export` | `{ taskIds }` | Export result |
| POST | `/api/notion/append` | `{ taskIds }` | Append result |
| POST | `/api/notion/delete` | `{ taskIds }` | Delete result |
| POST | `/api/notion/undo-import` | — | Undo result |
| POST | `/api/notion/undo-export` | — | Undo result |
| POST | `/api/notion/undo-append` | — | Undo result |
| POST | `/api/notion/undo-delete` | — | Undo result |

### Google Calendar
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/google-calendar/authorize-url` | — | `{ url }` |
| GET | `/api/google-calendar/callback` | `?code=X` | Redirect to settings |
| POST | `/api/google-calendar/disconnect` | — | 200 |
| PUT | `/api/google-calendar/settings` | Sync settings object | Updated settings |
| GET | `/api/google-calendar/debug` | — | Token debug info |
| GET | `/api/google-calendar/calendars` | — | Calendar list |
| GET | `/api/google-calendar/events?year=X&month=Y` | — | Merged events array |
| POST | `/api/google-calendar/sync` | — | Sync result |
| POST | `/api/google-calendar/sync-manual` | — | Manual sync result |
| POST | `/api/google-calendar/clear-all` | — | Clear result |
| POST | `/api/calendar/sync` | `{ selectedTasks }` | `{ exported, created, updated, skipped }` |

### Standalone Calendar Events
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| POST | `/api/standalone-events` | `{ title, date, startTime, duration, color }` | Created event |
| PATCH | `/api/standalone-events/:id` | Partial event fields | Updated event |
| DELETE | `/api/standalone-events/:id` | — | 200 |

### Shop
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/shop/items` | — | Item list |
| POST | `/api/shop/items` | `{ name, description, cost, icon }` | Created item |
| PATCH | `/api/shop/items/:id` | Partial item fields | Updated item |
| DELETE | `/api/shop/items/:id` | — | 200 |
| POST | `/api/shop/seed-defaults` | — | Default items seeded |
| POST | `/api/shop/purchase` | `{ itemId }` | `{ purchase, goldRemaining }` |
| GET | `/api/purchases` | — | Purchase list |
| PATCH | `/api/purchases/:id/use` | — | Purchase marked used |
| GET | `/api/inventory` | — | Grouped unused purchases |

### Progress & Stats
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/progress` | — | `{ goldTotal, tasksCompleted, goldSpent }` |
| GET | `/api/stats` | — | Today's stats summary |

### Skills
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/skills` | — | Skill list |
| PATCH | `/api/skills/:skillName` | `{ description? }` | Updated skill |
| POST | `/api/skills/:skillName/xp` | `{ amount }` | Updated skill (may level up) |
| PATCH | `/api/skills/id/:skillId` | `{ level?, xp?, maxXp? }` | Updated skill |
| POST | `/api/skills/restore-defaults` | — | Missing defaults created |
| POST | `/api/skills/custom` | `{ name, description, icon }` | Created custom skill |
| DELETE | `/api/skills/:skillId` | — | 200 (custom only) |
| PATCH | `/api/skills/:skillId/icon` | `{ icon }` | Updated skill |
| PATCH | `/api/skills/:skillId/milestones` | `{ constellationMilestones }` | Updated milestones |
| PATCH | `/api/skills/:skillId/milestones/:milestoneId/toggle` | — | Milestone toggled |

### Campaigns
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/campaigns` | — | Campaign list |
| POST | `/api/campaigns` | `{ title, description, icon, quests, rewards }` | Created campaign |
| PATCH | `/api/campaigns/:id` | Partial campaign fields | Updated campaign |
| DELETE | `/api/campaigns/:id` | — | 200 |

### Finance
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/finances` | — | Financial item list |
| POST | `/api/finances` | `{ item, category, monthlyCost, recurType }` | Created item |
| DELETE | `/api/finances/:id` | — | 200 |

### ML Sorting
| Method | Endpoint | Body/Params | Response |
|--------|----------|-------------|----------|
| GET | `/api/ml/preferences` | — | User's learned preferences |
| POST | `/api/ml/sort-tasks` | `{ tasks, date, blockedSlots }` | Sorted schedule proposal |
| POST | `/api/ml/apply-sort` | `{ schedule }` | Tasks updated |
| POST | `/api/ml/feedback` | `{ feedbackType, corrections? }` | 200 |

---

## 23. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Express session encryption secret |
| `OPENAI_API_KEY` | Optional | OpenAI API key for AI categorization (categorization silently skipped if missing) |
| `RESEND_API_KEY` | Optional | Resend API key for password reset emails |
| `RESEND_FROM_EMAIL` | Optional | From address for reset emails |
| `NODE_ENV` | Auto | "development" or "production" |

**Note:** Google Calendar credentials are stored per-user in the database (not env vars). Notion credentials are also stored per-user.

---

## 24. Comprehensive Test Cases

### TC-AUTH: Authentication

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| AUTH-01 | Register new user | POST `/api/auth/register` with valid username/email/password | 200, user created, session set, 9 default skills created, user_progress record created |
| AUTH-02 | Register duplicate email | POST with existing email | 400, "Email already registered" |
| AUTH-03 | Register duplicate username | POST with existing username | 400, "Username already taken" |
| AUTH-04 | Register weak password | POST with password < 6 chars | 400, Zod validation error |
| AUTH-05 | Login with username | POST `/api/auth/login` with username + password | 200, session created |
| AUTH-06 | Login with email | POST `/api/auth/login` with email + password | 200, session created |
| AUTH-07 | Login wrong password | POST with incorrect password | 401, "Invalid credentials" |
| AUTH-08 | Login nonexistent user | POST with unknown username | 401, "Invalid credentials" |
| AUTH-09 | Access protected route unauthenticated | GET `/api/tasks` without session | 401, "Authentication required" |
| AUTH-10 | Logout | POST `/api/auth/logout` | 200, session destroyed |
| AUTH-11 | Get current user | GET `/api/auth/user` with valid session | 200, returns user object |
| AUTH-12 | Password reset request | POST `/api/auth/forgot-password` with valid email | 200, email sent, token stored |
| AUTH-13 | Password reset with valid token | POST `/api/auth/reset-password` with valid token + new password | 200, password updated, token marked used |
| AUTH-14 | Password reset with expired token | POST with expired token | 400, "Token has expired" |
| AUTH-15 | Password reset with used token | POST with already-used token | 400, "Token has already been used" |
| AUTH-16 | Validate reset token | GET `/api/auth/validate-reset-token?token=valid` | 200, `{ valid: true }` |
| AUTH-17 | Validate invalid token | GET with invalid token | 400, `{ valid: false }` |

### TC-TASK: Task Management

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| TASK-01 | Create task | POST `/api/tasks` with title, duration=60, importance="High" | 201, task created with goldValue=66, AI categorization triggered in background |
| TASK-02 | Create task gold calc 30min Medium | Create 30min Medium task | goldValue = round(20 × 1.5 × 1.05) = 32 |
| TASK-03 | Create task gold calc 120min Pareto | Create 120min Pareto task | goldValue = round(20 × 6 × 1.15) = 138 |
| TASK-04 | Create task without importance | POST without importance field | Defaults to "Medium", gold calculated accordingly |
| TASK-05 | Create task with emoji | POST with `{ emoji: "🎯" }` | Task created with custom emoji |
| TASK-06 | Edit task title | PATCH `/api/tasks/:id` with `{ title: "New Title" }` | 200, title updated |
| TASK-07 | Edit task due date | PATCH with `{ dueDate: "2026-03-01T00:00:00Z" }` | 200, dueDate updated |
| TASK-08 | Edit task duration recalculates gold | PATCH with `{ duration: 90 }` on a High task | 200, duration=90, goldValue recalculated to 99 |
| TASK-09 | Edit task importance recalculates gold | PATCH with `{ importance: "Pareto" }` on 60min task | 200, goldValue recalculated to 69 |
| TASK-10 | Complete one-time task | PATCH `/api/tasks/:id/complete` on recurType="one-time" task | Task: completed=true, recycled=true, recycledReason="completed". Gold added to progress. XP distributed. |
| TASK-11 | Complete recurring weekly task | Complete task with recurType="weekly" | Task NOT completed. dueDate advances +7 days, scheduledTime cleared, goldValue unchanged |
| TASK-12 | Complete recurring daily task | Complete task with recurType="daily" | dueDate advances +1 day |
| TASK-13 | Complete recurring monthly task | Complete task with recurType="monthly" | dueDate advances +1 month |
| TASK-14 | Complete task XP distribution 2 skills | Complete 60min High task, skillTags=["Health","Mindset"] | Total XP=72, each skill gets 36 XP |
| TASK-15 | Complete task XP distribution 1 skill | Complete 60min High task, skillTags=["Health"] | Health gets full 72 XP |
| TASK-16 | Complete task triggers level up | Skill at level 1, xp=90, maxXp=100. Complete task awarding 15 XP | Skill: level=2, xp=5, maxXp=115 |
| TASK-17 | Undo completion | POST `/api/tasks/undo-complete` with [taskId] | Task: completed=false, recycled=false. Gold deducted. XP removed from skills. |
| TASK-18 | Delete task | DELETE `/api/tasks/:id` | Task: recycled=true, recycledReason="deleted". No gold/XP awarded |
| TASK-19 | Delete task with GCal event | DELETE task that has googleEventId and instant sync on | Task recycled AND Google Calendar event deleted |
| TASK-20 | Batch complete 3 tasks | POST `/api/tasks/complete-batch` with 3 taskIds | All 3 completed, total gold = sum of individual golds |
| TASK-21 | Batch delete 3 tasks | POST `/api/tasks/delete-batch` with 3 taskIds | All 3 recycled, no rewards |
| TASK-22 | Move overdue to today | Have 2 tasks with dueDate yesterday. POST `/api/tasks/move-overdue-to-today` | Both tasks get dueDate = today in user's timezone |
| TASK-23 | CSV export | GET `/api/tasks/export/csv` | Returns CSV with correct headers and all task data |
| TASK-24 | Schedule task on calendar | POST `/api/tasks/add-to-calendar` with `{ taskId, scheduledTime }` | Task: scheduledTime set, appears in calendar view |
| TASK-25 | Unschedule task | POST `/api/tasks/:id/unschedule` | scheduledTime = null |
| TASK-26 | Update calendar color | PATCH `/api/tasks/:id/color` with `{ color: "#ff0000" }` | calendarColor updated |
| TASK-27 | Task card single tap | Tap task card once, wait 350ms+ | Task becomes selected (checkbox toggled) |
| TASK-28 | Task card double tap | Tap task card twice within 350ms | TaskDetailModal opens, task NOT selected |
| TASK-29 | Filter by business "Apple" | Select "Apple" in business filter | Only tasks with businessWorkFilter="Apple" shown |
| TASK-30 | Search tasks by title | Type "surgery" in search bar | Only tasks containing "surgery" in title displayed |
| TASK-31 | Sort by importance | Select "Importance" sort option | Tasks ordered: Pareto → High → Med-High → Medium → Med-Low → Low |
| TASK-32 | Sort by gold value | Select "Gold Value" sort option | Tasks ordered by goldValue descending |
| TASK-33 | Quick filter: Overdue | Click "Overdue" filter | Only tasks with dueDate < today shown |
| TASK-34 | Quick filter: Routines | Click "Routines" filter | Only tasks with recurType != "one-time" shown |
| TASK-35 | Quick filter: Quick Tasks | Click "Quick Tasks" filter | Only tasks with duration < 30 shown |

### TC-SKILL: Skills System

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| SKILL-01 | Default skills on registration | Register new account | 9 default skills created with level=1, xp=0, isCustom=false |
| SKILL-02 | Create custom skill | POST `/api/skills/custom` with name="Cooking", description="..." | New skill: isCustom=true, level=1, xp=0, maxXp=100 |
| SKILL-03 | Create duplicate skill name | POST custom with name matching existing | 400 error, "Skill already exists" |
| SKILL-04 | Delete custom skill | DELETE `/api/skills/:skillId` for custom skill | Skill deleted |
| SKILL-05 | Attempt delete default skill | DELETE on a default skill | Error or prevented (only custom deletable) |
| SKILL-06 | Edit skill icon | PATCH `/api/skills/:skillId/icon` with `{ icon: "🔥" }` | skillIcon updated |
| SKILL-07 | Edit skill level/XP directly | PATCH `/api/skills/id/:skillId` with `{ level: 5, xp: 50, maxXp: 200 }` | Values set directly |
| SKILL-08 | Add XP below threshold | POST `/api/skills/Health/xp` with `{ amount: 30 }` when xp=20, maxXp=100 | xp=50, level unchanged |
| SKILL-09 | Add XP triggers level up | POST `/api/skills/Health/xp` with `{ amount: 90 }` when xp=50, maxXp=100 | level+1, xp=40 (overflow), maxXp=115 |
| SKILL-10 | Spider chart renders all skills | Navigate to Skills page, select radar view | Recharts radar chart with all skills shown |
| SKILL-11 | Constellation view renders | Select constellation view | Star map with skill nodes at center, milestone branches |
| SKILL-12 | Add constellation milestone | Edit milestones, add new node | New node appears in constellation with default position |
| SKILL-13 | Drag constellation node | Drag a milestone node to new position | x, y updated in constellationMilestones |
| SKILL-14 | Toggle milestone completed | Click milestone node | ID added to/removed from completedMilestones |
| SKILL-15 | Restore default skills | After deleting a default skill, POST `/api/skills/restore-defaults` | Missing defaults re-created, existing skills preserved |
| SKILL-16 | Custom skill in AI categorization | Create "Cooking" skill, create task "Make dinner" | AI may assign "Cooking" tag |

### TC-CAL: Calendar System

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| CAL-01 | View mode persistence | Switch to Week view, navigate away and back | Week view restored from localStorage |
| CAL-02 | Day view rendering | Select Day view | Single day with hourly grid, events positioned by time |
| CAL-03 | 3-Day view rendering | Select 3-Day view | Three columns showing 3 consecutive days |
| CAL-04 | Week view rendering | Select Week view | 7 columns with hourly grid |
| CAL-05 | Month view rendering | Select Month view | Traditional month grid with event dots/blocks |
| CAL-06 | Navigate forward | Click forward arrow | Calendar advances one period |
| CAL-07 | Navigate backward | Click back arrow | Calendar goes back one period |
| CAL-08 | Navigate to today | Click "Today" button | Calendar returns to current date |
| CAL-09 | Drag event to new time | Drag a task event to a different hour | scheduledTime updated via PATCH |
| CAL-10 | Drag event to new day | Drag event to different day column | scheduledTime updated to new day + new hour |
| CAL-11 | Resize event duration | Drag bottom handle of event down 2 hours | duration increased by 120 min |
| CAL-12 | Drag with instant sync | Drag event with GCal sync enabled | Both PQ task and Google Calendar event updated |
| CAL-13 | Create standalone event | Double-click empty time slot | New Event modal opens, can fill title/color/duration |
| CAL-14 | Edit standalone event | Click standalone event | Event detail popover with edit options |
| CAL-15 | Delete standalone event | Click standalone event, click delete | Event removed |
| CAL-16 | Event source display | Have PQ tasks, Google events, standalone events | All three source types visible with correct colors |
| CAL-17 | Mobile 100dvh layout | Open calendar on iOS Safari | Bottom nav stays fixed when URL bar collapses |
| CAL-18 | Midnight UTC fix | Task with scheduledTime at midnight UTC | Displayed on correct day (corrected to 17:00 UTC) |
| CAL-19 | Auto-scroll to current time | Open Day view at 2pm | View auto-scrolled to show 2pm area |
| CAL-20 | Touch drag on mobile | Touch-drag an event on mobile | Event moves to new time (touch-none class applied during drag) |

### TC-GCAL: Google Calendar Integration

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| GCAL-01 | Save OAuth credentials | Enter Client ID + Secret at settings page | Credentials stored on user record |
| GCAL-02 | OAuth authorization | GET `/api/google-calendar/authorize-url`, follow URL | Google consent screen shown |
| GCAL-03 | OAuth callback | Complete Google authorization | Tokens stored, redirect to settings page |
| GCAL-04 | Sync selected tasks to GCal | Select 3 tasks, click "Sync to Calendar" | Tasks appear in Google Calendar, googleEventId stored on each |
| GCAL-05 | Sync already-synced task | Sync task that already has googleEventId | Event updated (not duplicated) |
| GCAL-06 | Instant sync on complete | Enable instant sync, complete task | Google Calendar event deleted |
| GCAL-07 | Instant sync on drag | Drag-drop event with instant sync on | Google Calendar event time updated |
| GCAL-08 | Disconnect | POST `/api/google-calendar/disconnect` | Tokens cleared, sync disabled |
| GCAL-09 | Token auto-refresh | Access with expired access token | Auto-refreshes using refresh token, no user action needed |
| GCAL-10 | Sync direction: import | Set sync direction to "import" | Google events visible in app, but app tasks NOT pushed to Google |
| GCAL-11 | Sync direction: export | Set to "export" | App tasks pushed to Google, Google events NOT shown |
| GCAL-12 | Sync direction: both | Set to "both" | Bidirectional sync |
| GCAL-13 | Calendar color preservation | Import Google events with custom colors | Colors displayed correctly in PQ calendar |
| GCAL-14 | Delete synced task removes GCal event | Delete a task with googleEventId | Corresponding Google Calendar event also deleted |
| GCAL-15 | Clear all synced events | POST `/api/google-calendar/clear-all` | All app-created Google Calendar events deleted |
| GCAL-16 | Calendar selection | Select specific calendars to display | Only selected calendars' events shown |

### TC-NOTION: Notion Integration

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| NOTION-01 | Test connection | GET `/api/notion/test` with valid credentials | 200, database info returned |
| NOTION-02 | Test connection invalid key | GET `/api/notion/test` with bad API key | Error message |
| NOTION-03 | Count pages | GET `/api/notion/count` | Returns count of pages in Notion DB |
| NOTION-04 | Import tasks | POST `/api/notion/import` | Tasks created from Notion pages, properties mapped correctly |
| NOTION-05 | Import with replaceAll | Import with replaceAll=true | Existing tasks deleted (GCal events cleaned up), new tasks imported |
| NOTION-06 | Import deduplication | Import when some Notion pages already exist as tasks (matching notionId) | Duplicates skipped |
| NOTION-07 | Export to Notion | POST `/api/notion/export` with taskIds | New Notion pages created with correct properties |
| NOTION-08 | Append to Notion | POST `/api/notion/append` with taskIds | Tasks added to Notion DB |
| NOTION-09 | Delete from Notion | POST `/api/notion/delete` with taskIds | Notion pages archived/deleted |
| NOTION-10 | Undo import | POST `/api/notion/undo-import` | Imported tasks removed, previous tasks restored |
| NOTION-11 | Undo export | POST `/api/notion/undo-export` | Exported Notion pages removed |
| NOTION-12 | Check duplicates | GET `/api/notion/check-duplicates` | Returns tasks existing in both systems |

### TC-SHOP: Item Shop

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| SHOP-01 | View shop items | Navigate to Item Shop | Default + custom items displayed with names and costs |
| SHOP-02 | Seed default items | POST `/api/shop/seed-defaults` | Default items created for user |
| SHOP-03 | Purchase item (sufficient gold) | Click buy on item, user has enough gold | Gold deducted from progress.goldTotal, goldSpent incremented, purchase record created |
| SHOP-04 | Purchase item (insufficient gold) | Try to buy 500g item with 100g balance | Error: "Not enough gold" |
| SHOP-05 | Add custom item | POST `/api/shop/items` with name/cost/icon | New item appears in shop |
| SHOP-06 | Edit item price | PATCH `/api/shop/items/:id` with new cost | Cost updated |
| SHOP-07 | Delete custom item | DELETE `/api/shop/items/:id` | Item removed from shop |
| SHOP-08 | View inventory | GET `/api/inventory` | Returns unused purchases grouped by item |
| SHOP-09 | Use purchased item | PATCH `/api/purchases/:id/use` | used=true, usedAt=now |
| SHOP-10 | Mobile sticky header | Open shop on mobile, scroll down | Title + gold balance + Add button stay at top |

### TC-CAMPAIGN: Campaigns

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| CAMP-01 | Create campaign | POST `/api/campaigns` with title, description, icon, quests | Campaign created |
| CAMP-02 | Create campaign at limit | Try to create 11th campaign | Error, max 10 campaigns |
| CAMP-03 | Update progress | PATCH with `{ progress: 75 }` | Progress bar shows 75% |
| CAMP-04 | Update quests | PATCH with updated quests array | Quest statuses updated |
| CAMP-05 | Delete campaign | DELETE `/api/campaigns/:id` | Campaign removed |
| CAMP-06 | List campaigns | GET `/api/campaigns` | Returns all user's campaigns |

### TC-FINANCE: Finance Tracking

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| FIN-01 | Add monthly expense | POST with item="Netflix", monthlyCost=1599, recurType="monthly" | Item created, shows as $15.99/mo |
| FIN-02 | Add yearly expense | POST with monthlyCost=12000, recurType="yearly" | Shows as $1000/mo amortized (12000/12) |
| FIN-03 | Add biweekly income | POST with monthlyCost=200000, recurType="biweekly" | Shows as monthly equivalent (200000×26/12) |
| FIN-04 | Delete item | DELETE `/api/finances/:id` | Item removed |
| FIN-05 | Pie chart rendering | Add expenses in 3 categories | Pie chart shows 3 slices proportionally |
| FIN-06 | Savings rate calculation | Income=5000, Expenses=3000 | Savings rate = 40% |

### TC-ML: ML Task Sorting

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| ML-01 | Get sort proposal | POST `/api/ml/sort-tasks` with 5 tasks | Returns ordered schedule with start/end times |
| ML-02 | Priority ordering in sort | Tasks: 1 Pareto, 2 High, 2 Medium | Pareto first, then High tasks, then Medium |
| ML-03 | Respect blocked slots | Google events block 10am-12pm | No tasks scheduled 10am-12pm |
| ML-04 | Apply sorted schedule | POST `/api/ml/apply-sort` with schedule | All tasks get scheduledTime updated |
| ML-05 | Approve feedback | POST `/api/ml/feedback` with feedbackType="approved" | totalApproved incremented |
| ML-06 | Correct feedback | Reorder and submit correction | Correction stored, totalCorrected incremented |
| ML-07 | Get preferences | GET `/api/ml/preferences` | Returns learned start/end hours, break duration, weights |

### TC-RECYCLE: Recycling Bin

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| REC-01 | View recycled tasks | Navigate to `/recycling-bin` | Shows completed and deleted tasks |
| REC-02 | Filter completed only | Select "Completed" filter | Only recycledReason="completed" tasks shown |
| REC-03 | Filter deleted only | Select "Deleted" filter | Only recycledReason="deleted" tasks shown |
| REC-04 | Search recycled tasks | Type search query | Results filtered by title |
| REC-05 | Restore single task | POST `/api/tasks/:id/restore` | Task: recycled=false, recycledReason=null. Appears in active tasks. |
| REC-06 | Batch restore | POST `/api/tasks/restore` with 3 taskIds | All 3 restored to active |
| REC-07 | Permanent delete single | DELETE `/api/tasks/:id/permanent` | Task removed from database entirely |
| REC-08 | Batch permanent delete | POST `/api/tasks/permanent-delete` with 3 taskIds | All 3 removed from database |

### TC-AI: AI Categorization

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| AI-01 | Auto-categorize on create | Create task "Go for a 5k run" | skillTags automatically set to ["Physical", "Health"] (or similar) |
| AI-02 | Auto-categorize business task | Create task "Quarterly revenue analysis" | skillTags includes "Merchant" |
| AI-03 | Manual recategorize | Select task, click "Recat", change skills | New skills saved on task, training example stored |
| AI-04 | Categorize all uncategorized | POST `/api/tasks/categorize-all` with 5 uncategorized tasks | All 5 get skillTags assigned |
| AI-05 | Training feedback improves results | Correct "Jaw Surgery" from [Physical] to [Health], then create "Dental appointment" | AI more likely to assign [Health] |
| AI-06 | Custom skill in categorization | Create "Cooking" skill with description, create "Make dinner" task | AI may assign "Cooking" |
| AI-07 | No API key graceful handling | Remove OPENAI_API_KEY, create task | Task created successfully without skillTags, no error thrown |
| AI-08 | Approve AI suggestion | Accept AI's categorization without changes | Training record created with isApproved=true |
| AI-09 | Correct AI suggestion | Change AI's [Physical] to [Health, Mindset] | Training record with correctSkills=[Health, Mindset] |
| AI-10 | Training examples in prompt | After 5 corrections, check next categorization request | Prompt includes up to 10 training examples |

### TC-MOBILE: Mobile-Specific

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| MOB-01 | Bottom nav visibility | Scroll on any page on mobile | Bottom nav stays fixed at bottom |
| MOB-02 | Dynamic Island clearance | Open TaskDetailModal on iPhone 14+ | Title and close button below Dynamic Island safe area |
| MOB-03 | Home indicator clearance | Open TaskDetailModal on iPhone X+ | Bottom of modal has padding for home indicator |
| MOB-04 | Selection bar grid layout | Select 3 tasks on mobile | 4-column grid shows all 11 action buttons without horizontal scrolling |
| MOB-05 | Selection bar tap targets | Tap action buttons in selection bar | `h-8` buttons are easy to tap without accidental presses |
| MOB-06 | Calendar dvh stability | Open calendar, scroll triggering URL bar collapse | Layout stable, no jumps or content shift |
| MOB-07 | Tab bar safe area | Open on notched iPhone | Bottom nav has extra padding for home indicator |
| MOB-08 | Touch drag on calendar | Touch-drag an event on mobile | Event smoothly moves to new time |
| MOB-09 | Double-tap to open detail | Double-tap a task card | TaskDetailModal opens (not just selection) |
| MOB-10 | Single tap selection delay | Single-tap task card | 350ms delay before selection (allows double-tap detection) |
| MOB-11 | Shop sticky header scroll | Open Item Shop on mobile, scroll items | Title + gold + Add button remain visible at top |
| MOB-12 | Task detail 2-column layout | Open TaskDetailModal on mobile | Key info (Due Date, Duration, Reward, Importance) in 2-column grid |
| MOB-13 | useIsMobile detection | Viewport < 768px | useIsMobile() returns true |
| MOB-14 | useIsMobile desktop | Viewport ≥ 768px | useIsMobile() returns false |

### TC-DASH: Dashboard

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| DASH-01 | Widget rendering | Navigate to Dashboard | All 4 widgets render: Skills, Calendar, Tasks, Finance |
| DASH-02 | Desktop resize panels | Drag border between widgets | Panels resize proportionally |
| DASH-03 | Panel size persistence | Resize, navigate away, come back | Panel sizes restored from localStorage |
| DASH-04 | Mobile stacked layout | Open dashboard on mobile | Widgets stack vertically, full width, no resize handles |
| DASH-05 | Skills spider chart widget | View Skills widget | Radar chart shows all skill levels proportionally |
| DASH-06 | Calendar widget shows today | View Calendar widget | Shows today's scheduled events/tasks |
| DASH-07 | Tasks widget counts | View Tasks widget | Shows correct pending and overdue task counts |
| DASH-08 | Finance widget summary | View Finance widget with data | Shows savings rate and budget summary |

---

## 25. Important Gotchas for AI Agents

1. **Database migrations:** `drizzle-kit push` may hang. Use raw SQL via the Neon client for schema changes instead. The `server/migrations.ts` file has helpers for this.

2. **Timezone bug:** Always use UTC components (`getUTCMonth()`, `getUTCDate()`, `getUTCFullYear()`) when displaying `dueDate` from the database in task cards. The `scheduledTime` midnight UTC fix (→ 17:00 UTC) is applied in multiple places.

3. **Gold recalculation:** When changing `duration` or `importance`, gold MUST be recalculated both server-side and stored on the task. Use `calculateGold(duration, importance)` from `server/goldCalculation.ts`.

4. **Recurring tasks:** They do NOT get `completed=true`. They get their `dueDate` advanced and `scheduledTime` cleared. This logic is in the completion endpoint in `routes.ts`.

5. **Google Calendar lifecycle:** When deleting/recycling tasks with `googleEventId`, the GCal event must also be deleted if instant sync is on. This is handled in DELETE, batch delete, completion, and Notion import replace-all paths.

6. **Session auth:** All `/api/*` routes (except auth routes) require valid session. The middleware is `requireAuth` from `server/auth.ts`. Always include it on new routes.

7. **TanStack Query invalidation:** After any mutation, invalidate relevant query keys. Common keys:
   - `["/api/tasks"]` — task list
   - `["/api/stats"]` — today's stats
   - `["/api/skills"]` — skill list
   - `["/api/progress"]` — gold/tasks/spent
   - Calendar events: use `queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().includes('/api/google-calendar/events') })`

8. **Mobile detection:** `useIsMobile()` returns true for width < 768px. Many components have completely different layouts for mobile vs desktop — always check both.

9. **Safe areas:** Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for fullscreen modals and fixed-position elements on iOS. Use `max()` to combine with default padding.

10. **100dvh vs 100vh:** Always use `100dvh` for mobile fixed-height layouts. `100vh` causes jitter on iOS when the Safari URL bar collapses.

11. **routes.ts is massive:** The main route file is ~4600 lines. When adding new endpoints, find the appropriate section (routes are grouped by feature) and add there.

12. **storage.ts is the DB layer:** Never access Drizzle/DB directly from routes. Always go through `storage.ts` methods. If you need a new DB operation, add a method to the `IStorage` interface and implement it in `DatabaseStorage`.

13. **Client-side gold calculation:** There's a client-side mirror of the gold formula in `client/src/lib/goldCalculation.ts`. If you change the server formula, update the client too.

14. **Zod schemas in shared/schema.ts:** Insert/select schemas are defined alongside table definitions. Use these for request validation in routes.

15. **Capacitor (iOS):** The app runs as a native iOS app via Capacitor. The `capacitor.config.ts` and `ios/` folder contain native config. `npm run cap:sync` syncs web assets to iOS.
