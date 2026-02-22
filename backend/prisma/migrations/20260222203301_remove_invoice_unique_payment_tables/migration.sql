-- DropIndex
DROP INDEX "mbcs_payments_invoiceNumber_key";

-- DropIndex
DROP INDEX "mec_payments_invoiceNumber_key";

-- DropIndex
DROP INDEX "uac_payments_invoiceNumber_key";

-- CreateIndex
CREATE INDEX "mbcs_payments_invoiceNumber_idx" ON "mbcs_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "mec_payments_invoiceNumber_idx" ON "mec_payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "uac_payments_invoiceNumber_idx" ON "uac_payments"("invoiceNumber");
