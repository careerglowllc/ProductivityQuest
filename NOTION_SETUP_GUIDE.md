# QuestList Notion Setup Guide

## Quick Start with Your Existing Database

Your QuestList app is now configured to work with your existing Notion database structure. Here's how to get started:

### Your Database Structure
The app now looks for a Notion database with these exact properties:
- **Task** (Title field) - The name of your task
- **Details** (Text field) - Description of what needs to be done
- **Recur Type** (Select field) - Options: "⏳One-Time" or "🔄Recurring"
- **Due** (Date field) - When the task is due
- **Min to Complete** (Number field) - How many minutes the task takes
- **Importance** (Select field) - Options: "Low", "Med-Low", "Medium", "Med-High", "High", "Pareto"
- **Kanban - Stage** (Status field) - Options: "Incubate", "Not Started", "In Progress", "Done"
- **Life Domain** (Select field) - Options: "Relationships", "Finance", "Purpose", "General", "Physical", "Adventure", "Power", "Mental"
- **Apple** (Checkbox field) - For Apple-related tasks
- **SmartPrep** (Checkbox field) - For SmartPrep tasks
- **Delegation Task** (Checkbox field) - For tasks that can be delegated
- **Velin** (Checkbox field) - For Velin-related tasks

### How Gold is Calculated
The app automatically calculates gold rewards based on:
- **Base gold**: 1 gold per 10 minutes of task duration
- **Importance multipliers**:
  - Low: 1x
  - Med-Low: 1.2x  
  - Medium: 1.5x
  - Med-High: 2x
  - High: 2.5x
  - Pareto: 3x

**Example**: A 30-minute "High" importance task = (30 ÷ 10) × 2.5 = 7.5 → 8 gold

### Setup Steps

1. **Share your existing database with the integration**:
   - Open your Notion database
   - Click the "..." menu in the top right
   - Go to "Connections" 
   - Add your QuestList integration

2. **Sync your tasks**:
   - In the QuestList app, click "Sync Notion"
   - The app will automatically find your database with the matching structure
   - All your tasks will be imported with calculated gold values

3. **Complete tasks to earn gold**:
   - Click the circle next to any task to complete it
   - You'll earn gold based on the importance and duration
   - The task will automatically be marked as "Done" in your Notion database

4. **Spend your gold**:
   - Click "Item Shop" to browse rewards
   - Buy items like "30 Minutes TV Time" or "1 Hour Gaming"
   - Track your purchases and mark them as used when you enjoy them

### Calendar Sync
- Click "Sync Calendar" to add all tasks with due dates to your Google Calendar
- Each calendar event will include the task details and gold reward value
- Events are automatically sized based on the "Min to Complete" field

### Features
- **Visual indicators**: Tasks show importance level with color-coded badges
- **Life Domain badges**: Color-coded categories for different life areas with matching icons
- **Checkbox indicators**: Visual badges for Apple, SmartPrep, Delegation Task, and Velin status
- **Recurring tasks**: Special badges for recurring vs one-time tasks
- **Progress tracking**: Daily statistics and completion rates
- **Kanban integration**: Tasks show their current stage from your Notion board

Your gamified productivity system is ready to use! Complete tasks, earn gold, and reward yourself for staying productive.