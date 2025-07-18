# Google OAuth Setup Guide

## The Issue

When you click "Connect Google Calendar" and get a 404 error, it's because the Google OAuth redirect URI needs to be configured in the Google Cloud Console.

## Current Configuration

The app is automatically configured to use your Replit domain as the OAuth redirect URI:
```
https://5f98fa8d-d57e-4fd3-a52a-13b1276b3456-00-1nhwqx94b49ac.riker.replit.dev/api/google/callback
```

## Solution Steps

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com
- Navigate to: APIs & Services → Credentials

### 2. Find Your OAuth 2.0 Client ID
- Look for the OAuth 2.0 Client ID you're using
- Click on it to edit

### 3. Add the Redirect URI
- In the "Authorized redirect URIs" section, click "Add URI"
- Add exactly: `https://5f98fa8d-d57e-4fd3-a52a-13b1276b3456-00-1nhwqx94b49ac.riker.replit.dev/api/google/callback`
- Click "Save"

### 4. Wait for Propagation
- Changes may take a few minutes to propagate
- Try the OAuth flow again after 5-10 minutes

## Alternative: Use Environment Variables

If you want to set a custom redirect URI, you can add these environment variables:
```bash
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
```

## Testing the Fix

1. Open the app in your browser
2. Go to Settings
3. Click "Connect Google Calendar"
4. You should be redirected to Google's OAuth page
5. After authorizing, you'll be redirected back to the app successfully

## Why This Happens

Google OAuth requires all redirect URIs to be explicitly registered for security reasons. When running on Replit, the domain is dynamically generated, so it needs to be added to the Google Cloud Console configuration.

## Need Help?

If you're still getting a 404 error:
1. Check that the redirect URI in Google Cloud Console exactly matches what's shown in the server logs
2. Ensure the OAuth client ID and secret are correct
3. Wait a few minutes for changes to propagate
4. Try opening the OAuth URL in an incognito/private browsing window