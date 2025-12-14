/*
  Warnings:

  - A unique constraint covering the columns `[duelKey]` on the table `DuelResult` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DuelResult" DROP CONSTRAINT "DuelResult_userId_fkey";

-- CreateIndex
CREATE INDEX "DuelResult_userId_idx" ON "DuelResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DuelResult_duelKey_key" ON "DuelResult"("duelKey");

-- AddForeignKey
ALTER TABLE "DuelResult" ADD CONSTRAINT "DuelResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
