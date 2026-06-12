import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionTable, Transaction } from "@/components/dashboard/transaction-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Download,
  ArrowRight,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STATS = {
  balance: {
    value: 24_750_000,
    trend: 8.2,
    subtitle: "Dari bulan lalu",
  },
  income: {
    value: 12_500_000,
    trend: 12.5,
    subtitle: "Juni 2026",
  },
  expense: {
    value: 4_320_000,
    trend: -3.1,
    subtitle: "Juni 2026",
  },
};

const TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    date: "2026-06-12",
    description: "Gaji Bulanan",
    category: "Pendapatan",
    type: "income",
    amount: 8_500_000,
    status: "completed",
  },
  {
    id: "t2",
    date: "2026-06-11",
    description: "Belanja Supermarket",
    category: "Kebutuhan",
    type: "expense",
    amount: 450_000,
    status: "completed",
  },
  {
    id: "t3",
    date: "2026-06-11",
    description: "Freelance Design Project",
    category: "Pendapatan",
    type: "income",
    amount: 2_000_000,
    status: "completed",
  },
  {
    id: "t4",
    date: "2026-06-10",
    description: "Tagihan Listrik PLN",
    category: "Utilitas",
    type: "expense",
    amount: 320_000,
    status: "completed",
  },
  {
    id: "t5",
    date: "2026-06-10",
    description: "Transfer ke Rekening Tabungan",
    category: "Tabungan",
    type: "transfer",
    amount: 2_000_000,
    status: "completed",
  },
  {
    id: "t6",
    date: "2026-06-09",
    description: "Netflix & Spotify",
    category: "Hiburan",
    type: "expense",
    amount: 118_000,
    status: "completed",
  },
  {
    id: "t7",
    date: "2026-06-09",
    description: "Dividen Saham BBCA",
    category: "Investasi",
    type: "income",
    amount: 750_000,
    status: "completed",
  },
  {
    id: "t8",
    date: "2026-06-08",
    description: "Ojek Online",
    category: "Transportasi",
    type: "expense",
    amount: 45_000,
    status: "completed",
  },
  {
    id: "t9",
    date: "2026-06-08",
    description: "Makan Siang Kantin",
    category: "Makanan",
    type: "expense",
    amount: 35_000,
    status: "completed",
  },
  {
    id: "t10",
    date: "2026-06-07",
    description: "Cicilan KPR",
    category: "Properti",
    type: "expense",
    amount: 1_500_000,
    status: "pending",
  },
  {
    id: "t11",
    date: "2026-06-07",
    description: "Bonus Proyek Q2",
    category: "Pendapatan",
    type: "income",
    amount: 1_250_000,
    status: "completed",
  },
  {
    id: "t12",
    date: "2026-06-06",
    description: "Gym Membership",
    category: "Kesehatan",
    type: "expense",
    amount: 250_000,
    status: "completed",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyShort(amount: number) {
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const savingsRate = Math.round(
    ((STATS.income.value - STATS.expense.value) / STATS.income.value) * 100
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Page Title ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Ringkasan Keuangan
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Selamat datang kembali! Ini ringkasan keuangan Anda bulan ini.
            </p>
          </div>
          <Button id="export-report-btn" variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
            <Download className="size-4" />
            Ekspor Laporan
          </Button>
        </div>

        {/* ── Stat Cards ── */}
        <section aria-label="Ringkasan statistik keuangan">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Saldo"
              value={formatCurrencyShort(STATS.balance.value)}
              subtitle={STATS.balance.subtitle}
              trend={STATS.balance.trend}
              icon={Wallet}
              variant="balance"
            />
            <StatCard
              title="Total Pemasukan"
              value={formatCurrencyShort(STATS.income.value)}
              subtitle={STATS.income.subtitle}
              trend={STATS.income.trend}
              icon={TrendingUp}
              variant="income"
            />
            <StatCard
              title="Total Pengeluaran"
              value={formatCurrencyShort(STATS.expense.value)}
              subtitle={STATS.expense.subtitle}
              trend={STATS.expense.trend}
              icon={TrendingDown}
              variant="expense"
            />
          </div>
        </section>

        {/* ── Savings Rate Banner ── */}
        <Card className="border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-foreground">Tingkat Tabungan Bulan Ini</span>
                <span className="text-xs text-muted-foreground">(Pendapatan - Pengeluaran) / Pendapatan</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-700"
                  style={{ width: `${savingsRate}%` }}
                />
              </div>
            </div>
            <div className="text-3xl font-bold text-primary tabular-nums">
              {savingsRate}%
            </div>
          </CardContent>
        </Card>

        {/* ── Transaction History ── */}
        <section aria-label="Riwayat transaksi">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Riwayat Transaksi</CardTitle>
                  <CardDescription className="text-sm mt-0.5">
                    {TRANSACTIONS.length} transaksi tercatat di bulan ini
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button id="view-all-transactions-btn" variant="ghost" size="sm" className="gap-1.5 text-xs text-primary hover:text-primary">
                    Lihat Semua
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <Button id="transaction-options-btn" variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <TransactionTable transactions={TRANSACTIONS} />
            </CardContent>
          </Card>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © 2026 Pocket Mint — Kelola Keuangan Lebih Cerdas
          </p>
          <p className="text-xs text-muted-foreground">
            Dibangun dengan Next.js & Shadcn/ui
          </p>
        </div>
      </footer>
    </div>
  );
}
