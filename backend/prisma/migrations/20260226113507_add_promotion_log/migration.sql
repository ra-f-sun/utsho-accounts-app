-- CreateTable
CREATE TABLE "promotion_logs" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClass" INTEGER NOT NULL,
    "toClass" INTEGER NOT NULL,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promotedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "promotion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotion_logs_organization_studentId_idx" ON "promotion_logs"("organization", "studentId");

-- CreateIndex
CREATE INDEX "promotion_logs_promotedAt_idx" ON "promotion_logs"("promotedAt");
