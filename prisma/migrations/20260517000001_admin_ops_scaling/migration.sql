CREATE TABLE "public"."AdminOnboardingItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminOnboardingItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."AdminBackupRun" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "itemCounts" JSONB,
    "error" TEXT,
    "triggeredBy" TEXT,

    CONSTRAINT "AdminBackupRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminOnboardingItem_clientId_key_key" ON "public"."AdminOnboardingItem"("clientId", "key");
CREATE INDEX "AdminOnboardingItem_clientId_done_idx" ON "public"."AdminOnboardingItem"("clientId", "done");
CREATE INDEX "AdminBackupRun_clientId_startedAt_idx" ON "public"."AdminBackupRun"("clientId", "startedAt");
CREATE INDEX "AdminBackupRun_status_idx" ON "public"."AdminBackupRun"("status");

ALTER TABLE "public"."AdminOnboardingItem" ADD CONSTRAINT "AdminOnboardingItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."AdminClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."AdminBackupRun" ADD CONSTRAINT "AdminBackupRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."AdminClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
