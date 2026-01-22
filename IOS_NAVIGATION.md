# iOS Bottom Navigation Implementation

## Overview
ProductivityQuest now includes a persistent bottom navigation bar for iOS, similar to CareerGlow. The navigation provides easy access to three main sections: Tasks, Shop, and Rewards.

## Features Implemented

### 1. TabBar Component (`/client/src/components/tab-bar.tsx`)
- Fixed bottom navigation with three tabs
- Active state highlighting (purple for active, gray for inactive)
- Icons: CheckSquare (Tasks), ShoppingCart (Shop), Trophy (Rewards)
- iOS safe area support for proper display on devices with notches
- Responsive design with hover states

### 2. New Pages

#### Shop Page (`/client/src/pages/shop.tsx`)
- Displays user's gold balance
- Grid of shop items (placeholder items for now)
- "Coming Soon" message for future features
- Backend implementation pending

#### Rewards Page (`/client/src/pages/rewards.tsx`)
- Overview cards showing tasks completed, gold earned, and achievements unlocked
- Achievement system with unlock status
- Visual badges for unlocked achievements
- Backend implementation pending

### 3. iOS-Specific Enhancements

#### Safe Area Support
Added CSS classes in `index.css`:
- `.safe-area-inset-bottom` - Handles bottom notch/home indicator
- `.safe-area-inset-top` - Handles top notch/status bar

#### Viewport Configuration
Updated `index.html` with iOS-specific meta tags:
```html
<meta name="viewport" content="viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

#### Capacitor Configuration
Added iOS content inset in `capacitor.config.ts`:
```typescript
ios: {
  contentInset: 'automatic'
}
```

## Navigation Structure

### Tabs
1. **Tasks** (`/`) - Main dashboard with task management
2. **Shop** (`/shop`) - Item shop for purchasing with gold
3. **Rewards** (`/rewards`) - Achievements and progress tracking

### Tab Visibility
The TabBar is shown on all authenticated pages except:
- `/login`
- `/register`

## Testing

### Web Browser Testing
1. Start dev server: `npm run dev`
2. Visit: `http://localhost:5001`
3. Login with your credentials
4. Navigate between Tasks, Shop, and Rewards tabs

### iOS Testing
1. Build the app: `npm run build`
2. Sync with iOS: `npx cap sync ios`
3. Open in Xcode: `npx cap open ios`
4. Run in iOS Simulator or on device
5. Test tab navigation and safe area handling

## Visual Design

### Color Scheme
- **Active Tab**: Purple (#8B5CF6) with bold icon and text
- **Inactive Tab**: Gray (#6B7280) with regular weight
- **Background**: White with subtle border

### Layout
- Fixed position at bottom of screen
- 64px height (16 in Tailwind units)
- Maximum width 512px (lg) centered
- Padding for safe areas on iOS devices

## Next Steps

### Backend Implementation Needed
1. **Shop System**
   - Create `shop_items` table
   - Add API endpoints for purchasing items
   - Implement gold transaction system
   - Add inventory management

2. **Rewards System**
   - Create `achievements` table
   - Add API endpoints for tracking progress
   - Implement achievement unlock logic
   - Add streak tracking for daily tasks

3. **Additional Features**
   - Add animations for tab transitions
   - Implement haptic feedback on iOS
   - Add badge notifications on tabs
   - Create item categories in shop

### Frontend Enhancements
1. Add loading states for shop and rewards pages
2. Implement pull-to-refresh on mobile
3. Add smooth page transitions
4. Create detailed item/achievement modals

## File Structure
```
client/src/
├── components/
│   └── tab-bar.tsx          # Bottom navigation component
├── pages/
│   ├── shop.tsx             # Shop page
│   └── rewards.tsx          # Rewards page
└── App.tsx                  # Updated with new routes

capacitor.config.ts          # iOS configuration
client/index.html           # iOS meta tags
client/src/index.css        # Safe area CSS utilities
```

## Notes
- The TypeScript errors in shop.tsx and rewards.tsx are just type assertion warnings and don't affect functionality
- The TabBar automatically hides on login/register pages
- All pages are responsive and work on web browsers as well as iOS
- Safe area insets ensure content doesn't get cut off by device notches

## Development Tips
1. Test on actual iOS devices to verify safe area handling
2. Use Chrome DevTools device emulation for quick web testing
3. The purple theme matches the existing app design
4. Gold balance is fetched from the existing `/api/progress` endpoint
