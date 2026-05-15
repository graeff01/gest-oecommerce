-- Make variantId nullable (existing rows keep their value, nothing breaks)
ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;

-- Add optional label for manual/legacy items
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "label" TEXT;
