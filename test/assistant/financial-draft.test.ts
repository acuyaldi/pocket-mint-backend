import { describe, expect, it } from 'vitest';
import { renderTransactionDraftPreview, validateIdempotencyKey } from '../../src/assistant/financial-draft';

describe('financial draft helpers', () => {
  it('renders a deterministic preview that requires confirmation', () => {
    const preview = renderTransactionDraftPreview({
      type: 'EXPENSE', amount: '12500.50', walletId: 'wallet-1', categoryId: 'category-1',
      date: '2026-07-22', description: 'Lunch',
    }, 'Cash', 'Food');
    expect(preview).toBe('Draft transaksi EXPENSE sebesar 12500.50 pada 2026-07-22 (wallet Cash, kategori Food, catatan: Lunch). Konfirmasi eksplisit diperlukan sebelum transaksi dibuat.');
    expect(preview).not.toContain('category-1');
  });

  it('renders a safe merchant label without exposing a mapping identifier', () => {
    const preview = renderTransactionDraftPreview({
      type: 'EXPENSE', amount: '45000', walletId: 'wallet-1', categoryId: 'category-1',
      date: '2026-07-23', description: 'Meeting',
    }, 'BCA', 'Food', 'Starbucks');
    expect(preview).toContain('wallet BCA, kategori Food, merchant Starbucks');
    expect(preview).not.toContain('category-1');
    expect(preview).not.toContain('merchant-mapping');
  });

  it.each(['', ' ', 'a'.repeat(129), 'contains space', 'slash/key'])('rejects malformed idempotency keys', (key) => {
    expect(() => validateIdempotencyKey(key)).toThrow();
  });

  it('accepts a bounded opaque idempotency key', () => {
    expect(validateIdempotencyKey('confirm_01J4ABC-def.123')).toBe('confirm_01J4ABC-def.123');
  });
});
