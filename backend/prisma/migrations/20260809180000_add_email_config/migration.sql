-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "user" TEXT NOT NULL,
    "pass" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);
