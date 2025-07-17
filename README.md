# Task Management Gamification App

A full-stack gamified productivity web application that seamlessly integrates with Notion and Google Calendar, transforming task management into an engaging game-like experience with gold-based rewards and comprehensive tracking.

## 🚀 Quick Start

1. **Environment Setup**
   ```bash
   # Required environment variables
   NOTION_INTEGRATION_SECRET=your_notion_integration_secret
   NOTION_PAGE_URL=your_notion_page_url
   GOOGLE_CLIENT_EMAIL=your_google_service_account_email
   GOOGLE_PRIVATE_KEY=your_google_service_account_private_key
   DATABASE_URL=your_postgresql_connection_string (optional, uses in-memory storage by default)
   ```

2. **Installation & Running**
   ```bash
   npm install
   npm run dev
   ```

3. **Access the App**
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:5000/api

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM (in-memory storage for development)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **External APIs**: Notion API, Google Calendar API

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── App.tsx        # Main app component
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data storage interface
│   ├── notion.ts         # Notion API integration
│   └── google-calendar.ts # Google Calendar integration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schemas and types
└── components.json       # shadcn/ui configuration
```

## 🔧 Core Features & Components

### 1. Task Management System
**Files**: `client/src/pages/home.tsx`, `client/src/components/task-card.tsx`, `server/routes.ts`

- **Task Creation**: Manual creation or Notion sync
- **Task Completion**: Marks complete and awards gold
- **Task Deletion**: Moves to recycling bin
- **Filtering & Sorting**: By due date, importance, life domain
- **Multi-selection**: Bulk operations on multiple tasks

**Key Interactions**:
- Tasks sync bidirectionally with Notion database
- Completed tasks automatically move to recycling bin
- Gold calculation based on duration and importance multipliers

### 2. Gamification System
**Files**: `client/src/components/completion-animation.tsx`, `server/storage.ts`

- **Gold Rewards**: Earned based on task completion
- **Progress Tracking**: Total gold, completed tasks, spending history
- **Achievement Animations**: Visual feedback for completions
- **Statistics**: Daily/weekly progress metrics

**Gold Calculation Formula**:
```typescript
baseGold = duration / 10  // 1 gold per 10 minutes
multipliers = {
  "Low": 1x, "Med-Low": 1.2x, "Medium": 1.5x, 
  "Med-High": 2x, "High": 2.5x, "Pareto": 3x
}
finalGold = baseGold * importanceMultiplier
```

### 3. Item Shop System
**Files**: `client/src/components/item-shop-modal.tsx`, `server/routes.ts`

- **Purchasable Items**: Entertainment, food, wellness categories
- **Gold Spending**: Deducts from user's gold total
- **Purchase History**: Tracks all purchases and usage
- **Item Usage**: Mark items as used/unused

### 4. Recycling System
**Files**: `client/src/components/recycling-modal.tsx`, `server/storage.ts`

- **Soft Deletion**: Completed/deleted tasks move to recycling
- **Restoration**: Restore tasks back to active state
- **Permanent Deletion**: Final removal from system
- **Bulk Operations**: Mass restore/delete functionality

**Recycling Workflow**:
1. Task completed → `recycled: true, recycledReason: "completed"`
2. Task deleted → `recycled: true, recycledReason: "deleted"`
3. Main task list filters out recycled tasks
4. Recycling bin shows tasks by reason (completed/deleted)
5. Restore resets recycling flags and returns to main list

### 5. External Integrations

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

- **Event Creation**: Creates calendar events for tasks
- **Time Blocking**: Schedules tasks based on duration
- **Service Account**: Uses Google service account for authentication

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
  lifeDomain: LifeDomain;
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
- `POST /api/notion/export` - Export all tasks to Notion

### Shop & Progress
- `GET /api/shop/items` - Get all shop items
- `POST /api/shop/purchase` - Purchase item with gold
- `GET /api/progress` - Get user progress stats
- `GET /api/stats` - Get daily/weekly statistics

## 🎨 UI Components & Styling

### Component Architecture
- **Radix UI**: Headless, accessible components
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Key UI Components
- `TaskCard`: Individual task display with actions
- `ItemShopModal`: Shopping interface for gold spending
- `RecyclingModal`: Tabbed interface for recycled tasks
- `CompletionAnimation`: Celebratory animation for completions
- `CalendarSyncModal`: Google Calendar integration interface

### Responsive Design
- Mobile-first approach
- Collapsible sidebar navigation
- Responsive grid layouts
- Touch-friendly interactions

## 🧪 Testing & Debugging

### Debug Tools
- **Debug Script**: `npm run debug` - Comprehensive functionality testing
- **Console Logging**: Server-side logging for key operations
- **Error Handling**: Structured error responses with proper HTTP codes

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

# Google Calendar (optional)
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

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
- User authentication and multi-user support
- Advanced analytics and reporting
- Mobile app with React Native
- Team collaboration features
- Advanced recurring task patterns
- Custom reward categories

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