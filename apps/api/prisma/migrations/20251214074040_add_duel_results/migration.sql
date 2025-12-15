-- CreateTable
CREATE TABLE "DuelResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duelKey" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "scoreEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuelResult_duelKey_key" ON "DuelResult"("duelKey");

-- AddForeignKey
ALTER TABLE "DuelResult" ADD CONSTRAINT "DuelResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
