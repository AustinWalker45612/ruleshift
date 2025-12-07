/*
  Warnings:

  - You are about to drop the column `clientId` on the `Player` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Player_clientId_key";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "clientId";
