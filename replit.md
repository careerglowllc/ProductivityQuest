# Replit.md - Task Management Gamification App

## Overview

This is a full-stack task management application with gamification features built using React, Express, TypeScript, and PostgreSQL. The app transforms productivity into a game-like experience where users complete tasks to earn gold and purchase rewards. It includes integrations with Notion for task management and Google Calendar for scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 18, 2025)

✓ Updated Notion integration to work with user's existing database structure
✓ Added support for custom fields: Task (title), Details (text), Recur Type, Due (date), Min to Complete (number), Importance (select), Kanban - Stage (status)
✓ Added support for Life Domain field with 8 categories: Relationships, Finance, Purpose, General, Physical, Adventure, Power, Mental
✓ Added support for checkbox fields: Apple, SmartPrep, Delegation Task, Velin
✓ Implemented intelligent gold calculation based on importance level and task duration
✓ Added visual indicators for importance levels (Pareto, High, Med-High, etc.) with appropriate colors
✓ Added color-coded badges for Life Domain categories with matching icons
✓ Added support for recurring tasks with visual badges
✓ Enhanced task cards to show Kanban stage, importance, life domain, and checkbox status
✓ Updated task completion to sync back to Notion by changing Kanban stage to "Done"
✓ Implemented comprehensive recycling system for completed and deleted tasks
✓ Added recycling database fields: recycled, recycledAt, recycledReason
✓ Created RecyclingModal with tabbed interface showing completed/deleted tasks separately
✓ Added bulk operations for restoring and permanently deleting multiple tasks
✓ Integrated recycling button in sidebar navigation
✓ Tasks now automatically move to recycling bin when completed or deleted instead of permanent removal
✓ Added bulk Notion operations: "Append to Notion" and "Delete from Notion" buttons for selected tasks
✓ Implemented selective calendar sync - only syncs selected tasks instead of all tasks
✓ Added visual feedback showing number of selected tasks in sync buttons
✓ Calendar sync and sidebar buttons now disabled/grayed out when no tasks are selected
✓ Updated CalendarSyncModal to show selected task count instead of all pending tasks
✓ Enhanced user experience with clear selection-based workflows
✓ Added comprehensive search functionality with prominent search bar and search icon
✓ Implemented real-time keyword search across task titles, descriptions, categories, and importance levels
✓ Added search results counter and contextual no-results messages
✓ Enhanced search with clear button and visual feedback for active searches
✓ Search works seamlessly with existing filters (due today, high reward, quick tasks)
✓ Updated debug tool with comprehensive search functionality testing suite
✓ Restructured Google Calendar integration to use OAuth 2.0 instead of service account credentials
✓ Added OAuth 2.0 authentication flow with Google Calendar API
✓ Implemented secure token management with access and refresh tokens
✓ Updated database schema to store OAuth tokens instead of service account credentials
✓ Added OAuth callback handling and redirect URLs for authentication
✓ Enhanced calendar sync to work with user-based OAuth authentication
✓ Improved error handling with OAuth-specific guidance and token refresh logic

### Latest Debugging & Documentation Updates
✓ Fixed critical TanStack Query v5 compatibility issues by removing deprecated onSuccess callbacks
✓ Updated mutation handlers to use proper async/await patterns with mutateAsync
✓ Resolved all JavaScript runtime errors preventing app from running
✓ Completely rebuilt debug-tool.js with comprehensive testing suites
✓ Added authentication detection and session handling in debug tool
✓ Implemented color-coded output with detailed error reporting
✓ Added individual test suites for all major components (auth, tasks, search, recycling, shop, notion, google, stats)
✓ Enhanced debug tool with graceful handling of unauthenticated states
✓ Updated README.md with comprehensive debugging documentation
✓ Added troubleshooting guide for common authentication and integration issues
✓ Documented all debug tool commands and test coverage
✓ Successfully restarted application server on port 5000 with full functionality

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and bundling
- **UI Library**: Radix UI components with custom shadcn/ui styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Built-in session handling
- **API Design**: RESTful API with structured error handling
- **External Services**: Google Calendar API and Notion API integrations

### Database Schema
- **Tasks**: Core task entities with completion tracking, gold rewards, and due dates
- **Shop Items**: Purchasable rewards with categories and costs
- **User Progress**: Tracks total gold, completed tasks, and spending
- **Purchases**: Records of items bought and their usage status

## Key Components

### Task Management System
- Create and manage tasks with duration, gold value, and due dates
- Complete tasks to earn gold rewards
- Integration with Notion for external task synchronization
- Animated completion feedback with gold rewards

### Gamification Features
- Gold-based reward system for task completion
- Item shop with categorized purchases (entertainment, food, wellness, etc.)
- Progress tracking and statistics
- Achievement-style completion animations

### External Integrations
- **Notion API**: Sync tasks from existing user database with custom schema (Task, Details, Due, Min to Complete, Importance, Kanban - Stage)
- **Google Calendar**: Create calendar events for tasks with time blocking
- **Neon Database**: Serverless PostgreSQL hosting (currently using in-memory storage)

### Gold Calculation System
- Base gold: 1 gold per 10 minutes of task duration
- Importance multipliers:
  - Low: 1x
  - Med-Low: 1.2x  
  - Medium: 1.5x
  - Med-High: 2x
  - High: 2.5x
  - Pareto: 3x

### UI Components
- Comprehensive component library based on Radix UI
- Responsive design with mobile-first approach
- Dark/light theme support via CSS variables
- Toast notifications for user feedback
- Modal dialogs for shop, calendar sync, and task completion

## Data Flow

1. **Task Creation**: Tasks can be created manually or synced from Notion
2. **Task Completion**: Users complete tasks to earn gold, triggering animations and progress updates
3. **Gold Management**: Gold is tracked and can be spent in the item shop
4. **Calendar Integration**: Tasks with due dates can be synced to Google Calendar
5. **Progress Tracking**: System maintains statistics on completed tasks and gold earned

## External Dependencies

### Database & Storage
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **connect-pg-simple**: PostgreSQL session storage

### APIs & Integrations
- **@notionhq/client**: Notion API integration
- **googleapis**: Google Calendar API integration

### UI & Styling
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution
- **@replit/vite-plugin-runtime-error-modal**: Enhanced error handling in development

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` script

### Environment Configuration
- **Development**: Uses tsx for hot reloading and Vite dev server
- **Production**: Node.js serves bundled application with static file serving
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NOTION_INTEGRATION_SECRET`: Notion API authentication
- `NOTION_PAGE_URL`: Target Notion page for task sync
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (32247087981-xxx.apps.googleusercontent.com)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (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)

The application follows a monorepo structure with shared schemas between client and server, ensuring type safety across the full stack. The gamification layer transforms routine task management into an engaging experience with immediate feedback and long-term progression mechanics.