# Replit.md - Task Management Gamification App

## Overview

This is a full-stack task management application with gamification features built using React, Express, TypeScript, and PostgreSQL. The app transforms productivity into a game-like experience where users complete tasks to earn gold and purchase rewards. It includes integrations with Notion for task management and Google Calendar for scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Notion API**: Sync tasks from Notion databases
- **Google Calendar**: Create calendar events for tasks with time blocking
- **Neon Database**: Serverless PostgreSQL hosting

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
- `GOOGLE_CLIENT_EMAIL`: Google service account email
- `GOOGLE_PRIVATE_KEY`: Google service account private key

The application follows a monorepo structure with shared schemas between client and server, ensuring type safety across the full stack. The gamification layer transforms routine task management into an engaging experience with immediate feedback and long-term progression mechanics.