-- CreateTable
CREATE TABLE "org_settings" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_settings_organization_idx" ON "org_settings"("organization");

-- CreateIndex
CREATE UNIQUE INDEX "org_settings_organization_settingKey_key" ON "org_settings"("organization", "settingKey");
