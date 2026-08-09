-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'RIDER';

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicle" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rider_userId_key" ON "Rider"("userId");

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryCode" TEXT,
ADD COLUMN "riderId" TEXT,
ADD COLUMN "riderStatus" TEXT NOT NULL DEFAULT 'UNASSIGNED',
ADD COLUMN "riderFeeKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "riderPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveredCodeVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryCode_key" ON "Order"("deliveryCode");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
