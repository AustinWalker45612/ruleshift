/*
  Warnings:

  - You are about to drop the column `duelsPlayed` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `duelsWon` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `totalXp` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `duelsLost` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `duelsPlayed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `duelsWon` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `totalScore` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,duelKey]` on the table `DuelResult` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `outcome` on the `DuelResult` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `clientId` on table `Player` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DuelOutcome" AS ENUM ('WIN', 'LOSS');

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_userId_fkey";

-- DropIndex
DROP INDEX "DuelResult_duelKey_key";

-- AlterTable
ALTER TABLE "DuelResult" DROP COLUMN "outcome",
ADD COLUMN     "outcome" "DuelOutcome" NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "duelsPlayed",
DROP COLUMN "duelsWon",
DROP COLUMN "totalXp",
DROP COLUMN "userId",
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "clientId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "duelsLost",
DROP COLUMN "duelsPlayed",
DROP COLUMN "duelsWon",
DROP COLUMN "totalScore",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "DuelResult_createdAt_idx" ON "DuelResult"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DuelResult_userId_duelKey_key" ON "DuelResult"("userId", "duelKey");

-- CreateIndex
CREATE INDEX "Player_clientId_idx" ON "Player"("clientId");
