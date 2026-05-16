CREATE TYPE "AdminClientStatus" AS ENUM ('SETUP', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED');

CREATE TYPE "AdminClientPlan" AS ENUM ('STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');

CREATE TABLE "AdminClient" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storeName" TEXT,
    "appUrl" TEXT,
    "databaseUrl" TEXT NOT NULL,
    "status" "AdminClientStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" "AdminClientPlan" NOT NULL DEFAULT 'STARTER',
    "monthlyFee" DECIMAL(12,2),
    "renewalDay" INTEGER,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminClient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminClient_key_key" ON "AdminClient"("key");
CREATE INDEX "AdminClient_status_idx" ON "AdminClient"("status");
CREATE INDEX "AdminClient_plan_idx" ON "AdminClient"("plan");
CREATE INDEX "AdminClient_createdAt_idx" ON "AdminClient"("createdAt");
