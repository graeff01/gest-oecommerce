-- Safe index creation: all use IF NOT EXISTS so running twice is harmless
-- and existing data is never touched.

-- Customer
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");

-- ProductVariant
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_stockQuantity_idx" ON "ProductVariant"("stockQuantity");

-- StockMovement
CREATE INDEX IF NOT EXISTS "StockMovement_variantId_idx" ON "StockMovement"("variantId");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- Order
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_channel_idx" ON "Order"("channel");

-- FinancialTransaction
CREATE INDEX IF NOT EXISTS "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_createdAt_idx" ON "FinancialTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_dueDate_idx" ON "FinancialTransaction"("dueDate");

-- AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
