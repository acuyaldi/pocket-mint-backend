// ============================================================
// Suggestion engine integration tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '../../src/domain/categorization/suggestionEngine';
import type { SuggestionInput, CategoryCandidate } from '../../src/domain/categorization/types';

const EXPENSE_CANDIDATES: CategoryCandidate[] = [
  { categoryId: 'cat-belanja', categoryName: 'Belanja', keywords: ['indomaret', 'alfamart', 'superindo', 'minimarket', 'shopee', 'tokopedia'] },
  { categoryId: 'cat-makanan', categoryName: 'Makanan', keywords: ['makan', 'restoran', 'bakso', 'gofood', 'grabfood', 'kopi', 'warteg'] },
  { categoryId: 'cat-transportasi', categoryName: 'Transportasi', keywords: ['gojek', 'grab', 'bensin', 'parkir', 'pertamina', 'spbu'] },
  { categoryId: 'cat-tagihan', categoryName: 'Tagihan', keywords: ['listrik', 'pln', 'pulsa', 'internet', 'indihome', 'bpjs'] },
  { categoryId: 'cat-kesehatan', categoryName: 'Kesehatan', keywords: ['dokter', 'obat', 'apotek', 'klinik', 'rs ', 'puskesmas'] },
  { categoryId: 'cat-hiburan', categoryName: 'Hiburan', keywords: ['bioskop', 'xxi', 'netflix', 'hotel', 'traveloka', 'game'] },
];

const INCOME_CANDIDATES: CategoryCandidate[] = [
  { categoryId: 'cat-gaji', categoryName: 'Gaji', keywords: ['gaji', 'salary', 'payroll', 'upah'] },
  { categoryId: 'cat-bonus', categoryName: 'Bonus', keywords: ['bonus', 'insentif', 'komisi'] },
  { categoryId: 'cat-investasi', categoryName: 'Investasi', keywords: ['saham', 'dividen', 'reksadana', 'deposito'] },
  { categoryId: 'cat-hadiah', categoryName: 'Hadiah', keywords: ['hadiah', 'giveaway', 'kado', 'angpao'] },
];

function input(overrides: Partial<SuggestionInput> = {}): SuggestionInput {
  return {
    description: 'INDOMARET #123',
    type: 'EXPENSE',
    candidates: EXPENSE_CANDIDATES,
    ...overrides,
  };
}

describe('generateSuggestions', () => {
  describe('normalization + matching pipeline', () => {
    it('suggests Belanja for "INDOMARET #123"', () => {
      const suggestions = generateSuggestions(input({ description: 'INDOMARET #123' }));
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].categoryName).toBe('Belanja');
      expect(suggestions[0].confidence).toBe('HIGH');
      expect(suggestions[0].matchedKeyword).toBe('indomaret');
      expect(suggestions[0].normalizedMerchant).toBe('indomaret');
    });

    it('suggests Belanja for "ALFAMART-001"', () => {
      const suggestions = generateSuggestions(input({ description: 'ALFAMART-001' }));
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].categoryName).toBe('Belanja');
      expect(suggestions[0].confidence).toBe('HIGH');
    });

    it('suggests Makanan for "makan bakso enak"', () => {
      const suggestions = generateSuggestions(input({ description: 'makan bakso enak' }));
      expect(suggestions.length).toBeGreaterThan(0);
      // 'makan' is a TOKEN match → LOW, 'bakso' is EXACT → HIGH
      // 'bakso' is an EXACT match on the full normalized text "makan bakso enak"
      // Actually, 'bakso' would be a CONTAINS match since "makan bakso enak" contains "bakso"
      const makananSuggestion = suggestions.find((s) => s.categoryName === 'Makanan');
      expect(makananSuggestion).toBeDefined();
    });

    it('strips payment prefix before matching', () => {
      const suggestions = generateSuggestions(input({ description: 'TRF GOJEK' }));
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].categoryName).toBe('Transportasi');
    });
  });

  describe('ranking', () => {
    it('returns HIGH before MEDIUM before LOW', () => {
      const suggestions = generateSuggestions(input({
        description: 'belanja di indomaret lalu makan bakso',
      }));
      // indomaret → Belanja HIGH (EXACT... wait, no — "belanja di indomaret lalu makan bakso"
      // contains "indomaret" → CONTAINS
      // contains "makan" → CONTAINS
      // contains "bakso" → CONTAINS
      // Let me check what happens
      expect(suggestions.length).toBeGreaterThan(0);
      for (let i = 1; i < suggestions.length; i++) {
        const prev = suggestions[i - 1].confidence;
        const curr = suggestions[i].confidence;
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        expect(order[prev]).toBeLessThanOrEqual(order[curr]);
      }
    });

    it('caps at 5 suggestions', () => {
      // Create a broad description that could match many things
      const suggestions = generateSuggestions(input({
        description: 'makan bakso beli pulsa isi bensin nonton bioskop belanja di indomaret',
      }));
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('income suggestions', () => {
    it('matches income keywords', () => {
      const suggestions = generateSuggestions({
        description: 'Gaji bulanan',
        type: 'INCOME',
        candidates: INCOME_CANDIDATES,
      });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].categoryName).toBe('Gaji');
    });

    it('suggests Bonus for incentive description', () => {
      const suggestions = generateSuggestions({
        description: 'Bonus Q4 2025',
        type: 'INCOME',
        candidates: INCOME_CANDIDATES,
      });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].categoryName).toBe('Bonus');
    });
  });

  describe('edge cases', () => {
    it('returns empty for empty description', () => {
      expect(generateSuggestions(input({ description: '' }))).toEqual([]);
    });

    it('returns empty for whitespace-only description', () => {
      expect(generateSuggestions(input({ description: '   ' }))).toEqual([]);
    });

    it('returns empty when no candidates', () => {
      expect(generateSuggestions(input({ candidates: [] }))).toEqual([]);
    });

    it('returns empty when no keywords match', () => {
      expect(generateSuggestions(input({ description: 'xyz abc unknown text' }))).toEqual([]);
    });

    it('returns empty when normalized text is empty', () => {
      expect(generateSuggestions(input({ description: 'TRF ##' }))).toEqual([]);
    });
  });

  describe('output shape', () => {
    it('every suggestion has all required fields', () => {
      const suggestions = generateSuggestions(input({ description: 'INDOMARET #123' }));
      for (const s of suggestions) {
        expect(s).toHaveProperty('categoryId');
        expect(s).toHaveProperty('categoryName');
        expect(s).toHaveProperty('confidence');
        expect(s).toHaveProperty('reason');
        expect(s).toHaveProperty('matchedKeyword');
        expect(s).toHaveProperty('normalizedMerchant');
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(s.confidence);
      }
    });
  });
});
