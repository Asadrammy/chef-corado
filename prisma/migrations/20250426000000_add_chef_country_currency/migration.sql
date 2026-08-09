-- Add chef base country and preferred currency fields
ALTER TABLE "ChefProfile" ADD COLUMN IF NOT EXISTS "baseCountryCode" TEXT NOT NULL DEFAULT 'GB';
ALTER TABLE "ChefProfile" ADD COLUMN IF NOT EXISTS "preferredCurrency" TEXT NOT NULL DEFAULT 'GBP';
