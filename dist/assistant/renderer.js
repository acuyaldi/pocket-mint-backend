"use strict";
// ============================================================
// Assistant Core — deterministic response renderer
// ------------------------------------------------------------
// Produces user-facing Indonesian text from validated tool
// output. One renderer per canonical result is sufficient for
// Phase 21.2 — no templating engine, no LLM SDK, no
// recomputation of financial values.
//
// The renderer is deterministic and unit-testable: same input
// always produces the same output.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMonthlySpendingSummary = renderMonthlySpendingSummary;
// ---- Month name helper ------------------------------------------------------
const MONTH_NAMES_ID = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
};
function formatMonthId(month) {
    const [year, m] = month.split('-');
    const name = MONTH_NAMES_ID[m] ?? m;
    return `${name} ${year}`;
}
// ---- Number formatting ------------------------------------------------------
function formatRupiah(value) {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    // Indonesian locale for thousands separator
    const formatted = abs.toLocaleString('id-ID');
    return `${sign}Rp${formatted}`;
}
// ---- Renderer ----------------------------------------------------------------
function renderMonthlySpendingSummary(data) {
    const monthLabel = formatMonthId(data.month);
    // No transactions at all
    if (data.transactionCount === 0) {
        return `Pada ${monthLabel}, belum ada transaksi tercatat.`;
    }
    const lines = [];
    // Main summary line
    lines.push(`Pada ${monthLabel}, total pengeluaran kamu adalah ${formatRupiah(data.totalExpense)} dari ${data.transactionCount} transaksi.`);
    // Top category
    if (data.topCategories.length > 0) {
        const top = data.topCategories[0];
        lines.push(`Kategori pengeluaran terbesar adalah ${top.name} sebesar ${formatRupiah(top.amount)}.`);
    }
    // Income and net savings
    lines.push(`Pemasukan bulan ini ${formatRupiah(data.totalIncome)} dan net savings ${formatRupiah(data.netSavings)}.`);
    return lines.join('\n');
}
//# sourceMappingURL=renderer.js.map