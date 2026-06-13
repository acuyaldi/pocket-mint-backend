import { PrismaClient, Prisma } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Seed Pocket Mint — Idempotent (upsert), aman dijalankan berkali-kali.
// Flow: User → Categories → Wallets
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Mulai seed database...\n');

  // ── 1. Cari atau Buat User Default ─────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'user@pocketmint.com' },
    update: {},
    create: {
      email: 'user@pocketmint.com',
      name: 'User Default',
      password: 'password123', // placeholder; auth via Supabase di production
    },
  });

  console.log(`✅  User: "${user.name}" (id: ${user.id})`);

  // ── 2. Kategori Default ────────────────────────────────────
  const expenseCategories = [
    { name: 'Makan',     icon: '🍔' },
    { name: 'Transport', icon: '🚗' },
    { name: 'Belanja',   icon: '🛒' },
    { name: 'Hiburan',   icon: '🎮' },
    { name: 'Lainnya',   icon: '📦' },
  ];

  const incomeCategories = [
    { name: 'Gaji',    icon: '💰' },
    { name: 'Lainnya', icon: '💵' },
  ];

  for (const cat of expenseCategories) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: user.id, name: cat.name, type: 'EXPENSE' } },
      update: {},
      create: {
        userId: user.id,
        name: cat.name,
        type: 'EXPENSE',
        icon: cat.icon,
      },
    });
  }

  for (const cat of incomeCategories) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: user.id, name: cat.name, type: 'INCOME' } },
      update: {},
      create: {
        userId: user.id,
        name: cat.name,
        type: 'INCOME',
        icon: cat.icon,
      },
    });
  }

  console.log(`✅  Categories: ${expenseCategories.length} EXPENSE + ${incomeCategories.length} INCOME`);

  // ── 3. Wallet Contoh ───────────────────────────────────────
  const gopay = await prisma.wallet.upsert({
    where: { id: 'wal_gopay' },
    update: {},
    create: {
      id: 'wal_gopay',
      userId: user.id,
      name: 'GoPay',
      type: 'E_WALLET',
      balance: new Prisma.Decimal(500000),
      creditLimit: new Prisma.Decimal(0),
      initialBalance: new Prisma.Decimal(500000),
    },
  });

  const kredivo = await prisma.wallet.upsert({
    where: { id: 'wal_kredivo' },
    update: {},
    create: {
      id: 'wal_kredivo',
      userId: user.id,
      name: 'Kredivo',
      type: 'LOAN_PAYLATER',
      balance: new Prisma.Decimal(-200000),
      creditLimit: new Prisma.Decimal(3000000),
      initialBalance: new Prisma.Decimal(0),
    },
  });

  console.log(`✅  Wallets:`);
  console.log(`     ASSET → GoPay  (balance: ${gopay.balance})`);
  console.log(`     DEBT  → Kredivo (balance: ${kredivo.balance}, limit: ${kredivo.creditLimit})`);

  // ── Summary ────────────────────────────────────────────────
  console.log('\n🎉  Seed selesai!');
  console.log(`    userId         = ${user.id}`);
  console.log(`    walletId (ASSET) = ${gopay.id}`);
  console.log(`    walletId (DEBT)  = ${kredivo.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
