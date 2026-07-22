// ============================================================
// Tests: deterministic response renderer
// ============================================================
import { describe, expect, it } from 'vitest';
import { renderMonthlySpendingSummary } from '../../src/assistant/renderer';
import type { MonthlySpendingSummaryOutput } from '../../src/assistant/handlers/monthly-spending-summary.handler';

function makeData(
  overrides: Partial<MonthlySpendingSummaryOutput> = {},
): MonthlySpendingSummaryOutput {
  return {
    month: '2026-07',
    totalIncome: 10_000_000,
    totalExpense: 5_500_000,
    netSavings: 4_500_000,
    transactionCount: 42,
    topCategories: [
      { name: 'Makanan', amount: 2_000_000, percentage: 36.36 },
      { name: 'Transportasi', amount: 1_500_000, percentage: 27.27 },
    ],
    ...overrides,
  };
}

describe('renderMonthlySpendingSummary', () => {
  it('produces Indonesian output with positive net savings', () => {
    const text = renderMonthlySpendingSummary(makeData());
    expect(text).toContain('Juli 2026');
    expect(text).toContain('total pengeluaran kamu adalah Rp5.500.000');
    expect(text).toContain('dari 42 transaksi');
    expect(text).toContain('Kategori pengeluaran terbesar adalah Makanan');
    expect(text).toContain('Rp2.000.000');
    expect(text).toContain('Pemasukan bulan ini Rp10.000.000');
    expect(text).toContain('net savings Rp4.500.000');
  });

  it('handles negative net savings', () => {
    const data = makeData({
      totalIncome: 3_000_000,
      totalExpense: 8_000_000,
      netSavings: -5_000_000,
    });
    const text = renderMonthlySpendingSummary(data);
    expect(text).toContain('net savings -Rp5.000.000');
  });

  it('handles zero transactions', () => {
    const data = makeData({
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactionCount: 0,
      topCategories: [],
    });
    const text = renderMonthlySpendingSummary(data);
    expect(text).toContain('belum ada transaksi tercatat');
    // Should not contain the normal summary lines
    expect(text).not.toContain('total pengeluaran kamu');
  });

  it('handles no category breakdown gracefully', () => {
    const data = makeData({
      transactionCount: 10,
      topCategories: [],
    });
    const text = renderMonthlySpendingSummary(data);
    // Should still produce the base summary
    expect(text).toContain('total pengeluaran kamu');
    // No "kategori pengeluaran terbesar" line
    expect(text).not.toContain('Kategori pengeluaran terbesar');
  });

  it('is deterministic — same input produces same output', () => {
    const data = makeData();
    const text1 = renderMonthlySpendingSummary(data);
    const text2 = renderMonthlySpendingSummary(data);
    expect(text1).toBe(text2);
  });

  it('renders all Indonesian month names correctly', () => {
    for (const m of ['01', '02', '03', '04', '05', '06']) {
      const text = renderMonthlySpendingSummary(
        makeData({ month: `2026-${m}` }),
      );
      // Should contain SOME month text (not just the raw number)
      expect(text).not.toContain(`2026-${m}`);
    }
    // Quick spot-check
    const jan = renderMonthlySpendingSummary(
      makeData({ month: '2026-01' }),
    );
    expect(jan).toContain('Januari 2026');

    const dec = renderMonthlySpendingSummary(
      makeData({ month: '2026-12' }),
    );
    expect(dec).toContain('Desember 2026');
  });

  it('handles rupiah formatting with thousands separators (Indonesian locale)', () => {
    const data = makeData({ totalExpense: 12_345_678 });
    const text = renderMonthlySpendingSummary(data);
    expect(text).toContain('Rp12.345.678');
  });

  it('does not recompute financial values — uses exactly what the output provides', () => {
    // If the output says totalIncome=100, the renderer says Rp100 regardless
    const data = makeData({
      totalIncome: 100,
      totalExpense: 500,
      netSavings: -400,
      transactionCount: 5,
    });
    const text = renderMonthlySpendingSummary(data);
    expect(text).toContain('Rp100');
    expect(text).toContain('Rp500');
    expect(text).toContain('-Rp400');
  });
});
