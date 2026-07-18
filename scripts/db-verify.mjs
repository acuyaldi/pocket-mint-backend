#!/usr/bin/env node
// Post-restore verification: row counts for the core tables, plus a foreign-key
// integrity check (orphaned rows would mean a partial/corrupt restore).
// See docs/backup-restore-runbook.md.
//
// Reads credentials ONLY from VERIFY_DATABASE_URL (never DATABASE_URL).

import { Client } from 'pg';

const url = process.env.VERIFY_DATABASE_URL;
if (!url) {
  console.error('VERIFY_DATABASE_URL is required (the database to verify).');
  process.exit(1);
}

const TABLES = ['users', 'wallets', 'transactions', 'installments', 'categories'];

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const counts = {};
    for (const table of TABLES) {
      const { rows } = await client.query(`select count(*)::int as n from "${table}"`);
      counts[table] = rows[0].n;
    }
    console.log('Row counts:', counts);

    const orphanChecks = [
      ['wallets.user_id -> users', `select count(*)::int as n from wallets w left join users u on u.id = w.user_id where u.id is null`],
      ['transactions.wallet_id -> wallets', `select count(*)::int as n from transactions t left join wallets w on w.id = t.wallet_id where w.id is null`],
      ['transactions.user_id -> users', `select count(*)::int as n from transactions t left join users u on u.id = t.user_id where u.id is null`],
      ['installments.wallet_id -> wallets', `select count(*)::int as n from installments i left join wallets w on w.id = i.wallet_id where w.id is null`],
    ];
    let orphanFound = false;
    for (const [label, sql] of orphanChecks) {
      const { rows } = await client.query(sql);
      const n = rows[0].n;
      console.log(`FK check [${label}]: ${n} orphaned row(s)`);
      if (n > 0) orphanFound = true;
    }

    const { rows: fkRows } = await client.query(
      `select count(*)::int as n from information_schema.table_constraints where constraint_type = 'FOREIGN KEY' and table_schema = 'public'`,
    );
    console.log(`Foreign key constraints present: ${fkRows[0].n}`);

    if (orphanFound) {
      console.error('VERIFY FAILED: orphaned foreign-key references found.');
      process.exit(1);
    }
    console.log('VERIFY OK');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
