# ProductivityQuest 🎮⚔️

A gamified task management and productivity application that transforms your daily tasks into an RPG-style adventure. Complete tasks to earn gold, level up skills, purchase rewards, and track your progress through an immersive fantasy-themed interface.

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#%EF%B8%8F-architecture)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Database Schema](#-database-schema)
- [Backend Architecture](#-backend-architecture)
- [Frontend Architecture](#-frontend-architecture)
- [Features](#-features)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [UI Components & Styling](#-ui-components--styling)
- [Skills System](#-skills-system)
- [Gold Calculation System](#-gold-calculation-system)
- [AI Categorization](#-ai-categorization)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## 🎮 Overview

ProductivityQuest is a full-stack web application that gamifies productivity by combining task management with RPG elements. Users can:

- **Create and manage tasks** with rich metadata (due dates, importance, filters)
- **Earn gold** by completing tasks based on a transparent, modular formula
- **Level up skills** - 9 default skills + unlimited custom skills
- **Auto-categorize tasks** - AI automatically assigns skill tags when tasks are created
- **Purchase rewards** from a customizable shop using earned gold
- **Sync with Notion** for seamless task management across platforms
- **Integrate Google Calendar** for time-based task organization
- **Track progress** through detailed dashboards and statistics
- **Recycle tasks** instead of deleting them for better task management
- **Create custom skills** tailored to your personal development goals
- **Recategorize tasks** - Manually adjust skill tags for selected tasks with sequential processing

### Key Differentiators

- **Constellation-themed skills system** with 9 default skills
- **✨ NEW: Custom Skills System** - Create unlimited personalized skills with AI categorization
- **✨ NEW: Recategorize Feature** - Manually adjust skill tags on selected tasks with sequential modal workflow
- **✨ NEW: Automatic AI Categorization** - New tasks automatically get skill tags via background AI processing
- **✨ NEW: Transparent Gold Formula** - Fair, modular calculation: Base × TimeWeight × (1 + PriorityBonus)
- **Dual-view support** (Grid/List) for different user preferences
- **Batch operations** for managing multiple tasks efficiently
- **Smart filtering** (Apple, Business, Quick Tasks, Routines, etc.)
- **Notion bi-directional sync** (create, update, delete tasks)
- **Google Calendar integration** for scheduling
- **Emoji-based shop system** with nature and celestial themes
- **AI-powered task categorization** using OpenAI with your custom skills
- **✨ NEW: Automatic AI Categorization** - Tasks automatically categorized with skills when created
- **✨ NEW: Modular Gold Calculation** - Transparent, fair formula: Base × TimeWeight × (1 + PriorityBonus)
- **Comprehensive test suite** covering all major features

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │  Tasks   │  │  Skills  │  │  Shop   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│         │              │              │           │      │
│         └──────────────┴──────────────┴───────────┘      │
│                        │                                 │
│                  TanStack Query                          │
│                        │                                 │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────┼─────────────────────────────────┐
│                Express.js Server                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Route Handlers                       │   │
│  │  /api/tasks  /api/shop  /api/skills  /api/auth  │   │
│  └──────────────────────────────────────────────────┘   │
│         │              │              │                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ Storage  │   │  Notion  │   │  Google  │            │
│  │  Layer   │   │   API    │   │ Calendar │            │
│  └──────────┘   └──────────┘   └──────────┘            │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
┌─────────┼────────────────────────────────────────────────┐
│   PostgreSQL (Neon)                                      │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ │
│  │Users │ │Tasks │ │ Skills │ │ Progress │ │  Shop   │ │
│  └──────┘ └──────┘ └────────┘ └──────────┘ └─────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Request Flow Example

1. **User completes a task**
   - Frontend: Click "Complete" button → Triggers mutation
   - TanStack Query: Sends POST request to `/api/tasks/:id/complete`
   - Express: Route handler validates session → Calls storage layer
   - Storage: Updates task in DB → Updates user progress → Returns data
   - TanStack Query: Invalidates cache → Refetches tasks and progress
   - Frontend: UI updates with new gold total and task status

### Project Structure
```
ProductivityQuest/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/       # shadcn/ui components
│   │   │   ├── task-card.tsx
│   │   │   ├── completion-animation.tsx
│   │   │   └── ...
│   │   ├── pages/         # Page components (routes)
│   │   │   ├── dashboard.tsx
│   │   │   ├── home.tsx  # Tasks page
│   │   │   ├── skills.tsx
│   │   │   ├── shop.tsx
│   │   │   └── ...
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── App.tsx        # Main app component
│   └── index.html
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route handlers (1267 lines)
│   ├── storage.ts        # Database operations layer
│   ├── db.ts              # Drizzle ORM configuration
│   ├── auth.ts           # Authentication middleware
│   ├── notion.ts         # Notion API integration
│   └── google-calendar.ts # Google Calendar integration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schemas (Drizzle + Zod)
├── test-suite.js         # Comprehensive test suite
├── TESTING.md            # Testing documentation
└── components.json       # shadcn/ui configuration
```

---

## �️ Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **Wouter 3.3.5** - Lightweight routing
- **TanStack Query 5.60.5** - Server state management
- **Tailwind CSS 3.4.17** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Framer Motion 11.13.1** - Animations
- **Recharts 2.15.2** - Data visualization (spider charts)
- **date-fns 3.6.0** - Date manipulation
- **Zod 3.24.2** - Schema validation

### Backend
- **Node.js** - Runtime environment
- **Express 4.21.2** - Web framework
- **TypeScript 5.6.3** - Type safety
- **Drizzle ORM 0.39.1** - Database ORM
- **PostgreSQL** (Neon) - Primary database
- **express-session 1.18.1** - Session management
- **bcryptjs 3.0.3** - Password hashing
- **Notion SDK 4.0.1** - Notion API integration
- **Google APIs 153.0.0** - Calendar integration
- **nanoid 5.1.5** - Unique ID generation
- **dotenv 17.2.3** - Environment configuration

### Development Tools
- **tsx 4.19.1** - TypeScript execution for dev
- **esbuild 0.25.0** - Fast bundling
- **drizzle-kit 0.30.4** - Database migrations
- **Capacitor 7.4.4** - Mobile app framework (iOS)

---

## 💾 Database Schema

### Tables Overview

#### `users` - Core Authentication & Profile
```typescript
{
  id: varchar (PK)              // Unique user identifier (nanoid)
  username: varchar (unique)    // Login username
  email: varchar (unique)       // User email
  passwordHash: varchar         // bcrypt hashed password
  firstName: varchar            // User's first name
  lastName: varchar             // User's last name
  profileImageUrl: varchar      // Profile picture URL
  notionApiKey: text            // Notion integration token
  notionDatabaseId: text        // Connected Notion database ID
  googleAccessToken: text       // Google OAuth access token
  googleRefreshToken: text      // Google OAuth refresh token
  googleTokenExpiry: timestamp  // Token expiration time
  createdAt: timestamp          // Account creation date
  updatedAt: timestamp          // Last update timestamp
}
```

**Key Features:**
- Supports both username and email login
- Stores encrypted OAuth tokens for integrations
- Tracks account lifecycle with timestamps

#### `tasks` - Task Records with Rich Metadata
```typescript
{
  id: serial (PK)                    // Auto-increment task ID
  userId: varchar (FK → users.id)   // Task owner
  notionId: text                     // Linked Notion page ID
  title: text (required)             // Task name
  description: text                  // Short description
  details: text                      // Extended details/notes
  duration: integer (required)       // Task duration in minutes
  goldValue: integer (required)      // Gold reward for completion
  dueDate: timestamp                 // When task is due
  completed: boolean                 // Completion status (default: false)
  completedAt: timestamp             // Completion timestamp
  createdAt: timestamp               // Creation timestamp
  importance: text                   // "Low", "Med-Low", "Medium", "Med-High", "High", "Pareto"
  kanbanStage: text                  // Workflow stage
  recurType: text                    // Recurrence pattern
  businessWorkFilter: text           // "Apple", "Vi", "General", "SP", "Vel", "CG"
  apple: boolean                     // Apple-related flag (default: false)
  smartPrep: boolean                 // Smart prep flag (default: false)
  delegationTask: boolean            // Delegation flag (default: false)
  velin: boolean                     // Velin flag (default: false)
  recycled: boolean                  // Soft delete flag (default: false)
  recycledAt: timestamp              // Deletion timestamp
  recycledReason: text               // "completed" or "deleted"
}
```

**Key Features:**
- **Soft delete** via `recycled` flag preserves data
- **Rich filtering** options (apple, smartPrep, velin, businessWorkFilter)
- **Notion sync** via `notionId` for bi-directional integration
- **Gold rewards** automatically calculated from duration
- **Flexible metadata** for complex categorization needs

#### `userProgress` - Aggregate Statistics
```typescript
{
  id: serial (PK)                    // Progress record ID
  userId: varchar (FK → users.id)   // User reference
  goldTotal: integer (default: 0)    // Total gold earned
  tasksCompleted: integer (default: 0) // Total tasks completed
  goldSpent: integer (default: 0)    // Gold spent in shop
  lastSyncedAt: timestamp            // Last Notion sync time
}
```

**Key Features:**
- Single row per user (upserted on updates)
- Real-time gold balance = goldTotal - goldSpent
- Task completion tracking for statistics
- Sync status monitoring

#### `userSkills` - Individual Skill Progression
```typescript
{
  id: serial (PK)                       // Skill record ID
  userId: varchar (FK → users.id)      // User reference
  skillName: varchar (required)         // Skill identifier
  skillIcon: text                       // ✨ Custom icon name (Lucide icon)
  skillDescription: text                // ✨ Description for AI categorization
  skillMilestones: jsonb                // ✨ Array of milestone strings
  isCustom: boolean (default: false)    // ✨ Custom vs default skill
  level: integer (default: 1)           // Current skill level
  xp: integer (default: 0)              // Current XP points
  maxXp: integer (default: 100)         // XP needed for next level
  createdAt: timestamp                  // Skill creation time
  updatedAt: timestamp                  // Last update time
}
```

**Default Skills** (9 total):
1. **Craftsman** 🔧 - Building and creating physical objects
2. **Artist** 🎨 - Creative expression and artistic work
3. **Mindset** 🧪 - Mental transformation and positive mindset
4. **Merchant** 💼 - Business acumen and wealth building
5. **Physical** ⚔️ - Martial arts, strength, firearms, cardio
6. **Scholar** 📚 - Academic knowledge and continuous learning
7. **Health** 💊 - Physical and biological wellness
8. **Connector** 🔗 - Networking and building relationships
9. **Charisma** 👥 - Charm, connection, and social influence

**✨ NEW: Custom Skills System**
- **Unlimited custom skills** per user
- **20 icon options** (Brain, Wrench, Palette, Star, Heart, Trophy, etc.)
- **AI categorization** uses custom skill descriptions
- **Visual indicators** - purple badges, delete buttons, custom colors
- **Dynamic spider chart** - renders all user skills
- **Complete user isolation** - custom skills are private
- See [CUSTOM_SKILLS.md](CUSTOM_SKILLS.md) for full documentation

#### `shopItems` - Purchasable Items
```typescript
{
  id: serial (PK)                    // Item ID
  userId: varchar (FK → users.id)   // null = global, otherwise user-specific
  name: text (required)              // Item name
  description: text (required)       // Item description
  cost: integer (required)           // Gold price
  icon: text (required)              // Emoji icon
  category: text (default: general)  // Item category
  isGlobal: boolean (default: false) // Available to all users
  createdAt: timestamp               // Item creation time
}
```

**Default Categories:**
- `general` - General items (🎮🎬📺🎧)
- `nature` - Nature-themed (🌲🌸🏔️🌊🌅)
- `celestial` - Space/sky items (⭐🌙🌈✨)
- `food` - Food items (🍕🍔🍜)
- `luxury` - High-end items (💎👑🏰)

**Default Shop Items** (26 total):
- Video Game Session (150g) 🎮
- Movie Night (120g) 🎬
- Binge TV Series (200g) 📺
- Music Streaming Day (80g) 🎧
- Pizza Night (100g) 🍕
- Fancy Coffee (50g) ☕
- Chocolate Bar (30g) 🍫
- Ice Cream (60g) 🍦
- Pine Tree (150g) 🌲
- Cherry Blossom (200g) 🌸
- Mountain Peak (300g) 🏔️
- Ocean Wave (250g) 🌊
- Golden Sunset (350g) 🌅
- Evergreen Forest (180g) 🌳
- Butterfly Garden (160g) 🦋
- Crescent Moon (220g) 🌙
- Rainbow Arc (280g) 🌈
- Fern Leaf (110g) 🌿
- Hibiscus Flower (190g) 🌺
- Desert Cactus (140g) 🌵
- Autumn Leaves (130g) 🍂
- Tropical Island (320g) 🏝️
- Starlight (240g) ⭐
- Northern Lights (400g) 🌌
- Cosmic Nebula (380g) 🌠
- Solar Flare (290g) ☀️

#### `purchases` - Transaction History
```typescript
{
  id: serial (PK)                        // Purchase ID
  userId: varchar (FK → users.id)       // Buyer
  shopItemId: integer (FK → shopItems.id) // Item purchased
  cost: integer (required)               // Price paid
  purchasedAt: timestamp                 // Purchase time
}
```

#### `inventory` - User's Owned Items
```typescript
{
  id: serial (PK)                        // Inventory slot ID
  userId: varchar (FK → users.id)       // Item owner
  shopItemId: integer (FK → shopItems.id) // Item type
  quantity: integer (default: 1)         // Number owned
  addedAt: timestamp                     // First acquisition
}
```

**Key Features:**
- Stackable items (quantity tracking)
- Consumption decrements quantity
- Purchase history preserved separately

#### `sessions` - Express Session Storage
```typescript
{
  sid: varchar (PK)        // Session ID
  sess: jsonb (required)   // Session data (serialized)
  expire: timestamp        // Session expiration
}
```

**Key Features:**
- Indexed on `expire` for efficient cleanup
- Stores serialized session data (userId, timestamps)
- Automatic expiration via connect-pg-simple

---
- Shows search results count and active search terms
- Provides clear action when no results found

### 6. External Integrations

#### Notion Integration
**Files**: `server/notion.ts`, `server/routes.ts`

- **Database Schema**: Works with user's existing Notion database
- **Required Fields**: Task, Details, Due, Min to Complete, Importance, Kanban - Stage
- **Optional Fields**: Life Domain, Recur Type, checkbox fields (Apple, SmartPrep, etc.)
- **Bidirectional Sync**: Import from Notion, export completions back

**Notion Setup Process**:
1. Create integration at https://www.notion.so/my-integrations
2. Share target page with integration
3. Set `NOTION_INTEGRATION_SECRET` and `NOTION_PAGE_URL`

#### Google Calendar Integration
**Files**: `server/google-calendar.ts`, `client/src/components/calendar-sync-modal.tsx`

- **OAuth 2.0 Authentication**: User-based authentication with Google Calendar
- **Event Creation**: Creates calendar events for tasks with rich details
- **Time Blocking**: Schedules tasks based on duration and importance
- **Smart Reminders**: 15-minute popup and 1-hour email reminders
- **Color Coding**: Events colored by importance level
- **Selective Sync**: Only syncs selected tasks instead of all tasks

**Google Calendar Setup Process**:
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set authorized redirect URIs including your domain
3. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
4. Users authenticate through OAuth flow in settings

## 📊 Data Models & Schemas

### Task Schema
```typescript
interface Task {
  id: number;
  notionId: string;
  title: string;
  description: string | null;
  duration: number;              // minutes
  goldValue: number;             // calculated reward
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  
  // Notion fields
  importance: ImportanceLevel;
  kanbanStage: string;
  recurType: string;
  apple: boolean;
  smartPrep: boolean;
  delegationTask: boolean;
  velin: boolean;
  
  // Recycling fields
  recycled: boolean;
  recycledAt: Date | null;
  recycledReason: "completed" | "deleted" | null;
  
  // Timestamps
  createdAt: Date;
}
```

### User Progress Schema
```typescript
interface UserProgress {
  id: number;
  goldTotal: number;
  tasksCompleted: number;
  goldSpent: number;
}
```

### Shop Item Schema
```typescript
interface ShopItem {
  id: number;
  name: string;
  description: string;
  cost: number;
  category: "entertainment" | "food" | "wellness" | "experience";
  icon: string;
}
```

## 🔄 API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user info
- `GET /api/login` - Initiate login process
- `POST /api/logout` - Logout current user

### Task Management
- `GET /api/tasks` - Get all active tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Move task to recycling
- `PATCH /api/tasks/:id/complete` - Complete task and award gold

### Recycling System
- `GET /api/recycled-tasks` - Get all recycled tasks
- `POST /api/tasks/:id/restore` - Restore task from recycling
- `DELETE /api/tasks/:id/permanent` - Permanently delete task

### Notion Integration
- `GET /api/notion/count` - Get count of tasks in Notion
- `POST /api/notion/import` - Import all tasks from Notion
- `POST /api/notion/export` - Export selected tasks to Notion
- `GET /api/notion/test` - Test Notion connection

### Google Calendar Integration
- `GET /api/google/auth` - Get OAuth authorization URL
- `GET /api/google/callback` - Handle OAuth callback
- `POST /api/google/sync` - Sync selected tasks to calendar
- `GET /api/google/test` - Test Google Calendar connection
- `POST /api/google/disconnect` - Disconnect Google Calendar

### Settings
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Shop & Progress
- `GET /api/shop/items` - Get all shop items
- `POST /api/shop/purchase` - Purchase item with gold
- `GET /api/progress` - Get user progress stats
- `GET /api/stats` - Get daily/weekly statistics

### ✨ Custom Skills (NEW)
- `POST /api/skills/custom` - Create custom skill
- `DELETE /api/skills/:id` - Delete custom skill
- `GET /api/skills` - Get all user skills (default + custom)
- See [CUSTOM_SKILLS.md](CUSTOM_SKILLS.md) for detailed API documentation
- See [CUSTOM_SKILLS_TEST_CASES.md](CUSTOM_SKILLS_TEST_CASES.md) for 55 test cases

### ✨ Task Recategorization (NEW)
- `POST /api/tasks/categorize-feedback` - Manually adjust skill tags for tasks
- **Sequential Processing**: Select multiple tasks and recategorize them one by one
- **Task Counter**: Modal shows "Task X of Y" when processing multiple tasks
- **Queue Management**: Automatic cleanup when modal closes or all tasks processed
- See [RECATEGORIZE_TEST_CASES.md](RECATEGORIZE_TEST_CASES.md) for 25 comprehensive test cases

### ✨ Automatic AI Categorization (NEW)
- **Background Processing**: Tasks auto-categorized with skills when created
- **Non-blocking**: Categorization runs asynchronously (doesn't slow task creation)
- **Training-based**: Uses up to 50 approved categorizations per user
- **Custom Skills Support**: Works with both default and custom skills
- **Graceful Fallback**: Task creation succeeds even if AI fails
- See [AUTO_CLASSIFICATION_TEST_CASES.md](AUTO_CLASSIFICATION_TEST_CASES.md) for 20 comprehensive test cases

### ✨ Modular Gold Calculation (NEW)
- **Formula**: `Gold = Base × TimeWeight × (1 + PriorityBonus)`
- **Components**:
  - Base: 10 (configurable constant)
  - Time Weight: duration ÷ 20 (scales with time investment)
  - Priority Bonus: 0% (Low) to 15% (Pareto)
- **Auto-calculated**: No manual gold input needed
- **Transparent**: Users see exact calculation
- **Fair & Balanced**: Time is primary factor, priority is small bonus
- **Modular Design**: Easy to tweak constants in `server/goldCalculation.ts`
- **Examples**:
  - 30 min, Medium: 10 × 1.5 × 1.05 = 16 gold
  - 60 min, High: 10 × 3.0 × 1.10 = 33 gold
  - 120 min, Pareto: 10 × 6.0 × 1.15 = 69 gold
- See [GOLD_CALCULATION_TEST_CASES.md](GOLD_CALCULATION_TEST_CASES.md) for 25 comprehensive test cases

## 💰 Gold Calculation System

ProductivityQuest uses a transparent, modular formula to calculate gold rewards for completed tasks. The formula ensures fair and balanced rewards based on time investment and task importance.

### Formula

```
Gold = Base × TimeWeight × (1 + PriorityBonus)
```

### Components

#### Base Value
- **Constant:** 10
- **Purpose:** Starting point for all calculations
- **Configuration:** `GOLD_BASE` in `server/goldCalculation.ts`

#### Time Weight
- **Formula:** `duration ÷ 20`
- **Purpose:** Scales reward with time investment
- **Configuration:** `TIME_DIVISOR` in `server/goldCalculation.ts`
- **Examples:**
  - 10 min → 0.5x
  - 30 min → 1.5x
  - 60 min → 3.0x
  - 120 min → 6.0x

#### Priority Bonus
- **Purpose:** Small multiplier for important tasks
- **Tiers:**
  - **Low:** 0% (1.00x)
  - **Med-Low:** 3% (1.03x)
  - **Medium:** 5% (1.05x)
  - **Med-High:** 7% (1.07x)
  - **High:** 10% (1.10x)
  - **Pareto:** 15% (1.15x)

### Example Calculations

| Duration | Priority | Calculation | Gold |
|----------|----------|-------------|------|
| 10 min | Low | 10 × 0.5 × 1.00 | **5** 🪙 |
| 30 min | Medium | 10 × 1.5 × 1.05 | **16** 🪙 |
| 60 min | High | 10 × 3.0 × 1.10 | **33** 🪙 |
| 90 min | Med-High | 10 × 4.5 × 1.07 | **48** 🪙 |
| 120 min | Pareto | 10 × 6.0 × 1.15 | **69** 🪙 |
| 180 min | High | 10 × 9.0 × 1.10 | **99** 🪙 |

### Implementation

**Server-side:** `/server/goldCalculation.ts`
```typescript
export const GOLD_BASE = 10;
export const TIME_DIVISOR = 20;
export const PRIORITY_BONUSES = {
  Low: 0,
  "Med-Low": 0.03,
  Medium: 0.05,
  "Med-High": 0.07,
  High: 0.10,
  Pareto: 0.15,
};

export function calculateGoldValue(
  duration: number,
  importance: string
): number {
  const timeWeight = duration / TIME_DIVISOR;
  const priorityBonus = PRIORITY_BONUSES[importance] || 0;
  return Math.round(GOLD_BASE * timeWeight * (1 + priorityBonus));
}
```

**Client-side:** `/client/src/lib/goldCalculation.ts`
- Identical formula for consistent preview in UI
- Auto-calculates as user adjusts duration/importance
- Read-only field in AddTaskModal

### Design Philosophy

1. **Time is Primary Factor:** Duration has the largest impact on gold value
2. **Priority is Bonus:** Importance adds 0-15% multiplier (small but meaningful)
3. **Transparent:** Users see exact calculation and reasoning
4. **Fair:** Longer tasks = more gold, regardless of priority
5. **Modular:** Easy to adjust constants without changing formula
6. **Consistent:** Same calculation on client and server

### Benefits

- **No Manual Input:** Gold auto-calculated, preventing abuse
- **Predictable:** Users know exactly what they'll earn
- **Balanced:** Encourages both quick wins and deep work
- **Configurable:** Constants can be tweaked based on feedback
- **Clear UX:** "(Auto-calculated)" label educates users

### Testing

See [GOLD_CALCULATION_TEST_CASES.md](GOLD_CALCULATION_TEST_CASES.md) for:
- 8 basic calculation tests
- 6 edge case tests
- 5 UI integration tests
- 6 validation tests
- **Total:** 25 comprehensive test cases

---

## 🤖 AI Categorization

ProductivityQuest uses OpenAI's GPT-4 to automatically categorize tasks with relevant skill tags. This feature runs in two modes: manual (user-triggered) and automatic (background processing).

### Automatic Categorization (NEW)

When users create a new task, the AI automatically categorizes it in the background without blocking task creation.

**How It Works:**
1. User creates task in AddTaskModal
2. Task is immediately saved to database and returned to user (< 500ms)
3. Background async process triggers AI categorization
4. System fetches user's skills (default + custom)
5. Loads up to 50 training examples (approved categorizations)
6. Calls `categorizeTaskWithAI()` with task title and details
7. Updates task with skillTags if categorization succeeds
8. User sees skills appear automatically (1-3 seconds)

**Key Features:**
- **Non-blocking:** Doesn't slow down task creation
- **Training-based:** Uses user's approved categorizations
- **Custom Skills Support:** Works with both default and custom skills
- **Graceful Fallback:** Task creation succeeds even if AI fails
- **Silent Operation:** Categorization happens transparently

**Implementation:**
```typescript
// server/routes.ts - POST /api/tasks
router.post("/api/tasks", async (req, res) => {
  // Create task immediately
  const newTask = await storage.createTask(userId, taskData);
  
  // Return task to user right away
  res.json(newTask);
  
  // Background categorization (async, non-blocking)
  (async () => {
    try {
      const userSkills = await storage.getUserSkills(userId);
      const trainingTasks = await storage.getTrainingExamples(userId, 50);
      
      const categorization = await categorizeTaskWithAI(
        title,
        details,
        userSkills,
        trainingTasks
      );
      
      if (categorization.skillTags?.length > 0) {
        await storage.updateTask(newTask.id, {
          skillTags: categorization.skillTags
        });
        console.log(`✓ Auto-categorized task ${newTask.id}`);
      }
    } catch (error) {
      console.error("Auto-categorization failed:", error);
      // Task already created, failure is non-critical
    }
  })();
});
```

### Manual Categorization

Users can manually categorize tasks using the "Categorize" button:

**Single Task:**
1. Select task
2. Click "Categorize" button
3. AI analyzes task and suggests skills
4. User reviews and approves/adjusts
5. Skills added to task

**Batch Categorization (Recategorize):**
1. Select multiple tasks
2. Click "Recategorize" button
3. Modal processes tasks sequentially
4. Shows "Task X of Y" counter
5. User reviews each categorization
6. Automatic queue management

### AI Model & Training

**Model:** GPT-4 (via OpenAI API)

**Training Data:**
- Up to 50 recent approved categorizations per user
- Includes task title, details, and skill tags
- User-specific learning (private to each user)
- Improves accuracy over time

**Categorization Logic:**
```typescript
// server/openai-service.ts
export async function categorizeTaskWithAI(
  title: string,
  details: string,
  userSkills: Skill[],
  trainingExamples: Task[]
) {
  const prompt = `
    Categorize this task:
    Title: ${title}
    Details: ${details}
    
    Available skills: ${userSkills.map(s => s.skillName).join(", ")}
    
    Training examples:
    ${trainingExamples.map(t => 
      `"${t.title}" → [${t.skillTags?.join(", ")}]`
    ).join("\n")}
    
    Return JSON: { skillTags: string[], reasoning: string }
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Custom Skills Integration

The AI automatically recognizes custom skills:
- Reads `skillDescription` field for context
- Understands skill icon and milestones
- Categorizes based on custom skill definitions
- No retraining required

**Example:**
```typescript
{
  skillName: "DevOps",
  skillDescription: "Infrastructure, CI/CD, containerization, cloud deployment",
  skillIcon: "server",
  isCustom: true
}
```

Task: "Deploy Docker container to AWS"
→ AI categorizes with ["DevOps", "Craftsman"]

### Benefits

- **Seamless UX:** No extra step for users
- **Improved Accuracy:** Learns from user's patterns
- **Time Savings:** Automatic categorization for all tasks
- **Consistent:** Always uses latest skills and training
- **Flexible:** Works with default and custom skills

### Error Handling

**If AI Fails:**
- Task creation still succeeds
- No error shown to user
- Logs error for debugging
- User can manually categorize later

**Common Failures:**
- OpenAI API unavailable
- Invalid API key
- Rate limiting
- Malformed response

**Graceful Degradation:**
- Background process catches errors
- Task remains uncategorized (empty skillTags)
- User can use "Categorize" button manually
- No data loss or blocking issues

### Testing

See [AUTO_CLASSIFICATION_TEST_CASES.md](AUTO_CLASSIFICATION_TEST_CASES.md) for:
- 8 core functionality tests
- 5 AI accuracy tests
- 5 edge case tests
- 2 integration tests
- **Total:** 20 comprehensive test cases

---

## 🎨 UI Components & Styling

### Component Architecture
- **Radix UI**: Headless, accessible components
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Key UI Components
- `TaskCard`: Individual task display with actions
- `AddTaskModal`: Comprehensive task creation form with 15+ fields and validation
- `SkillAdjustmentModal`: Modal for adjusting skill tags (used by AI Categorize and Recategorize features)
- `ItemShopModal`: Shopping interface for gold spending
- `RecyclingModal`: Tabbed interface for recycled tasks
- `CompletionAnimation`: Celebratory animation for completions
- `CalendarSyncModal`: Google Calendar integration interface

## 🔍 Debugging & Testing

### Debug Tool
The project includes a comprehensive debug tool (`debug-tool.js`) that tests all major functionality:

**Usage:**
```bash
# Run all tests
node debug-tool.js

# Test specific component
node debug-tool.js server      # Server connectivity
node debug-tool.js auth        # Authentication system
node debug-tool.js tasks       # Task management
node debug-tool.js search      # Search functionality
node debug-tool.js recycling   # Recycling system
node debug-tool.js shop        # Shop system
node debug-tool.js notion      # Notion integration
node debug-tool.js google      # Google Calendar integration
node debug-tool.js stats       # Progress tracking
```

**Features:**
- Color-coded output with pass/fail indicators
- Detailed error reporting and failure analysis
- Authentication detection and session handling
- Comprehensive API endpoint testing
- External integration validation
- Performance metrics and success rates

**Test Coverage:**
- ✅ Server connectivity and health checks
- ✅ OAuth authentication flows
- ✅ Task CRUD operations and validation
- ✅ Gold calculation and reward system
- ✅ Recycling system (soft delete/restore)
- ✅ Shop purchasing and gold spending
- ✅ Search and filtering functionality
- ✅ Notion API integration and sync
- ✅ Google Calendar OAuth and sync
- ✅ Progress tracking and statistics

### Common Issues & Solutions

**Authentication Issues:**
- If debug tool shows "Authentication required", open the app in browser first
- Check that OAuth is properly configured in environment variables
- Verify session cookies are being set correctly

**Database Connection:**
- PostgreSQL connection uses `DATABASE_URL` environment variable
- Falls back to in-memory storage if database unavailable
- Use `npm run db:push` to sync schema changes

**API Integration Issues:**
- Notion: Verify `NOTION_INTEGRATION_SECRET` and database permissions
- Google: Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Google OAuth Setup**: Add current Replit domain to Google Cloud Console OAuth redirect URIs
- Use individual test commands to isolate integration issues

**Google OAuth Configuration:**
When running on Replit, the OAuth redirect URI automatically uses your Replit domain (e.g., `https://your-repl-domain.replit.dev/api/google/callback`). You must add this URL to your Google Cloud Console OAuth application's authorized redirect URIs:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Select your OAuth 2.0 client ID
3. Add the redirect URI shown in server logs to "Authorized redirect URIs"
4. The exact URI format: `https://[your-repl-domain]/api/google/callback`

**Performance Monitoring:**
- Server logs show response times for all API calls
- Debug tool provides success rate metrics
- Use browser dev tools to monitor frontend performance
- `SearchBar`: Real-time keyword search with clear button and results counter

### Responsive Design
- Mobile-first approach
- Collapsible sidebar navigation
- Responsive grid layouts
- Touch-friendly interactions

## 🧪 Testing & Debugging

### Test Documentation
- **ADD_TASK_MODAL_TEST_CASES.md** - 60 test cases for task creation feature
- **CUSTOM_SKILLS_TEST_CASES.md** - 55 test cases for custom skills system
- **RECATEGORIZE_TEST_CASES.md** - 25 test cases for task recategorization feature
- **AUTO_CLASSIFICATION_TEST_CASES.md** - 20 test cases for automatic AI categorization
- **GOLD_CALCULATION_TEST_CASES.md** - 25 test cases for modular gold formula
- **TESTING.md** - Comprehensive testing documentation

### Debug Tools
- **Debug Script**: `npm run debug` - Comprehensive functionality testing
- **Search Testing**: `node test-search.js` - Standalone search logic validation
- **Integrated Search Testing**: `node debug-tool.js search` - Test search with live server
- **Console Logging**: Server-side logging for key operations
- **Error Handling**: Structured error responses with proper HTTP codes

### Search Usage Examples
```javascript
// Frontend search implementation
const searchTasks = (tasks, query) => {
  if (!query.trim()) return tasks;
  
  const searchQuery = query.toLowerCase();
  return tasks.filter(task => {
    const titleMatch = task.title?.toLowerCase().includes(searchQuery);
    const descriptionMatch = task.description?.toLowerCase().includes(searchQuery);
    const categoryMatch = task.category?.toLowerCase().includes(searchQuery);
    const importanceMatch = task.importance?.toLowerCase().includes(searchQuery);
    return titleMatch || descriptionMatch || categoryMatch || importanceMatch;
  });
};

// Search examples:
searchTasks(tasks, "project");      // Find tasks with "project" in title/description
searchTasks(tasks, "high");         // Find tasks with high importance
searchTasks(tasks, "exercise");     // Find exercise-related tasks
searchTasks(tasks, "");             // Returns all tasks (empty search)
```

### Common Issues & Solutions

1. **Notion Integration Fails**
   - Check integration permissions
   - Verify page sharing with integration
   - Ensure database fields match expected schema

2. **Tasks Not Recycling**
   - Check `recycled` field in database
   - Verify storage filter logic in `getTasks()`
   - Confirm `recycleTask()` method execution

3. **Gold Calculation Incorrect**
   - Verify importance multipliers
   - Check duration parsing
   - Confirm base gold calculation (duration / 10)

4. **Calendar Sync Issues**
   - Validate Google service account credentials
   - Check calendar permissions
   - Ensure proper date/time formatting

## 🔒 Security & Environment

### Required Environment Variables
```bash
# Notion Integration
NOTION_INTEGRATION_SECRET=secret_abc123...
NOTION_PAGE_URL=https://www.notion.so/your-page-id

# Google Calendar OAuth (optional)
GOOGLE_CLIENT_ID=32247087981-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Database (optional - uses in-memory storage if not provided)
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Security Considerations
- Environment variables for sensitive data
- Input validation with Zod schemas
- SQL injection prevention with parameterized queries
- CORS configuration for API access

## 🚀 Deployment

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Apply database migrations
```

### Production
- Backend serves both API and static frontend
- Built files served from `dist/public`
- PostgreSQL database connection via `DATABASE_URL`
- Process manager recommended (PM2, etc.)

## 📈 Future Enhancements

### Planned Features
- Advanced analytics and reporting dashboard
- Mobile app with React Native
- Team collaboration features
- Advanced recurring task patterns
- Custom reward categories and achievements
- AI-powered task prioritization
- Integration with more productivity tools (Todoist, Trello, etc.)
- Time tracking and productivity insights

### Technical Improvements
- Database migrations with proper versioning
- Comprehensive test suite
- Performance monitoring
- Caching layer for frequently accessed data
- Real-time updates with WebSocket integration

## 🤝 Contributing

### Development Workflow
1. Feature branches from `main`
2. Comprehensive testing before merge
3. Update documentation for new features
4. Follow TypeScript strict mode
5. Use ESLint and Prettier for code formatting

### Code Style
- TypeScript strict mode enabled
- Consistent naming conventions
- Comprehensive error handling
- Clear component interfaces
- Proper type definitions

---

## 📝 Notes for AI Copilots

### Key Architectural Decisions
1. **In-memory Storage**: Default for development, easily switchable to PostgreSQL
2. **Monorepo Structure**: Shared types between frontend/backend
3. **API-First Design**: Clear separation of concerns
4. **Reactive UI**: TanStack Query for efficient state management
5. **Notion Integration**: Works with existing user databases, not creating new ones

### Critical Integration Points
- Task completion triggers gold calculation AND recycling
- Notion sync is bidirectional - imports new tasks, exports completions
- Recycling system prevents data loss while maintaining clean UI
- Gold calculation uses importance multipliers consistently across features

### Common Maintenance Tasks
- Update Notion field mappings when user schema changes
- Adjust gold calculation multipliers based on user feedback
- Add new shop items and categories
- Extend recycling system for additional entity types
- Optimize database queries for better performance

This codebase prioritizes user experience with gamification while maintaining robust data integrity and seamless external integrations.