-- Add chef base country and preferred currency fields
ALTER TABLE "ChefProfile" ADD COLUMN "baseCountryCode" TEXT NOT NULL DEFAULT 'GB';
ALTER TABLE "ChefProfile" ADD COLUMN "preferredCurrency" TEXT NOT NULL DEFAULT 'GBP';
