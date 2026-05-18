-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FinancialTransaction_deletedAt_idx" ON "FinancialTransaction"("deletedAt");
