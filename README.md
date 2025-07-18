# Task Management Gamification App

A full-stack gamified productivity web application that seamlessly integrates with Notion and Google Calendar, transforming task management into an engaging game-like experience with gold-based rewards and comprehensive tracking.

## 🚀 Quick Start

1. **Environment Setup**
   ```bash
   # Required environment variables
   NOTION_INTEGRATION_SECRET=your_notion_integration_secret
   NOTION_PAGE_URL=your_notion_page_url
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
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
- **Search Functionality**: Keyword search across title, description, category, and importance
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

### 5. Search System
**Files**: `client/src/pages/home.tsx`

- **Real-time Search**: Instant filtering as user types
- **Multi-field Search**: Searches across title, description, category, and importance
- **Search + Filter Combination**: Works with existing filters (due today, high reward, etc.)
- **Visual Feedback**: Results counter and contextual no-results messages
- **Clear Search**: Easy reset with clear button or dedicated clear action

**Search Implementation**:
- Case-insensitive keyword matching
- Searches multiple task fields simultaneously
- Preserves existing filter logic while adding search layer
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