#!/bin/bash

# Render Build Script for Chef Marketplace
# This script runs after npm install and before the application starts

echo "=== Starting Render Build Process ==="

export DATABASE_URL="$(node scripts/normalize-database-url.cjs)"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Apply committed migration history. Do not use db push or seed during production builds.
echo "Applying database migrations..."
npx prisma migrate deploy

# Build application
echo "Building application..."
npm run build

echo "=== Render Build Complete ==="
