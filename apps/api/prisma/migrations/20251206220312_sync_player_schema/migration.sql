/*
  Warnings:

  - You are about to drop the column `roomId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `seatIndex` on the `Player` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clientId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Player_clientId_idx";

-- DropIndex
DROP INDEX "Player_roomId_idx";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "roomId",
DROP COLUMN "seatIndex",
ADD COLUMN     "duelsPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duelsWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalXp" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Player_clientId_key" ON "Player"("clientId");
