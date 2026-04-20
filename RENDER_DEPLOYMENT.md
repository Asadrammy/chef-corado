# Render Deployment Guide

## Initial Database Setup

After deploying to Render for the first time, you need to initialize the database with initial users:

### Option 1: Via Render Shell (Recommended)

1. Go to your Render dashboard
2. Select your service (chef-marketplace)
3. Click "Shell" in the top right
4. Run the following command:
   ```bash
   npx ts-node scripts/production-init.ts
   ```

This will create:
- Admin: admin@example.com / admin123
- Chef: chef@example.com / chef123
- Client: client@example.com / client123

### Option 2: Via Local Machine

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run the initialization script
npx ts-node scripts/production-init.ts
```

## Environment Variables Required

Set these in your Render dashboard:

- **DATABASE_URL**: Your PostgreSQL connection string (provided by Render)
- **NEXTAUTH_URL**: https://chef-management.onrender.com
- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **NODE_ENV**: production (auto-set by render.yaml)

## Important Notes

- The production initialization script checks if users exist before seeding
- It will NOT delete existing data
- Only run the initialization script once
- Subsequent deployments will not affect existing data

## Troubleshooting

### Login Issues

If you can't log in:

1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Ensure the database was initialized with the script above
4. Check that NEXTAUTH_SECRET is set

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check Render PostgreSQL service is running
3. Ensure Prisma schema is synchronized: `npx prisma db push`

## Local Development

For local development, use SQLite by setting in your `.env`:

```env
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=local-dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

Then run:
```bash
npx prisma db push
npx prisma db seed
```
