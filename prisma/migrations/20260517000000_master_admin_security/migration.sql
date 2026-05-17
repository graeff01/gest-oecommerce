CREATE TYPE "public"."MasterAdminRole" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'FINANCE');

CREATE TABLE "public"."MasterAdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."MasterAdminRole" NOT NULL DEFAULT 'OWNER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterAdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterAdminUser_email_key" ON "public"."MasterAdminUser"("email");
CREATE INDEX "MasterAdminUser_active_idx" ON "public"."MasterAdminUser"("active");
CREATE INDEX "MasterAdminUser_createdAt_idx" ON "public"."MasterAdminUser"("createdAt");
