-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "mbcs_payments" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "mbcs_payroll" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "mec_payments" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "uac_payments" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "uac_payroll" ADD COLUMN     "updatedBy" TEXT;
