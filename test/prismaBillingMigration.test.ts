import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const schemaPath = join(root, 'prisma', 'schema.prisma');
const migrationPath = join(
  root,
  'prisma',
  'migrations',
  '20260717000000_generalize_wallets_and_bills',
  'migration.sql',
);

describe('wallet and bill schema migration', () => {
  it('defines the explicit wallet taxonomy and billing fields', () => {
    const schema = readFileSync(schemaPath, 'utf8');

    expect(schema).toMatch(/enum WalletType\s*{[^}]*PAYLATER[^}]*LOAN/s);
    expect(schema).not.toMatch(/^\s*LOAN_PAYLATER\s*$/m);
    expect(schema).toContain('cutoffDay');
    expect(schema).toContain('paymentDueDay');
    expect(schema).toContain('enum BillKind');
    expect(schema).toContain('nextDueDate');
  });

  it('preserves existing paylater and installment data in SQL', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const migration = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';

    expect(migration).toContain('LOAN_PAYLATER');
    expect(migration).toContain('PAYLATER');
    expect(migration).toContain('paid_terms');
    expect(migration).toContain('next_due_date');
  });
});
