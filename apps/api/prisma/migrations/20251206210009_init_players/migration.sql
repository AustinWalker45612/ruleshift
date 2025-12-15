/*
  Warnings:

  - You are about to drop the column `clientId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `gamesPlayed` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `losses` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `wins` on the `Player` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Player_clientId_key";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "clientId",
DROP COLUMN "gamesPlayed",
DROP COLUMN "losses",
DROP COLUMN "wins",
ADD COLUMN     "duelsPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duelsWon" INTEGER NOT NULL DEFAULT 0;
