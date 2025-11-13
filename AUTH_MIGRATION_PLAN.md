# Authentication Migration Plan

## Overview
Replace Replit Auth (OIDC) with traditional username/password authentication like CareerGlow uses.

## What We're Adding:
1. **User Registration** - Create account with username, email, password
2. **User Login** - Sign in with username/email and password
3. **Password Hashing** - bcrypt for secure password storage
4. **Session Management** - Express sessions with PostgreSQL storage
5. **Password Reset** - Email-based password recovery (optional for now)

## Database Changes:
- Users table already exists but needs password field
- Add `username`, `passwordHash` columns
- Keep existing session table structure

## API Endpoints to Add:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user (modify existing)

## Files to Modify:
1. `shared/schema.ts` - Add username/passwordHash to users table
2. `server/storage.ts` - Add user creation/login methods
3. `server/routes.ts` - Add auth endpoints
4. `server/index.ts` - Remove replitAuth, add session middleware
5. Create new auth middleware file

## Files to Remove:
- `server/replitAuth.ts` - No longer needed

## Frontend Changes:
- Create login page
- Create registration page
- Update useAuth hook to work with new endpoints