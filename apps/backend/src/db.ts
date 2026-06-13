import { PrismaClient } from './generated/prisma';

export const prisma = new PrismaClient();

export async function ensureDefaultData() {
  // 1. Buat User Default
  const defaultUser = await prisma.user.upsert({
    where: { email: 'aldi@pocketmint.com' },
    update: {},
    create: {
      id: 'default-user-id',
      email: 'aldi@pocketmint.com',
      name: 'Aldi',
      password: 'supersecretpassword',
    },
  });

  // 2. Buat Wallet Default (Dompet)
  const defaultWallet = await prisma.wallet.upsert({
    where: { id: 'default-wallet-id' },
    update: {},
    create: {
      id: 'default-wallet-id',
      userId: defaultUser.id,
      name: 'Dompet Utama',
      type: 'CASH',
      balance: 1000000, // Saldo awal 1 juta Rupiah
    },
  });

  // 3. Buat Kategori Default
  const defaultCategory = await prisma.category.upsert({
    where: { userId_name_type: { userId: defaultUser.id, name: 'Makanan & Minuman', type: 'EXPENSE' } },
    update: {},
    create: {
      id: 'default-category-id',
      userId: defaultUser.id,
      name: 'Makanan & Minuman',
      type: 'EXPENSE',
      icon: '🍔',
    },
  });

  return { userId: defaultUser.id, walletId: defaultWallet.id, categoryId: defaultCategory.id };
}