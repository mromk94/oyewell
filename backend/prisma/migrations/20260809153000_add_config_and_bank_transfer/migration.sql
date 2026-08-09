-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "PaymentMethodConfig" ADD COLUMN "config" JSONB;
