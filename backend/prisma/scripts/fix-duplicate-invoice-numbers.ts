/**
 * fix-duplicate-invoice-numbers.ts
 *
 * Cleans up duplicate invoiceNumber values in uac_payments and mbcs_payments,
 * then applies the UNIQUE constraint migration (DB-01).
 *
 * Strategy:
 *   - For each set of duplicates, keep the row with the latest createdAt.
 *   - Reassign a new synthetic invoiceNumber to every older duplicate
 *     in the format:  ORIG-DUP-<shortId>  (e.g. UAC-2026-0024-DUP-a3f2)
 *   - After cleanup, apply the unique index from the migration SQL.
 *
 * Run:
 *   cd backend
 *   npx ts-node prisma/scripts/fix-duplicate-invoice-numbers.ts
 *
 * Safe to run multiple times (idempotent — only touches actual duplicates).
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLES = ['uac_payments', 'mbcs_payments', 'mec_payments'] as const;

async function findDuplicates(table: string) {
  const { rows } = await pool.query<{ invoiceNumber: string; cnt: string }>(
    `SELECT "invoiceNumber", COUNT(*) as cnt
     FROM "${table}"
     GROUP BY "invoiceNumber"
     HAVING COUNT(*) > 1
     ORDER BY cnt DESC, "invoiceNumber"`,
  );
  return rows;
}

async function fixTable(table: string) {
  const dupes = await findDuplicates(table);

  if (dupes.length === 0) {
    console.log(`  ✅  ${table}: no duplicates`);
    return;
  }

  console.log(`  ⚠️   ${table}: ${dupes.length} duplicate invoice number(s) found`);

  for (const { invoiceNumber, cnt } of dupes) {
    // Fetch all rows with this invoiceNumber, oldest first
    const { rows } = await pool.query<{ id: string; createdAt: Date; isDueCollection: boolean }>(
      `SELECT id, "createdAt", "isDueCollection"
       FROM "${table}"
       WHERE "invoiceNumber" = $1
       ORDER BY "createdAt" ASC`,
      [invoiceNumber],
    );

    // Keep the LAST (newest) row — rename all the others
    const toRename = rows.slice(0, -1); // all but the last

    for (const row of toRename) {
      const suffix = randomBytes(3).toString('hex'); // 6-char hex, e.g. "a3f2c1"
      const newInvoiceNumber = `${invoiceNumber}-DUP-${suffix}`;

      await pool.query(
        `UPDATE "${table}" SET "invoiceNumber" = $1 WHERE id = $2`,
        [newInvoiceNumber, row.id],
      );

      console.log(
        `    renamed  id=${row.id.slice(0, 8)}…  ${invoiceNumber}  →  ${newInvoiceNumber}` +
        `  (isDueCollection=${row.isDueCollection})`,
      );
    }
  }
}

async function applyUniqueIndexes() {
  console.log('\n📌  Applying UNIQUE indexes…');

  for (const table of TABLES) {
    await pool.query(`DROP INDEX IF EXISTS "${table}_invoiceNumber_idx"`);
    await pool.query(
      `CREATE UNIQUE INDEX "${table}_invoiceNumber_key" ON "${table}"("invoiceNumber")`,
    );
    console.log(`  ✅  ${table}: unique index applied`);
  }
}

async function verifyUniqueness() {
  console.log('\n🔍  Verifying — checking for remaining duplicates…');
  let allClean = true;

  for (const table of TABLES) {
    const { rows } = await pool.query(
      `SELECT "invoiceNumber", COUNT(*) as cnt
       FROM "${table}"
       GROUP BY "invoiceNumber"
       HAVING COUNT(*) > 1`,
    );

    if (rows.length > 0) {
      console.error(`  ❌  ${table}: still has ${rows.length} duplicate(s)!`);
      allClean = false;
    } else {
      console.log(`  ✅  ${table}: all invoice numbers are unique`);
    }
  }

  return allClean;
}

async function main() {
  console.log('🧹  Cleaning duplicate invoice numbers…\n');

  try {
    // Step 1: Fix duplicates in each table
    for (const table of TABLES) {
      await fixTable(table);
    }

    // Step 2: Verify all clean before touching indexes
    const clean = await verifyUniqueness();
    if (!clean) {
      console.error('\n❌  Aborting — duplicates still present. Check logs above.');
      process.exit(1);
    }

    // Step 3: Apply unique indexes
    await applyUniqueIndexes();

    // Step 4: Final verification
    const finalClean = await verifyUniqueness();
    if (!finalClean) {
      console.error('\n❌  Something went wrong after applying indexes.');
      process.exit(1);
    }

    console.log('\n✅  Done. All payment tables now have unique invoiceNumber constraints.');
    console.log(
      '\n⚠️   Remember to update schema.prisma:\n' +
      '     Change `invoiceNumber String` to `invoiceNumber String @unique`\n' +
      '     on UacPayment, MbcsPayment, and MecPayment models.\n' +
      '     Then run: npx prisma migrate resolve --applied 20260328000000_add_unique_payment_invoice_numbers',
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
