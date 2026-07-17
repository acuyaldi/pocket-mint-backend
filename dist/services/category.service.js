"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.DEFAULT_CATEGORIES = void 0;
exports.createCategoryService = createCategoryService;
const prisma_1 = __importDefault(require("../lib/prisma"));
exports.DEFAULT_CATEGORIES = {
    EXPENSE: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Lainnya'],
    INCOME: ['Gaji', 'Bonus', 'Investasi', 'Hadiah', 'Lainnya'],
};
function createCategoryService(db) {
    async function ensureDefaultCategories(userId) {
        const entries = Object.entries(exports.DEFAULT_CATEGORIES)
            .flatMap(([type, names]) => names.map((name) => ({ type, name })));
        await Promise.all(entries.map(({ type, name }) => db.category.upsert({
            where: { userId_name_type: { userId, name, type } },
            create: { userId, name, type },
            update: {},
        })));
    }
    async function listCategories(userId) {
        await ensureDefaultCategories(userId);
        return db.category.findMany({
            where: { userId },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
    }
    return { ensureDefaultCategories, listCategories };
}
exports.categoryService = createCategoryService(prisma_1.default);
//# sourceMappingURL=category.service.js.map