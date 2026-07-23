import { describe, expect, it } from 'vitest';
import { renderTransactionDraftPreview, validateIdempotencyKey } from '../../src/assistant/financial-draft';

describe('financial draft helpers', () => {
  it('renders a deterministic preview that requires confirmation', () => {
    const preview = renderTransactionDraftPreview({
      type: 'EXPENSE', amount: '12500.50', walletId: 'wallet-1', categoryId: 'category-1',
      date: '2026-07-22', description: 'Lunch',
    });
    expect(preview).toBe('Draft transaksi EXPENSE sebesar 12500.50 pada 2026-07-22 (wallet wallet-1, kategori category-1, catatan: Lunch). Konfirmasi eksplisit diperlukan sebelum transaksi dibuat.');
  });

  it('renders a safe merchant label without exposing a mapping identifier', () => {
    const preview = renderTransactionDraftPreview({
      type: 'EXPENSE', amount: '45000', walletId: 'wallet-1', categoryId: 'category-1',
      date: '2026-07-23', description: 'Meeting',
    }, 'BCA', 'Starbucks');
    expect(preview).toContain('wallet BCA, kategori category-1, merchant Starbucks');
    expect(preview).not.toContain('merchant-mapping');
  });

  it.each(['', ' ', 'a'.repeat(129), 'contains space', 'slash/key'])('rejects malformed idempotency keys', (key) => {
    expect(() => validateIdempotencyKey(key)).toThrow();
  });

  it('accepts a bounded opaque idempotency key', () => {
    expect(validateIdempotencyKey('confirm_01J4ABC-def.123')).toBe('confirm_01J4ABC-def.123');
  });
});
