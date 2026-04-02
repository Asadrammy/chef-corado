/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `commission` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[chefId,requestId]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventDate` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestCount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Menu" ADD COLUMN "cuisineType" TEXT;
ALTER TABLE "Menu" ADD COLUMN "eventType" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "bookingId" TEXT;
ALTER TABLE "Message" ADD COLUMN "offerId" TEXT;

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "duration" INTEGER NOT NULL,
    "includedServices" TEXT NOT NULL,
    "eventType" TEXT,
    "cuisineType" TEXT,
    "maxGuests" INTEGER,
    "minGuests" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'EASY',
    "tags" TEXT,
    "experienceImage" TEXT,
    "chefId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experience_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "ChefProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chefId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "recurringPattern" TEXT,
    "maxBookings" INTEGER NOT NULL DEFAULT 1,
    "currentBookings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Availability_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "ChefProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" TEXT NOT NULL,
    "processedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment_backup" (
    "id" TEXT,
    "bookingId" TEXT,
    "amount" REAL,
    "commission" REAL,
    "status" TEXT,
    "createdAt" num,
    "updatedAt" num
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "chefId" TEXT NOT NULL,
    "proposalId" TEXT,
    "experienceId" TEXT,
    "eventDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "guestCount" INTEGER NOT NULL,
    "totalPrice" REAL NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'PROPOSAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "specialRequests" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "ChefProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("chefId", "clientId", "createdAt", "id", "proposalId", "status", "totalPrice", "updatedAt") SELECT "chefId", "clientId", "createdAt", "id", "proposalId", "status", "totalPrice", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_proposalId_key" ON "Booking"("proposalId");
CREATE TABLE "new_ChefProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "experience" INTEGER,
    "location" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "radius" REAL NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "experienceLevel" TEXT NOT NULL DEFAULT 'BEGINNER',
    "cuisineType" TEXT,
    "profileImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChefProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChefProfile" ("bio", "createdAt", "experience", "id", "isApproved", "isBanned", "latitude", "location", "longitude", "profileImage", "radius", "updatedAt", "userId") SELECT "bio", "createdAt", "experience", "id", "isApproved", "isBanned", "latitude", "location", "longitude", "profileImage", "radius", "updatedAt", "userId" FROM "ChefProfile";
DROP TABLE "ChefProfile";
ALTER TABLE "new_ChefProfile" RENAME TO "ChefProfile";
CREATE UNIQUE INDEX "ChefProfile_userId_key" ON "ChefProfile"("userId");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "commissionAmount" REAL NOT NULL DEFAULT 0,
    "chefAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "stripePaymentIntentId" TEXT,
    "releasedAt" DATETIME,
    "releasedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_Payment" ("bookingId", "createdAt", "id", "status", "updatedAt") SELECT "bookingId", "createdAt", "id", "status", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_Payment_2" ON "Payment"("bookingId");
Pragma writable_schema=0;
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_Payment_3" ON "Payment"("stripePaymentIntentId");
Pragma writable_schema=0;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "budget" REAL NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Request_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("budget", "clientId", "createdAt", "details", "eventDate", "id", "latitude", "location", "longitude") SELECT "budget", "clientId", "createdAt", "details", "eventDate", "id", "latitude", "location", "longitude" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "experienceLevel" TEXT NOT NULL DEFAULT 'BEGINNER',
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isBanned", "name", "password", "resetToken", "resetTokenExpires", "role", "updatedAt") SELECT "createdAt", "email", "id", "isBanned", "name", "password", "resetToken", "resetTokenExpires", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Experience_title_idx" ON "Experience"("title");

-- CreateIndex
CREATE INDEX "Experience_price_idx" ON "Experience"("price");

-- CreateIndex
CREATE INDEX "Experience_chefId_idx" ON "Experience"("chefId");

-- CreateIndex
CREATE INDEX "Experience_createdAt_idx" ON "Experience"("createdAt");

-- CreateIndex
CREATE INDEX "Experience_isActive_idx" ON "Experience"("isActive");

-- CreateIndex
CREATE INDEX "Experience_cuisineType_idx" ON "Experience"("cuisineType");

-- CreateIndex
CREATE INDEX "Experience_eventType_idx" ON "Experience"("eventType");

-- CreateIndex
CREATE INDEX "Experience_difficulty_idx" ON "Experience"("difficulty");

-- CreateIndex
CREATE INDEX "Experience_isActive_createdAt_idx" ON "Experience"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_stripeEventId_key" ON "WebhookLog"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookLog_stripeEventId_idx" ON "WebhookLog"("stripeEventId");

-- CreateIndex
CREATE INDEX "WebhookLog_status_idx" ON "WebhookLog"("status");

-- CreateIndex
CREATE INDEX "WebhookLog_eventType_idx" ON "WebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_chefId_requestId_key" ON "Proposal"("chefId", "requestId");
