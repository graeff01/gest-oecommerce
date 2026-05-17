-- Extend AdminClient with contact fields
ALTER TABLE "AdminClient"
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "contactEmail" TEXT;

-- AdminTask: CRM tasks per client
CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminTask_clientId_idx" ON "AdminTask"("clientId");
CREATE INDEX "AdminTask_done_idx" ON "AdminTask"("done");
CREATE INDEX "AdminTask_dueDate_idx" ON "AdminTask"("dueDate");

ALTER TABLE "AdminTask"
  ADD CONSTRAINT "AdminTask_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "AdminClient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AdminClientSnapshot: historical state for trend charts
CREATE TABLE "AdminClientSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "online" BOOLEAN NOT NULL,
    "salesLast7" INTEGER NOT NULL DEFAULT 0,
    "salesLast30" INTEGER NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "newCustomers30" INTEGER NOT NULL DEFAULT 0,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdminClientSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminClientSnapshot_clientId_capturedAt_idx" ON "AdminClientSnapshot"("clientId", "capturedAt");
CREATE INDEX "AdminClientSnapshot_capturedAt_idx" ON "AdminClientSnapshot"("capturedAt");

ALTER TABLE "AdminClientSnapshot"
  ADD CONSTRAINT "AdminClientSnapshot_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "AdminClient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
