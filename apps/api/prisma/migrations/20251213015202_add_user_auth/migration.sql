/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Player_clientId_key" ON "Player"("clientId");
