/*
  Warnings:

  - Added the required column `updatedAt` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `mbcs_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `mbcs_payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `mec_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `uac_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `uac_payroll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "expenses" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "expenses" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "mbcs_payments" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "mbcs_payments" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "mbcs_payments" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "mbcs_payroll" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "mbcs_payroll" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "mbcs_payroll" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "mec_payments" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "mec_payments" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "mec_payments" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "uac_payments" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "uac_payments" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "uac_payments" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "uac_payroll" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "uac_payroll" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "uac_payroll" ALTER COLUMN "updatedAt" SET NOT NULL;
