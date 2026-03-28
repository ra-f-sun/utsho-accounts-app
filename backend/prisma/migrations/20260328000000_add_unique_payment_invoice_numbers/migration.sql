-- ⚠️  Before applying: ensure no duplicate invoiceNumber values exist in each table.
-- Check with:
--   SELECT invoiceNumber, COUNT(*) FROM uac_payments GROUP BY invoiceNumber HAVING COUNT(*) > 1;
--   SELECT invoiceNumber, COUNT(*) FROM mbcs_payments GROUP BY invoiceNumber HAVING COUNT(*) > 1;
--   SELECT invoiceNumber, COUNT(*) FROM mec_payments GROUP BY invoiceNumber HAVING COUNT(*) > 1;

-- AddUniqueConstraint: uac_payments.invoiceNumber
DROP INDEX IF EXISTS "uac_payments_invoiceNumber_idx";
CREATE UNIQUE INDEX "uac_payments_invoiceNumber_key" ON "uac_payments"("invoiceNumber");

-- AddUniqueConstraint: mbcs_payments.invoiceNumber
DROP INDEX IF EXISTS "mbcs_payments_invoiceNumber_idx";
CREATE UNIQUE INDEX "mbcs_payments_invoiceNumber_key" ON "mbcs_payments"("invoiceNumber");

-- AddUniqueConstraint: mec_payments.invoiceNumber
DROP INDEX IF EXISTS "mec_payments_invoiceNumber_idx";
CREATE UNIQUE INDEX "mec_payments_invoiceNumber_key" ON "mec_payments"("invoiceNumber");
