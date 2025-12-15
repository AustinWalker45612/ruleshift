/*
  Warnings:

  - You are about to drop the column `duelsLost` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `duelsPlayed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `duelsWon` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `playerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `totalScore` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_playerId_fkey";

-- DropIndex
DROP INDEX "DuelResult_duelKey_key";

-- DropIndex
DROP INDEX "User_playerId_key";

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "duelsLost",
DROP COLUMN "duelsPlayed",
DROP COLUMN "duelsWon",
DROP COLUMN "playerId",
DROP COLUMN "totalScore",
DROP COLUMN "updatedAt";

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
