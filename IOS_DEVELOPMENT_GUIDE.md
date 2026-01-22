# iOS Development Guide - ProductivityQuest

## Current Issue: iOS Login Not Working ✅ SOLVED

### Problem
iOS app in Xcode simulator couldn't connect to backend because Capacitor apps load locally and can't use Vite's proxy.

### Solution
Updated `capacitor.config.ts` to point to the Vite dev server during development.

## Running the App in iOS Simulator

### Step 1: Start Both Servers

**Terminal 1: Backend Server (Port 5001)**
```bash
npm run dev
```
Should show: `serving on port 5001`

**Terminal 2: Vite Dev Server (Port 5173)**
```bash
npx vite
```
Should show: `Local: http://localhost:5173/`

### Step 2: Open in Xcode

In your existing Xcode window, just **rebuild and run** the app. The changes are already synced.

Or open fresh:
```bash
npx cap open ios
```

### Step 3: Test in Simulator

1. App will open in iOS Simulator
2. Click "Create Account" or "Start Your Quest"
3. Fill in registration form
4. Submit - you should be logged in!
5. See your dashboard with welcome message and stats
6. Test the bottom navigation tabs

## Understanding the Setup

### Development Configuration

```typescript
// capacitor.config.ts
server: {
  url: 'http://localhost:5173',  // Points to Vite dev server
  cleartext: true                 // Allows HTTP in development
}
```

This tells the iOS app to load from your Vite dev server instead of the built files. The Vite dev server then proxies API calls to the backend on port 5001.

### Request Flow

```
iOS App → Vite (5173) → Backend (5001) → Database (Neon)
          ↑
          Proxy /api requests
```

## Important Notes

### ⚠️ Before Production Build

When building for production/TestFlight/App Store, you MUST remove or comment out the development server URL:

```typescript
// capacitor.config.ts - PRODUCTION CONFIG
server: {
  androidScheme: 'https',
  // url: 'http://localhost:5173',  // COMMENT OUT FOR PRODUCTION
  // cleartext: true                 // COMMENT OUT FOR PRODUCTION
}
```

Then rebuild:
```bash
npm run build
npx cap sync ios
```

### Common Errors (Ignore These)

These are **simulator warnings** and don't affect functionality:
- ❌ `Unable to simultaneously satisfy constraints` - UI layout warnings
- ❌ `hapticpatternlibrary.plist` errors - Simulator doesn't have haptic files
- ❌ `RTIInputSystemClient` warnings - Keyboard session warnings
- ❌ `Failed to send CA Event` - Analytics warnings in simulator

### What Matters

Look for these **success indicators**:
- ✅ `⚡️ Loading app at capacitor://localhost...`
- ✅ `⚡️ WebView loaded`
- ✅ App UI appears
- ✅ Can type in forms
- ✅ Login/register works

## Troubleshooting

### Login Still Not Working?

1. **Check both servers are running:**
   ```bash
   lsof -i :5001  # Should show node process
   lsof -i :5173  # Should show vite process
   ```

2. **Check Xcode console for network errors:**
   - Look for `Failed to load resource` or `401 Unauthorized`
   - These indicate API connection issues

3. **Rebuild the app in Xcode:**
   - Product → Clean Build Folder (⇧⌘K)
   - Product → Build (⌘B)
   - Run (⌘R)

4. **Verify the config was synced:**
   ```bash
   cat ios/App/App/capacitor.config.json | grep url
   ```
   Should show: `"url": "http://localhost:5173"`

### Database Connection Issues

If you see database errors:
1. Check `.env` file has correct `DATABASE_URL`
2. Test connection: `npm run dev` should show ✅ Database connected
3. Verify Neon database is accessible

### Session Issues

If login works but immediately logs you out:
1. Check `SESSION_SECRET` is set in `.env`
2. Backend logs should show session creation
3. Try clearing simulator: Device → Erase All Content and Settings

## Development Workflow

### Daily Development Routine

1. **Start servers** (in separate terminals):
   ```bash
   npm run dev    # Terminal 1 - Backend
   npx vite       # Terminal 2 - Frontend
   ```

2. **Open Xcode** (if not already open):
   ```bash
   npx cap open ios
   ```

3. **Make changes** to your code

4. **Test changes:**
   - Web: Refresh http://localhost:5173
   - iOS: Rebuild in Xcode (⌘B then ⌘R)

5. **When done**, commit:
   ```bash
   git add -A
   git commit -m "Your changes"
   git push origin main
   ```

### Making UI Changes

**Frontend changes** (React components):
- Edit files in `client/src/`
- **Web**: Auto-reloads via Vite HMR
- **iOS**: Xcode auto-reloads if dev server is running

**Backend changes** (API endpoints):
- Edit files in `server/`
- Backend restarts automatically (tsx watch mode)
- **iOS**: Should reconnect automatically

## Testing Authentication

### Create Account Flow
1. Open app in simulator
2. Tap "Start Your Quest" or "Create Account"
3. Enter:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`
   - Confirm Password: `Test123!`
4. Tap "Create Account"
5. Should redirect to dashboard

### Login Flow
1. If already registered, tap "Sign In"
2. Enter username or email
3. Enter password
4. Tap "Sign In"
5. Should see dashboard with welcome message

### Expected Dashboard
After successful login, you should see:
- Welcome message: "Welcome back, [username]! 👋"
- Three stats cards (Gold, Quests Completed, Today's Progress)
- Task list from your Notion database
- Bottom navigation bar (Tasks, Shop, Rewards)

## Next Steps

Once login is working:
1. Test all three navigation tabs
2. Sync with Notion database
3. Try completing tasks
4. Check gold accumulation
5. Explore Shop and Rewards pages

---

**Current Status**: ✅ Both servers running, iOS config updated, ready to test!

**Action Required**: In Xcode, press **⌘R** to rebuild and run the app in the simulator.
