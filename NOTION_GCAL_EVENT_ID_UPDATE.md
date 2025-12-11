# Notion Database - GCal Event ID Integration

## Overview
The ProductivityQuest Notion integration now supports syncing Google Calendar Event IDs between your Notion database and the app. This enables seamless tracking of which tasks are linked to Google Calendar events.

## What Changed

### Database Schema Updates
✅ **Added `googleEventId` field** to task imports and exports
✅ **Notion property mapping** for "GCal Event ID" text field
✅ **Bidirectional sync** - reads and writes GCal Event ID to/from Notion

### Notion Database Property
You need to add a new property to your Notion task database:

**Property Name**: `GCal Event ID`  
**Property Type**: Text  
**Purpose**: Stores the Google Calendar event ID for tasks synced with Google Calendar

## Setup Instructions

### 1. Add the Property to Your Notion Database

1. Open your Notion task database
2. Click the **"+"** button at the top right to add a new property
3. Name it exactly: **`GCal Event ID`**
4. Select **Text** as the property type
5. Click outside to save

### 2. Verify the Integration

The property will now be automatically synced in both directions:

#### When Importing from Notion → App
- The app reads the "GCal Event ID" field from Notion
- Populates `googleEventId` in the app's database
- Maintains the link to Google Calendar events

#### When Exporting from App → Notion
- The app writes the `googleEventId` to the "GCal Event ID" field in Notion
- Keeps Notion in sync with Google Calendar linkages
- Preserves the connection for future syncs

## Technical Implementation

### getTasks() Function
```typescript
// Extract Google Calendar Event ID from "GCal Event ID" property (Text type)
const googleEventId = properties["GCal Event ID"]?.rich_text?.[0]?.plain_text || null;
```

Returns tasks with the `googleEventId` field populated from Notion.

### addTaskToNotion() Function
```typescript
// Optional: GCal Event ID (Text) - Google Calendar Event ID
if (task.googleEventId) {
    properties["GCal Event ID"] = {
        rich_text: [
            {
                text: {
                    content: task.googleEventId,
                },
            },
        ],
    };
}
```

Writes the `googleEventId` to Notion when exporting/appending tasks.

### Import Endpoint (`/api/notion/import`)
```typescript
const taskData = {
    // ... other fields
    googleEventId: notionTask.googleEventId || null, // Import Google Calendar Event ID if present
    // ... other fields
};
```

Preserves Google Calendar Event IDs when importing tasks from Notion.

## Use Cases

### Scenario 1: Google Calendar → Notion Sync
1. User syncs tasks from ProductivityQuest to Google Calendar
2. Each task gets a `googleEventId` in the app database
3. User exports tasks to Notion
4. The "GCal Event ID" field in Notion is populated
5. User can see which Notion tasks are linked to calendar events

### Scenario 2: Notion → App Sync with Existing Events
1. User has tasks in Notion with "GCal Event ID" values
2. User imports from Notion to ProductivityQuest
3. Tasks retain their Google Calendar linkage
4. User can update/delete the calendar events from the app

### Scenario 3: Round-trip Sync
1. Create task in app → Export to Notion
2. Sync task to Google Calendar (gets `googleEventId`)
3. Update task in app → Re-export to Notion
4. Notion now shows the GCal Event ID
5. Import back from Notion → ID is preserved

## Benefits

✅ **Data Integrity** - Maintains Google Calendar linkages across all platforms  
✅ **Visibility** - See which tasks are synced to calendar directly in Notion  
✅ **Flexibility** - Edit tasks in Notion without losing calendar connections  
✅ **Debugging** - Easily identify and troubleshoot calendar sync issues  
✅ **Manual Management** - Manually link/unlink tasks from calendar events if needed

## Testing

### Test Case 1: Import with GCal Event ID
```
1. Add "GCal Event ID" text property to Notion database
2. Create a task in Notion with GCal Event ID: "abc123xyz"
3. Import from Notion to app
4. Verify task.googleEventId === "abc123xyz"
```

### Test Case 2: Export with GCal Event ID
```
1. Create task in app
2. Sync task to Google Calendar (assigns googleEventId)
3. Export task to Notion
4. Open Notion database
5. Verify "GCal Event ID" field contains the event ID
```

### Test Case 3: Round-trip Preservation
```
1. Export task with googleEventId to Notion
2. Import same task back from Notion
3. Verify googleEventId is preserved
4. Update task in app
5. Re-export to Notion
6. Verify GCal Event ID still matches
```

## Troubleshooting

### Property not syncing?
- Ensure the property name is **exactly** `GCal Event ID` (case-sensitive)
- Verify the property type is **Text**, not Rich Text or other types
- Check that your Notion integration has permission to read/write the database

### Event ID shows as blank?
- The task may not have been synced to Google Calendar yet
- Try syncing the task to calendar first, then export to Notion
- Check that Google Calendar integration is enabled and working

### Old tasks missing Event IDs?
- Tasks created before this update won't have Event IDs until:
  - They're synced to Google Calendar (creates new event)
  - They're imported from Notion with existing GCal Event ID

## Migration Notes

**No database migration required** - The `googleEventId` column already exists in the tasks table from the Google Calendar integration.

**No breaking changes** - Existing Notion sync functionality continues to work. The GCal Event ID field is optional.

**Backward compatible** - Tasks without Google Calendar links will have `null` or empty GCal Event ID, which is handled gracefully.

## Summary

The Notion integration now fully supports the "GCal Event ID" property, enabling complete synchronization of Google Calendar event linkages between ProductivityQuest, Notion, and Google Calendar. Simply add the text property to your Notion database and the sync will work automatically in both directions.
