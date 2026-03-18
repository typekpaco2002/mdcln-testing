# Database Management Guide

## Understanding Your Database Setup

Your project has **TWO SEPARATE DATABASES**:

1. **Development Database** (used in Replit editor)
   - Connected when you run `npm run dev`
   - Uses `DATABASE_URL` secret
   - Safe to experiment with

2. **Production Database** (used on modelclone.app)
   - Connected when deployed
   - Uses same `DATABASE_URL` secret but different value in production
   - **NEVER reset or experiment with this!**

## Common Issues & Solutions

### Issue 1: "User exists" on signup but "User not found" on login

**Cause**: You're checking different databases (dev vs production)

**Solution**: Always verify which database you're testing against:
- In Replit editor = Development database
- On modelclone.app = Production database

### Issue 2: Admin user missing in production

**Cause**: Admin created in dev database, not production

**Solution**: Run the admin creation script (see below)

## Useful Scripts

### Create Admin User

Run this to create an admin in the **current** database (dev or production):

```bash
# In development (Replit)
node scripts/create-admin.js

# For production (after deploying), you need to run it with production DATABASE_URL
```

### Fix/Verify a User

Check if a user exists and auto-verify them:

```bash
node scripts/fix-user.js email@example.com
```

### Seed Database

Run this to create default admin + test users:

```bash
node prisma/seed.js
```

## Best Practices

### ✅ DO:
- Test auth flows in development first
- Create admin users with scripts (not manually in UI)
- Keep development and production separate
- Use migrations for schema changes
- Document any manual database changes

### ❌ DON'T:
- Reset production database
- Manually edit production database without backups
- Assume dev and production are in sync
- Create users manually in database

## Emergency: Delete Test User

If you need to remove a test account:

```bash
# Connect to database
npx prisma studio

# Find and delete the user manually in the UI
```

## Checking Which Database You're Using

Look at your `.env` file or Replit Secrets:
- `DATABASE_URL` tells you which database is connected
- Production uses a different URL than development

## Schema Changes

When you change `prisma/schema.prisma`:

1. **Development**: Changes apply automatically with `npx prisma db push`
2. **Production**: Deploy to apply schema changes

---

**Remember**: Development and Production databases are SEPARATE. Changes in one don't affect the other automatically!
