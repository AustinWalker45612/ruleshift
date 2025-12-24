-- CreateEnum
CREATE TYPE "MatchmakingStatus" AS ENUM ('WAITING', 'MATCHED', 'ABANDONED');

-- CreateTable
CREATE TABLE "MatchmakingRoom" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "MatchmakingStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "matchedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "MatchmakingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchmakingRoom_roomId_key" ON "MatchmakingRoom"("roomId");

-- CreateIndex
CREATE INDEX "MatchmakingRoom_status_createdAt_idx" ON "MatchmakingRoom"("status", "createdAt");
