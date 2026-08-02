#!/bin/bash

# Render Build Script for Chef Marketplace
# This script runs after npm install and before the application starts

echo "=== Starting Render Build Process ==="

export DATABASE_URL="$(node scripts/normalize-database-url.cjs)"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Push schema to database (creates tables if they don't exist)
echo "Pushing database schema..."
npx prisma db push

# Seed database with initial data
echo "Seeding database..."
npx ts-node prisma/seed-production.ts

echo "=== Render Build Complete ==="
