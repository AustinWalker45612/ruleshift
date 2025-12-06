/*
  Warnings:

  - You are about to drop the column `duelsPlayed` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `duelsWon` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `totalXp` on the `Player` table. All the data in the column will be lost.
  - Added the required column `clientId` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seatIndex` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "duelsPlayed",
DROP COLUMN "duelsWon",
DROP COLUMN "totalXp",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "roomId" TEXT NOT NULL,
ADD COLUMN     "seatIndex" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Player_roomId_idx" ON "Player"("roomId");

-- CreateIndex
CREATE INDEX "Player_clientId_idx" ON "Player"("clientId");
