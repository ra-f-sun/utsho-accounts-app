-- AlterTable
ALTER TABLE "mbcs_payments" ADD COLUMN     "isDueCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentInvoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "mbcs_payroll" ADD COLUMN     "dueAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isDueCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentPayrollId" TEXT;

-- AlterTable
ALTER TABLE "mec_payments" ADD COLUMN     "isDueCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentInvoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "uac_payments" ADD COLUMN     "isDueCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentInvoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "uac_payroll" ADD COLUMN     "dueAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isDueCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentPayrollId" TEXT;

-- CreateIndex
CREATE INDEX "mbcs_payments_parentInvoiceNumber_idx" ON "mbcs_payments"("parentInvoiceNumber");

-- CreateIndex
CREATE INDEX "mec_payments_parentInvoiceNumber_idx" ON "mec_payments"("parentInvoiceNumber");

-- CreateIndex
CREATE INDEX "uac_payments_parentInvoiceNumber_idx" ON "uac_payments"("parentInvoiceNumber");
