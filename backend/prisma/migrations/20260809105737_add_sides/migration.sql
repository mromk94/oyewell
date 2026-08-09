-- CreateTable
CREATE TABLE "Side" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceKobo" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Side_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSide" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sideId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalKobo" INTEGER NOT NULL,

    CONSTRAINT "OrderSide_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderSide" ADD CONSTRAINT "OrderSide_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSide" ADD CONSTRAINT "OrderSide_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
