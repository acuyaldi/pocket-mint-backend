"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.ensureDefaultData = ensureDefaultData;
const prisma_1 = require("./generated/prisma");
exports.prisma = new prisma_1.PrismaClient();
async function ensureDefaultData() {
    // 1. Buat User Default
    const defaultUser = await exports.prisma.user.upsert({
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
    const defaultWallet = await exports.prisma.wallet.upsert({
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
    const defaultCategory = await exports.prisma.category.upsert({
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
//# sourceMappingURL=db.js.map