-- Data migration: Standardize payment method values to canonical set (cash, bkash, nagad, bank_transfer)
-- Old values: bank → bank_transfer, mobile → bkash

UPDATE mbcs_payments SET "paymentMethod" = 'bank_transfer' WHERE "paymentMethod" = 'bank';
UPDATE mbcs_payments SET "paymentMethod" = 'bkash' WHERE "paymentMethod" = 'mobile';

UPDATE expenses SET "paymentMethod" = 'bank_transfer' WHERE "paymentMethod" = 'bank';
UPDATE expenses SET "paymentMethod" = 'bkash' WHERE "paymentMethod" = 'mobile';

UPDATE mbcs_payroll SET "paymentMethod" = 'bank_transfer' WHERE "paymentMethod" = 'bank';
UPDATE mbcs_payroll SET "paymentMethod" = 'bkash' WHERE "paymentMethod" = 'mobile';
