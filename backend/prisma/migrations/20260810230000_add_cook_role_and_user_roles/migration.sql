-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'COOK';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: each existing user gets their current role in the roles array
UPDATE "User" SET "roles" = ARRAY["role"::TEXT] WHERE "roles" IS NULL OR array_length("roles", 1) IS NULL;
