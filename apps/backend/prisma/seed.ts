import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

// Data demo dengan id yang mudah diingat, biar gampang dipakai pas testing API.
// Idempotent (pakai upsert) — aman dijalankan berkali-kali.
async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'usr_demo' },
    update: {},
    create: {
      id: 'usr_demo',
      email: 'demo@pocketmint.local',
      name: 'Demo User',
      password: 'not-a-real-password-change-me', // placeholder; auth belum diimplementasikan
    },
  });

  const account = await prisma.account.upsert({
    where: { id: 'acc_cash' },
    update: {},
    create: {
      id: 'acc_cash',
      userId: user.id,
      name: 'Cash',
      type: 'CASH',
      currency: 'IDR',
    },
  });

  const incomeCat = await prisma.category.upsert({
    where: { id: 'cat_salary' },
    update: {},
    create: { id: 'cat_salary', userId: user.id, name: 'Gaji', type: 'INCOME' },
  });

  const expenseCat = await prisma.category.upsert({
    where: { id: 'cat_food' },
    update: {},
    create: { id: 'cat_food', userId: user.id, name: 'Makan', type: 'EXPENSE' },
  });

  console.log('✅ Seed selesai. Pakai id berikut buat testing:');
  console.log(`   userId       = ${user.id}`);
  console.log(`   accountId    = ${account.id}`);
  console.log(`   categoryId   = ${expenseCat.id} (Makan / EXPENSE)`);
  console.log(`   categoryId   = ${incomeCat.id} (Gaji / INCOME)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
