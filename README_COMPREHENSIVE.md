# ProductivityQuest 🎮⚔️

> *Transform your productivity journey into an epic RPG adventure*

A full-stack gamified task management application that combines task tracking with RPG elements. Complete tasks to earn gold, level up 9 unique skills, purchase rewards, and sync seamlessly with Notion and Google Calendar.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Architecture](#%EF%B8%8F-architecture)
- [Database Schema](#-database-schema)
- [Backend Deep Dive](#-backend-deep-dive)
- [Frontend Deep Dive](#-frontend-deep-dive)
- [API Documentation](#-api-documentation)
- [UI Components & Styling](#-ui-components--styling)
- [Skills System](#-skills-system)
- [Setup & Installation](#-setup--installation)
- [Testing](#-testing)
- [Features](#-features)
- [Deployment](#-deployment)

---

## 🎮 Overview

ProductivityQuest transforms mundane task management into an engaging game-like experience where every completed task contributes to your character's growth.

### Core Concept

**Task → Gold → Rewards → Skills → Progress**

1. **Create Tasks** - Add tasks manually or sync from Notion
2. **Complete Tasks** - Earn gold based on duration and importance
3. **Purchase Rewards** - Spend gold in the shop (26+ items)
4. **Level Skills** - Progress through 9 distinct skill paths
5. **Track Progress** - View stats through a spider chart dashboard

### Key Features

✅ **Task Management**
- Create, edit, delete tasks with rich metadata
- Soft delete via recycling system
- Batch operations (complete/delete multiple)
- Advanced filtering (due date, importance, life domain, custom flags)
- Real-time search across all task fields

✅ **Gamification**
- Gold rewards calculated from task duration × importance
- 9 constellation-themed skills with levels and XP
- Shop system with 26+ purchasable items
- Inventory management with consumption tracking
- Completion animations and visual feedback

✅ **External Integrations**
- **Notion**: Bi-directional sync with existing databases
- **Google Calendar**: OAuth2 integration with event creation
- Task import/export between platforms

✅ **UI/UX**
- Dark fantasy theme with constellation aesthetics
- Responsive design (desktop + mobile)
- Grid and List view modes
- Spider/radar chart for skill visualization
- Toast notifications for all actions

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.6.3 | Type safety |
| **Vite** | 5.4.19 | Build tool, dev server |
| **Wouter** | 3.3.5 | Lightweight routing (5x smaller than React Router) |
| **TanStack Query** | 5.60.5 | Server state management, caching |
| **Tailwind CSS** | 3.4.17 | Utility-first styling |
| **Radix UI** | Various | Accessible component primitives |
| **Lucide React** | 0.453.0 | Icon library (1000+ icons) |
| **Framer Motion** | 11.13.1 | Animation library |
| **Recharts** | 2.15.2 | Data visualization (spider charts) |
| **date-fns** | 3.6.0 | Date manipulation |
| **Zod** | 3.24.2 | Schema validation |
| **React Hook Form** | 7.55.0 | Form management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime environment |
| **Express** | 4.21.2 | Web framework |
| **TypeScript** | 5.6.3 | Type safety |
| **Drizzle ORM** | 0.39.1 | Database ORM with TypeScript-first API |
| **PostgreSQL** | Latest | Primary database (via Neon) |
| **express-session** | 1.18.1 | Session management |
| **connect-pg-simple** | 10.0.0 | PostgreSQL session store |
| **bcryptjs** | 3.0.3 | Password hashing |
| **Notion SDK** | 4.0.1 | Notion API client |
| **Google APIs** | 153.0.0 | Calendar integration |
| **nanoid** | 5.1.5 | Unique ID generation |
| **dotenv** | 17.2.3 | Environment variables |

### Development Tools

- **tsx** - TypeScript execution for development
- **esbuild** - Fast JavaScript bundler
- **drizzle-kit** - Database migrations and introspection
- **Capacitor** - Mobile app framework (iOS support)

---

## 🏗️ Architecture

### High-Level Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Dashboard │  │  Tasks   │  │  Skills  │  │   Shop   │      │
│  │ (Stats)  │  │ (CRUD)   │  │ (Levels) │  │ (Rewards)│      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │               │             │            │
│       └─────────────┴───────────────┴─────────────┘            │
│                           │                                    │
│                   TanStack Query                               │
│                  (Cache & State Mgmt)                          │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │ REST API (HTTP/JSON)
┌───────────────────────────┼────────────────────────────────────┐
│                    SERVER (Express.js)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Route Handlers (routes.ts)               │ │
│  │  /api/auth  /api/tasks  /api/shop  /api/skills  /api/... │ │
│  └──┬───────────────┬────────────────┬──────────────┬────────┘ │
│     │               │                │              │           │
│  ┌──┴───────┐  ┌───┴────────┐  ┌───┴────────┐  ┌──┴────────┐ │
│  │  Auth    │  │  Storage   │  │   Notion   │  │  Google   │ │
│  │Middleware│  │  (Drizzle) │  │    API     │  │ Calendar  │ │
│  └──────────┘  └─────┬──────┘  └────────────┘  └───────────┘ │
│                      │                                         │
└──────────────────────┼─────────────────────────────────────────┘
                       │ SQL Queries
┌──────────────────────┼─────────────────────────────────────────┐
│              PostgreSQL Database (Neon)                        │
│                                                                 │
│  ┌───────┐  ┌───────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ users │  │ tasks │  │userSkills│  │userProgress│ │ shop  │ │
│  └───────┘  └───────┘  └──────────┘  └──────────┘  └───────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ sessions │  │purchases │  │inventory │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Completing a Task

```
1. User clicks "Complete" button on task
   ↓
2. React component triggers TanStack Query mutation
   ↓
3. POST /api/tasks/:id/complete
   ↓
4. Express middleware checks session authentication
   ↓
5. Route handler calls storage.completeTask(id)
   ↓
6. Storage layer executes:
   - Update task: completed=true, completedAt=now(), recycled=true
   - Calculate gold reward (duration/10 × importance multiplier)
   - Update userProgress: goldTotal += gold, tasksCompleted += 1
   - Return updated task + progress
   ↓
7. Response sent back to client
   ↓
8. TanStack Query:
   - Invalidates /api/tasks cache
   - Invalidates /api/progress cache
   - Refetches both automatically
   ↓
9. UI updates:
   - Task disappears from main list (recycled=true)
   - Gold total increases
   - Completion animation plays
   - Toast notification appears
```

### Project Structure

```
ProductivityQuest/
├── client/                          # React frontend
│   ├── index.html                   # HTML entry point
│   └── src/
│       ├── main.tsx                 # React root, providers setup
│       ├── App.tsx                  # Router and authentication
│       ├── index.css                # Global Tailwind styles
│       ├── components/
│       │   ├── ui/                  # shadcn/ui components (40+)
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── ... (37 more)
│       │   ├── task-card.tsx        # Task display component
│       │   ├── completion-animation.tsx  # Success animations
│       │   ├── item-shop-modal.tsx  # Shop interface
│       │   ├── recycling-modal.tsx  # Recycled tasks view
│       │   ├── calendar-sync-modal.tsx # Google Calendar sync
│       │   └── tab-bar.tsx          # Mobile navigation
│       ├── pages/
│       │   ├── landing.tsx          # Unauthenticated homepage
│       │   ├── login.tsx            # Login form
│       │   ├── register.tsx         # Registration form
│       │   ├── dashboard.tsx        # Stats + spider chart
│       │   ├── home.tsx             # Main tasks page (1500+ lines)
│       │   ├── skills.tsx           # Skills view (481 lines)
│       │   ├── shop.tsx             # Item shop
│       │   ├── rewards.tsx          # Purchased items/inventory
│       │   ├── settings.tsx         # User settings
│       │   ├── notion-integration.tsx # Notion setup
│       │   ├── npcs.tsx             # Future feature
│       │   └── not-found.tsx        # 404 page
│       ├── hooks/
│       │   ├── useAuth.ts           # Authentication hook
│       │   ├── use-toast.ts         # Toast notifications
│       │   └── use-mobile.tsx       # Mobile detection
│       └── lib/
│           ├── queryClient.ts       # TanStack Query setup
│           ├── utils.ts             # Utility functions (cn, etc.)
│           └── authUtils.ts         # Auth helpers
├── server/                          # Express backend
│   ├── index.ts                     # Server entry point (middleware, routes)
│   ├── routes.ts                    # API route handlers (1267 lines)
│   ├── storage.ts                   # Database operations (Drizzle ORM)
│   ├── db.ts                        # Drizzle ORM configuration
│   ├── auth.ts                      # Authentication middleware
│   ├── notion.ts                    # Notion API integration
│   ├── google-calendar.ts           # Google Calendar OAuth & API
│   ├── vite.ts                      # Vite dev server integration
│   └── setup-notion.ts              # Notion setup utilities
├── shared/                          # Shared TypeScript types
│   ├── schema.ts                    # Database schemas (Drizzle + Zod)
│   └── notionUtils.ts               # Notion helper functions
├── test-suite.js                    # Comprehensive test suite (755 lines)
├── TESTING.md                       # Testing documentation
├── .env                             # Environment variables
├── drizzle.config.ts                # Drizzle ORM configuration
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── components.json                  # shadcn/ui configuration
├── package.json                     # Dependencies and scripts
├── NOTION_SETUP_GUIDE.md           # Notion integration guide
├── GOOGLE_OAUTH_SETUP.md           # Google OAuth setup guide
└── README.md                        # This file
```

---

## 💾 Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ username        │◄──────────────┐
│ email           │               │
│ passwordHash    │               │
│ notionApiKey    │               │
│ googleTokens    │               │
└─────────────────┘               │
                                  │
       │                          │
       │ 1:N                      │
       │                          │
       ▼                          │
┌─────────────────┐               │
│     tasks       │               │
│─────────────────│               │
│ id (PK)         │               │
│ userId (FK) ────┘               │
│ title           │               │
│ duration        │               │
│ goldValue       │               │
│ completed       │               │
│ recycled        │               │
│ importance      │               │
│ notionId        │               │
└─────────────────┘               │
                                  │
       │                          │
       │ 1:1                      │
       │                          │
       ▼                          │
┌─────────────────┐               │
│ userProgress    │               │
│─────────────────│               │
│ id (PK)         │               │
│ userId (FK) ────┘               │
│ goldTotal       │               │
│ tasksCompleted  │               │
│ goldSpent       │               │
└─────────────────┘               │
                                  │
       │                          │
       │ 1:N                      │
       │                          │
       ▼                          │
┌─────────────────┐               │
│  userSkills     │               │
│─────────────────│               │
│ id (PK)         │               │
│ userId (FK) ────┘               │
│ skillName       │               │
│ level           │               │
│ xp              │               │
│ maxXp           │               │
└─────────────────┘               │
                                  │
       │                          │
       │ N:M                      │
       │                          │
       ▼                          │
┌─────────────────┐               │
│   shopItems     │               │
│─────────────────│               │
│ id (PK)         │               │
│ name            │               │
│ cost            │               │
│ icon            │               │
│ category        │               │
└─────────────────┘               │
       │                          │
       │                          │
       ├──────┬─────────┐         │
       │      │         │         │
       ▼      ▼         ▼         │
┌──────────┐┌─────────┐┌─────────┐
│purchases ││inventory││sessions │
│──────────││─────────││─────────│
│userId(FK)││userId(FK)││sid (PK) │
│itemId(FK)││itemId(FK)││userId   │
│cost      ││quantity ││expire   │
└──────────┘└─────────┘└─────────┘
```

### Table Definitions

#### `users` - Core Authentication & Profile

Stores user accounts, auth credentials, and integration tokens.

```typescript
{
  id: varchar (PK)              // Unique identifier (nanoid)
  username: varchar (unique)    // Login username
  email: varchar (unique)       // Email address
  passwordHash: varchar         // bcrypt hashed password
  firstName: varchar            // User's first name (optional)
  lastName: varchar             // User's last name (optional)
  profileImageUrl: varchar      // Profile picture URL (optional)
  
  // Integration Tokens
  notionApiKey: text            // Notion integration secret
  notionDatabaseId: text        // Connected Notion database ID
  googleAccessToken: text       // Google OAuth access token
  googleRefreshToken: text      // Google OAuth refresh token
  googleTokenExpiry: timestamp  // Token expiration time
  
  // Timestamps
  createdAt: timestamp          // Account creation date
  updatedAt: timestamp          // Last modification time
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)

**Key Features:**
- Supports login via username OR email
- Stores encrypted OAuth tokens for integrations
- Automatic timestamp tracking

---

#### `tasks` - Task Records with Metadata

Core task storage with rich filtering and categorization.

```typescript
{
  id: serial (PK)                    // Auto-increment ID
  userId: varchar (FK → users.id)   // Task owner
  notionId: text                     // Linked Notion page ID (optional)
  
  // Core Fields
  title: text (required)             // Task name
  description: text                  // Short description
  details: text                      // Extended details/notes
  duration: integer (required)       // Duration in minutes
  goldValue: integer (required)      // Gold reward (calculated)
  dueDate: timestamp                 // Due date (optional)
  
  // Status
  completed: boolean (default: false)     // Completion status
  completedAt: timestamp             // Completion timestamp
  recycled: boolean (default: false) // Soft delete flag
  recycledAt: timestamp              // Recycling timestamp
  recycledReason: text               // "completed" or "deleted"
  
  // Categorization (from Notion)
  importance: text                   // "Low", "Med-Low", "Medium", "Med-High", "High", "Pareto"
  kanbanStage: text                  // Workflow stage
  recurType: text                    // Recurrence pattern
  lifeDomain: text                   // Life area category
  businessWorkFilter: text           // "Apple", "Vi", "General", "SP", "Vel", "CG"
  
  // Boolean Filters
  apple: boolean (default: false)           // Apple-related flag
  smartPrep: boolean (default: false)       // Smart prep flag
  delegationTask: boolean (default: false)  // Delegation flag
  velin: boolean (default: false)           // Velin flag
  
  // Timestamps
  createdAt: timestamp               // Creation time
}
```

**Indexes:**
- `userId` (for user task queries)
- `notionId` (for sync operations)
- `recycled` (for filtering active/recycled)

**Key Features:**
- **Soft delete**: `recycled` flag preserves data
- **Notion sync**: Bi-directional via `notionId`
- **Gold auto-calculation**: Based on duration × importance
- **Rich filtering**: 10+ filter fields for advanced queries

---

#### `userProgress` - Aggregate Statistics

Single row per user tracking overall progress.

```typescript
{
  id: serial (PK)                    // Progress record ID
  userId: varchar (FK → users.id)   // User reference (unique)
  goldTotal: integer (default: 0)    // Total gold earned from completed tasks
  tasksCompleted: integer (default: 0) // Total tasks completed
  goldSpent: integer (default: 0)    // Gold spent in shop
  lastSyncedAt: timestamp            // Last Notion sync timestamp
}
```

**Indexes:**
- `userId` (unique - one progress record per user)

**Calculations:**
- Available Gold = `goldTotal - goldSpent`
- Total Tasks = `tasksCompleted`

**Key Features:**
- Upserted on user creation
- Updated on task completion and shop purchases
- Tracks sync history for Notion integration

---

#### `userSkills` - Individual Skill Progression

Stores level and XP for each of the 9 skills per user.

```typescript
{
  id: serial (PK)                    // Skill record ID
  userId: varchar (FK → users.id)   // User reference
  skillName: varchar (required)      // "Craftsman", "Artist", etc.
  skillIcon: text                    // Emoji or icon identifier
  level: integer (default: 1)        // Current level (1-50)
  xp: integer (default: 0)           // Current experience points
  maxXp: integer (default: 100)      // XP required for next level
  createdAt: timestamp               // Skill creation time
  updatedAt: timestamp               // Last update time
}
```

**Indexes:**
- `userId, skillName` (composite unique - one record per skill per user)

**Default Skills (9):**

| Skill | Icon | Constellation | Focus Area |
|-------|------|---------------|------------|
| Craftsman | 🔧 | The Forge | Building, creating physical objects |
| Artist | 🎨 | The Muse | Creative expression, artistic work |
| Alchemist | 🧪 | The Transmuter | Mental transformation, positive mindset |
| Merchant | 💼 | The Trader | Business acumen, wealth building |
| Physical | 🏋️ | The Titan | Martial arts, strength, firearms, cardio |
| Scholar | 📚 | The Sage | Academic knowledge, continuous learning |
| Health | 📊 | The Vitality | Physical & biological wellness |
| Athlete | ⚡ | The Swift | Sports performance, fitness |
| Charisma | 👥 | The Influencer | Charm, connection, social influence |

---

#### `shopItems` - Purchasable Items

Global and user-specific items available for purchase.

```typescript
{
  id: serial (PK)                    // Item ID
  userId: varchar (FK → users.id)   // null = global item, otherwise user-specific
  name: text (required)              // Item name
  description: text (required)       // Item description
  cost: integer (required)           // Gold price
  icon: text (required)              // Emoji icon
  category: text (default: "general") // "general", "nature", "celestial", "food", "luxury"
  isGlobal: boolean (default: false) // Available to all users
  createdAt: timestamp               // Item creation time
}
```

**Indexes:**
- `userId` (for user-specific items)
- `isGlobal` (for filtering global items)

**Default Shop Items (26 total):**

**General Items (8):**
- Video Game Session (150g) 🎮
- Movie Night (120g) 🎬
- Binge TV Series (200g) 📺
- Music Streaming Day (80g) 🎧
- Pizza Night (100g) 🍕
- Fancy Coffee (50g) ☕
- Chocolate Bar (30g) 🍫
- Ice Cream (60g) 🍦

**Nature Items (9):**
- Pine Tree (150g) 🌲
- Cherry Blossom (200g) 🌸
- Mountain Peak (300g) 🏔️
- Ocean Wave (250g) 🌊
- Evergreen Forest (180g) 🌳
- Fern Leaf (110g) 🌿
- Hibiscus Flower (190g) 🌺
- Desert Cactus (140g) 🌵
- Tropical Island (320g) 🏝️

**Celestial Items (9):**
- Golden Sunset (350g) 🌅
- Butterfly Garden (160g) 🦋
- Crescent Moon (220g) 🌙
- Rainbow Arc (280g) 🌈
- Autumn Leaves (130g) 🍂
- Starlight (240g) ⭐
- Northern Lights (400g) 🌌
- Cosmic Nebula (380g) 🌠
- Solar Flare (290g) ☀️

---

#### `purchases` - Transaction History

Immutable record of all shop purchases.

```typescript
{
  id: serial (PK)                        // Purchase ID
  userId: varchar (FK → users.id)       // Buyer
  shopItemId: integer (FK → shopItems.id) // Item purchased
  cost: integer (required)               // Price paid at time of purchase
  purchasedAt: timestamp (default: now()) // Purchase timestamp
}
```

**Key Features:**
- Permanent history (never deleted)
- Cost stored at purchase time (handles price changes)
- Used for analytics and purchase history display

---

#### `inventory` - User's Owned Items

Current inventory with quantity tracking.

```typescript
{
  id: serial (PK)                        // Inventory slot ID
  userId: varchar (FK → users.id)       // Item owner
  shopItemId: integer (FK → shopItems.id) // Item type
  quantity: integer (default: 1)         // Number owned
  addedAt: timestamp (default: now())    // First acquisition time
}
```

**Indexes:**
- `userId, shopItemId` (composite unique - one inventory row per item per user)

**Key Features:**
- Stackable items (quantity increments on repeat purchase)
- Consumption decrements quantity
- Row deleted when quantity reaches 0
- Separate from purchase history for current state

---

#### `sessions` - Express Session Storage

PostgreSQL-backed session store for authentication.

```typescript
{
  sid: varchar (PK)        // Session ID (generated by express-session)
  sess: jsonb (required)   // Session data (JSON serialized)
  expire: timestamp        // Session expiration time
}
```

**Indexes:**
- `expire` (for efficient cleanup queries)

**Session Data Structure:**
```json
{
  "cookie": {
    "maxAge": 2592000000,
    "httpOnly": true,
    "secure": false
  },
  "userId": "abc123xyz"
}
```

**Key Features:**
- Automatic expiration via connect-pg-simple
- Session max age: 30 days
- Stores userId for authentication
- Periodic cleanup of expired sessions

---

**(Part 1 of 3 complete - Database Schema finished)**

**Ready for Part 2?** I'll cover:
- Backend Deep Dive (routes, storage, integrations)
- Frontend Deep Dive (pages, components, state management)
- API Documentation (all endpoints with examples)

Type "continue" when you're ready for the next part!