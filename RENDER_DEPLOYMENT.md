# ProductivityQuest - Render Deployment Guide

## Prerequisites
- GitHub repository connected to Render
- Render account with Web Service created
- PostgreSQL database (Neon or Render PostgreSQL)

## Render Configuration

### Web Service Settings

**Build & Deploy:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20.x (or latest LTS)

### Environment Variables

Add these in Render Dashboard → Environment:

#### Required Variables

```bash
# Node Environment
NODE_ENV=production

# Database (from Neon or Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Session Secret (generate a random string)
SESSION_SECRET=your-random-secret-key-here-make-it-long-and-secure

# Notion Integration
NOTION_INTEGRATION_SECRET=your-notion-integration-secret-here
NOTION_PAGE_URL=https://www.notion.so/your-database-url-here

# Port (Render provides this automatically)
PORT=10000
```

#### Optional Variables (if using Google Calendar)

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.onrender.com/api/auth/google/callback
```

## Setup Steps

### 1. Database Setup

**Option A: Use Render PostgreSQL**
1. In Render Dashboard, create a new PostgreSQL database
2. Copy the External Database URL
3. Add it as `DATABASE_URL` environment variable

**Option B: Use Neon (Recommended)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add it as `DATABASE_URL` environment variable

### 2. Generate Session Secret

Run this command locally to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it as `SESSION_SECRET` in Render.

### 3. Push Database Schema

After deploying, you need to push your database schema:

**Option 1: Use Render Shell**
1. Go to your Web Service in Render
2. Click "Shell" tab
3. Run: `npm run db:push`

**Option 2: Run locally with production DATABASE_URL**
```bash
DATABASE_URL="your-production-db-url" npm run db:push
```

### 4. Configure Authentication

Your app uses Replit Auth by default. For production, you may need to:
- Update `server/replitAuth.ts` to use a different auth provider
- Or configure Replit Auth for your custom domain

### 5. Set Up Custom Domain (Optional)

1. In Render Dashboard → Settings → Custom Domain
2. Add your domain
3. Update DNS records as instructed
4. Update `GOOGLE_REDIRECT_URI` if using Google Calendar

## Deployment Checklist

- [ ] GitHub repository connected to Render
- [ ] Build command set: `npm install && npm run build`
- [ ] Start command set: `npm start`
- [ ] `NODE_ENV=production` set
- [ ] `DATABASE_URL` configured
- [ ] `SESSION_SECRET` generated and set
- [ ] Notion environment variables added
- [ ] Database schema pushed with `npm run db:push`
- [ ] Test the deployment at `https://your-app.onrender.com`

## Common Issues

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `NODE_ENV=production` is set
- Check build logs for specific errors

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Ensure connection string includes `?sslmode=require`
- Check database is accessible from Render

### App Crashes on Start
- Check environment variables are set
- Verify database schema is pushed
- Check logs in Render Dashboard

### Authentication Issues
- Update auth configuration in `server/replitAuth.ts`
- Consider switching to Passport.js with local strategy
- Ensure session secret is set

## Health Check

Your app should respond at:
- **Homepage**: `https://your-app.onrender.com/`
- **Health Check**: `https://your-app.onrender.com/api/auth/user` (requires auth)

## Monitoring

- **Logs**: Available in Render Dashboard → Logs
- **Metrics**: Check CPU/Memory usage in Render Dashboard
- **Database**: Monitor connections in Neon/Render PostgreSQL dashboard

## Auto-Deploy

Render automatically deploys when you push to your `main` branch on GitHub.

To disable auto-deploy:
1. Go to Settings → Build & Deploy
2. Toggle "Auto-Deploy" off

## Manual Deploy

To manually trigger a deploy:
1. Go to your Web Service in Render
2. Click "Manual Deploy" → "Deploy latest commit"

## Next Steps

1. Set up monitoring/alerts in Render
2. Configure custom domain
3. Set up proper authentication for production
4. Add health check endpoint
5. Configure CORS for mobile app
6. Set up error tracking (e.g., Sentry)

## Support

- Render Docs: https://render.com/docs
- Neon Docs: https://neon.tech/docs
- ProductivityQuest Issues: https://github.com/careerglowllc/ProductivityQuest/issues