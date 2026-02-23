-- Per-org invoice counter migration
-- Add organization column to invoice_counters and change to composite PK

-- Step 1: Add organization column with a default value for existing rows
ALTER TABLE "invoice_counters" ADD COLUMN "organization" TEXT NOT NULL DEFAULT 'uac';

-- Step 2: Drop the old single-column primary key
ALTER TABLE "invoice_counters" DROP CONSTRAINT "invoice_counters_pkey";

-- Step 3: Drop the default (no longer needed for new inserts)
ALTER TABLE "invoice_counters" ALTER COLUMN "organization" DROP DEFAULT;

-- Step 4: Add composite primary key
ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("year", "organization");
