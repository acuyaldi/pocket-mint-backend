// ============================================================
// Categorization suggestion service
// ------------------------------------------------------------
// Thin service layer: fetches the user's categories, maps them
// to keyword candidates, delegates to the pure suggestion engine.
// Follows the existing DI pattern (factory + narrow Prisma Pick).
// ============================================================

import prisma from '../lib/prisma';
import type { PrismaClient } from '../generated/prisma/client';
import { generateSuggestions } from '../domain/categorization';
import type { CategorySuggestion, CategoryCandidate } from '../domain/categorization';

// ============================================================
// Keyword → category mapping
// ------------------------------------------------------------
// Maps Indonesian keywords to the default category names.
// Keywords are matched against the user's actual categories by
// name at query time, so the service works with any category set.
//
// ponytail: a static Map is fine for this phase. When Merchant
// Mapping (Phase 19) lands, this becomes the fallback after
// merchant-alias lookup.
// ============================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // ── EXPENSE ──────────────────────────────────────────────
  Makanan: [
    'makan', 'minum', 'restoran', 'resto', 'cafe', 'kafe', 'kopi',
    'bakso', 'sate', 'nasi', 'mie', 'ayam', 'gorengan', 'martabak',
    'warteg', 'warung', 'rm ', 'kedai', 'depot', 'food', 'dapur',
    'gofood', 'grabfood', 'shopeefood', 'mcd', 'kfc', 'hokben',
    'starbucks', 'janji jiwa', 'mixue',
  ],
  Transportasi: [
    'transport', 'bensin', 'pertamina', 'shell', 'spbu', 'bbm',
    'parkir', 'tol', 'gojek', 'grab', 'ojek', 'taksi', 'bus',
    'kereta', 'krl', 'mrt', 'transjakarta', 'damri', 'travel',
    'tiket', 'airport', 'bandara',
  ],
  Belanja: [
    'belanja', 'minimarket', 'supermarket', 'indomaret', 'alfamart',
    'alfamidi', 'superindo', 'transmart', 'carrefour', 'hypermart',
    'market', 'mart', 'toko', 'shopee', 'tokopedia', 'lazada',
    'bukalapak', 'bli bli', 'blibli', 'ecommerce', 'online',
    'fashion', 'baju', 'celana', 'sepatu', 'tas',
    'elektronik', 'gadget', 'hp', 'laptop',
  ],
  Tagihan: [
    'tagihan', 'listrik', 'pln', 'air', 'pdam', 'pam',
    'internet', 'wifi', 'indihome', 'telkom', 'pulsa', 'paket',
    'tv kabel', 'streaming', 'netflix', 'spotify', 'disney',
    'sewa', 'kos', 'kontrakan', 'iuran', 'bpjs', 'asuransi',
    'pajak', 'administrasi', 'admin',
  ],
  Kesehatan: [
    'kesehatan', 'dokter', 'rs ', 'rumah sakit', 'klinik', 'puskesmas',
    'obat', 'apotek', 'farmasi', 'kimia farma', 'century',
    'sehat', 'medical', 'lab', 'laboratorium', 'cek up',
    'gigi', 'mata', 'kulit', 'vitamin', 'suplemen',
  ],
  Hiburan: [
    'hiburan', 'bioskop', 'xxi', 'cgv', 'cinema', 'nonton',
    'game', 'steam', 'playstation', 'netflix', 'youtube',
    'liburan', 'hotel', 'traveloka', 'tiket.com', 'agoda',
    'wisata', 'taman', 'rekreasi', 'hobi', 'main', 'mall',
  ],
  Lainnya: [
    'lainnya', 'lain lain', 'misc', 'other', 'umum',
    'transfer', 'tarik tunai', 'atm', 'bank',
  ],

  // ── INCOME ───────────────────────────────────────────────
  Gaji: [
    'gaji', 'salary', 'payroll', 'upah', 'honor', 'honorarium',
    'THR', 'tunjangan', 'bulanan',
  ],
  Bonus: [
    'bonus', 'insentif', 'komisi', 'reward', 'prestasi',
    'tambahan', 'lembur', 'overtime',
  ],
  Investasi: [
    'investasi', 'saham', 'reksadana', 'obligasi', 'deposito',
    'dividen', 'kupon', 'bunga', 'capital gain', 'trading',
    'crypto', 'bitcoin', 'forex', 'emas', 'properti',
  ],
  Hadiah: [
    'hadiah', 'giveaway', 'undian', 'doorprize', 'kado',
    'angpao', 'amplop', 'oleh oleh', 'parsel',
  ],
};

/**
 * Build CategoryCandidate[] from a user's categories by matching
 * category names against the keyword map.
 */
function buildCandidates(
  categories: Array<{ id: string; name: string }>,
): CategoryCandidate[] {
  return categories
    .map((cat) => {
      const keywords = CATEGORY_KEYWORDS[cat.name] ?? [];
      return { categoryId: cat.id, categoryName: cat.name, keywords };
    })
    .filter((c) => c.keywords.length > 0);
}

// ============================================================
// Service factory
// ============================================================

type CategorizationPrismaClient = Pick<PrismaClient, 'category'>;

export function createCategorizationService(db: CategorizationPrismaClient) {
  /**
   * Get category suggestions for a transaction description.
   *
   * Fetches the user's categories, builds keyword candidates, and
   * runs the deterministic matching engine. Returns up to 5 ranked
   * suggestions ordered by confidence.
   *
   * Returns an empty array when the description is empty or no
   * keywords match.
   */
  async function getSuggestions(
    userId: string,
    description: string,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<CategorySuggestion[]> {
    const descriptionTrimmed = description?.trim() ?? '';
    if (descriptionTrimmed.length === 0) return [];

    // Fetch categories of the matching type for this user
    const categories = await db.category.findMany({
      where: { userId, type },
      select: { id: true, name: true },
    });

    if (categories.length === 0) return [];

    const candidates = buildCandidates(categories);
    if (candidates.length === 0) return [];

    return generateSuggestions({
      description: descriptionTrimmed,
      type,
      candidates,
    });
  }

  return { getSuggestions };
}

/** Production instance bound to the shared Prisma singleton. */
export const categorizationService = createCategorizationService(prisma);
