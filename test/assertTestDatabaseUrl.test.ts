import { describe, it, expect } from 'vitest';
import { assertTestDatabaseUrl } from '../src/lib/assertTestDatabaseUrl';

describe('assertTestDatabaseUrl', () => {
  it('accepts a disposable local/CI database URL', () => {
    expect(() => assertTestDatabaseUrl('postgresql://postgres:postgres@localhost:5432/pocketmint_test')).not.toThrow();
  });

  it('rejects a Supabase host', () => {
    expect(() => assertTestDatabaseUrl('postgresql://postgres:pw@db.abcxyz.supabase.co:5432/postgres')).toThrow(
      /production/,
    );
  });

  it('rejects the Supabase default database name even on a non-Supabase host', () => {
    expect(() => assertTestDatabaseUrl('postgresql://postgres:pw@some-managed-host:5432/postgres')).toThrow(
      /production/,
    );
  });

  it('rejects a malformed URL', () => {
    expect(() => assertTestDatabaseUrl('not-a-url')).toThrow();
  });
});
