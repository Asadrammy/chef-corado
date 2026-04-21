# Deployment Guide - Chef Marketplace

## Render Deployment

This guide covers deploying the Chef Marketplace to Render with proper database configuration.

### Prerequisites

- Render account (https://render.com)
- GitHub repository with the code
- PostgreSQL database on Render

### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Choose a name (e.g., `chef-marketplace-db`)
3. Select the free tier or appropriate plan
4. Create the database

### Step 2: Configure DATABASE_URL

**IMPORTANT**: Render PostgreSQL uses PgBouncer for connection pooling. You must add connection pool parameters to your DATABASE_URL.

In your Render environment variables, set `DATABASE_URL` to:

```
postgresql://<user>:<password>@<host>:5432/<dbname>?connection_limit=10&pool_timeout=20&connect_timeout=10
```

Replace `<user>`, `<password>`, `<host>`, and `<dbname>` with values from your Render PostgreSQL instance.

**Parameters explained:**
- `connection_limit=10`: Maximum number of connections in the pool
- `pool_timeout=20`: Time in seconds to wait for a connection from the pool
- `connect_timeout=10`: Time in seconds to establish a new connection

### Step 3: Set Other Environment Variables

In your Render web service, add these environment variables:

- `NEXTAUTH_URL`: Your production URL (e.g., `https://chef-management.onrender.com`)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NODE_ENV`: `production`

### Step 4: Deploy Using render.yaml

The repository includes a `render.yaml` file for automated deployment:

```yaml
services:
  - type: web
    name: chef-marketplace
    env: node
    buildCommand: npm install && npm run build
    startCommand: npx prisma db push && npx ts-node prisma/seed-production.ts && npm start
```

To deploy:
1. Connect your GitHub repository to Render
2. Render will detect the `render.yaml` file
3. Configure the environment variables as described above
4. Deploy

### Step 5: Verify Deployment

1. Once deployed, check the Render logs for any errors
2. Test authentication by logging in with test accounts:
   - Admin: admin@example.com / admin123
   - Chef: chef@example.com / chef123
   - Client: client@example.com / client123

### Troubleshooting

#### "Server has closed the connection" Error

If you see this error during authentication:

1. **Check DATABASE_URL**: Ensure it includes the connection pool parameters
2. **Verify database is accessible**: Test the connection string locally
3. **Check Render logs**: Look for database connection errors
4. **Restart the service**: Sometimes a fresh connection helps

#### Database Connection Timeout

If connections are timing out:

1. Increase `pool_timeout` in DATABASE_URL (try 30-60 seconds)
2. Increase `connect_timeout` (try 15-20 seconds)
3. Check if your database plan has connection limits

#### Prisma Client Errors

If Prisma client fails to initialize:

1. Ensure `prisma generate` runs during build (included in `postinstall` script)
2. Check that `PRISMA_ENGINE_BINARY` env var is set to `./node_modules/.prisma/client`
3. Verify the schema is in sync with the database (`npx prisma db push`)

### Local Development

For local development, use the standard DATABASE_URL without pool parameters:

```
DATABASE_URL="postgresql://user:password@localhost:5432/chef_marketplace"
```

### Security Notes

- Never commit `.env` file to version control
- Use strong, unique passwords for database
- Rotate `NEXTAUTH_SECRET` periodically
- Enable SSL/TLS for database connections (Render does this by default)

### Monitoring

- Enable Render's built-in monitoring
- Check logs regularly for database connection issues
- Monitor database connection usage in Render dashboard
- Set up alerts for high connection counts

## Alternative: Manual Deployment

If not using `render.yaml`:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npx prisma db push && npx ts-node prisma/seed-production.ts && npm start`
4. Add environment variables as described above
5. Deploy
