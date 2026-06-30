-- Remove o saldo em caixa (cashBalance) das configurações da loja
ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "cashBalance";
