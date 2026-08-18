-- Additive chef onboarding/admin review fields.
-- Safe for existing users and chef profiles; no existing data is rewritten here.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "surname" TEXT;

ALTER TABLE "ChefProfile"
  ADD COLUMN IF NOT EXISTS "careerStage" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT;

