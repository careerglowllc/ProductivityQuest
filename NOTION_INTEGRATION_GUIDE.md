# Per-User Notion Integration System

## Overview

ProductivityQuest now supports **per-user Notion integration**, allowing each user to connect their own personal Notion workspace and task database. This provides complete privacy and flexibility - users control their own data and can use any Notion database structure they prefer.

## Features

✅ **Private Integration** - Each user stores their own encrypted Notion API key and database ID  
✅ **Step-by-Step Setup Guide** - Interactive page with detailed instructions  
✅ **Visual Feedback** - Connection status indicators and validation  
✅ **Secure Storage** - Credentials stored securely in the database  
✅ **Easy Management** - Simple interface to update or change settings  

## User Flow

### 1. Access the Integration Page

Users can access the Notion integration setup from:
- **Settings Page**: Click "Setup Guide" button in the Notion Integration card
- **Direct URL**: `/settings/notion`

### 2. Three-Step Setup Process

#### Step 1: Create Notion Integration
- Visit Notion's integration page
- Create a new internal integration
- Set required capabilities (Read, Update, Insert)
- Copy the integration secret (starts with `ntn_`)

#### Step 2: Set Up Task Database
- Create or select a Notion database
- Add required properties:
  - **Title** (Text) - Task name
  - **Duration** (Number) - Time in minutes
  - **Importance** (Select) - Priority level
  - **Due Date** (Date) - When it's due
  - **Completed** (Checkbox) - Task status
- Share the database with your integration
- Copy the 32-character database ID from the URL

#### Step 3: Connect to ProductivityQuest
- Paste your API key (hidden for security)
- Paste your database ID
- Click "Connect Notion"
- Status indicator shows when successfully connected

## Technical Implementation

### Frontend

**New Page**: `/client/src/pages/notion-integration.tsx`
- Interactive step-by-step guide with numbered cards
- Visual progress indicators
- Form validation with real-time feedback
- Secure credential handling (API key masked by default)
- Connection status badges

**Route**: `/settings/notion` (protected, requires authentication)

**Updated Components**:
- `/client/src/pages/settings.tsx` - Added "Setup Guide" button
- `/client/src/App.tsx` - Added route for Notion integration page

### Backend

**Validation Schema**: `/shared/schema.ts`
```typescript
export const updateNotionConfigSchema = z.object({
  notionApiKey: z.string().min(1).startsWith("ntn_"),
  notionDatabaseId: z.string().length(32),
});

export type UserSettings = {
  notionApiKey: string | null;
  notionDatabaseId: string | null;
  hasGoogleAuth: boolean;
  googleConnected: boolean;
};
```

**API Endpoints**:
- `GET /api/user/settings` - Returns user's Notion configuration (API key masked)
- `PUT /api/user/settings` - Updates Notion credentials with validation

**Database Storage**:
- Table: `users`
- Fields: `notionApiKey` (text), `notionDatabaseId` (text)
- Both nullable to support users without Notion integration

### Validation

**API Key Validation**:
- Must start with `ntn_` prefix
- Cannot be empty

**Database ID Validation**:
- Must be exactly 32 characters
- Cannot be empty

### Security

1. **API Key Masking**: When fetched via GET endpoint, shows `'***'` instead of actual key
2. **HTTPS Required**: All credentials transmitted over secure connections
3. **Session-Based Auth**: Only authenticated users can access/update their settings
4. **Validation Layer**: Zod schemas validate format before saving to database

### Future Enhancements

Potential improvements for next iteration:

1. **Encryption at Rest**: Encrypt API keys in the database using AES-256
2. **Test Connection**: Add endpoint to verify credentials work before saving
3. **Multiple Databases**: Support connecting multiple Notion databases
4. **Auto-Discovery**: Scan user's Notion workspace for valid task databases
5. **Template Duplication**: Provide a Notion template users can duplicate
6. **Webhook Support**: Real-time sync using Notion's webhook API
7. **Granular Permissions**: Let users choose which properties to sync

## Files Changed

### New Files
- `/client/src/pages/notion-integration.tsx` - Main integration setup page

### Modified Files
- `/shared/schema.ts` - Added validation schema and UserSettings type
- `/server/routes.ts` - Added validation to PUT endpoint
- `/client/src/pages/settings.tsx` - Added Setup Guide button and type imports
- `/client/src/App.tsx` - Added route for `/settings/notion`

## Usage Instructions for Users

See the in-app guide at `/settings/notion` for complete setup instructions with screenshots and step-by-step guidance.

## Developer Notes

### Testing the Integration

1. Start both servers:
   ```bash
   npm run dev
   ```

2. Navigate to `/settings/notion` when logged in

3. Follow the setup wizard to connect a test Notion database

4. Verify credentials are saved by checking `/api/user/settings`

### Debugging

- Check browser DevTools Network tab for API request/response
- Validation errors include detailed Zod error messages
- Backend logs show any Notion API connection issues

### Environment Variables

No global Notion credentials needed! Each user provides their own:
- ~~`NOTION_API_KEY`~~ (deprecated - now per-user)
- ~~`NOTION_DATABASE_ID`~~ (deprecated - now per-user)

### Migration Notes

If you had global Notion credentials before:
1. The old env vars still work for server-side operations
2. Users can now override with their personal credentials
3. Personal credentials take precedence over global ones (if implemented)

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: ✅ Complete - Backend validation and frontend UI implemented
