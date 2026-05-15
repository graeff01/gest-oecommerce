ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "financeCategories" TEXT[] NOT NULL DEFAULT '{}';
