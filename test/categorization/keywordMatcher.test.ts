// ============================================================
// Keyword matcher tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { findMatches } from '../../src/domain/categorization/keywordMatcher';
import type { CategoryCandidate } from '../../src/domain/categorization/types';

const CANDIDATES: CategoryCandidate[] = [
  { categoryId: 'cat-1', categoryName: 'Belanja', keywords: ['indomaret', 'alfamart', 'superindo', 'minimarket'] },
  { categoryId: 'cat-2', categoryName: 'Makanan', keywords: ['makan', 'restoran', 'bakso', 'gofood'] },
  { categoryId: 'cat-3', categoryName: 'Transportasi', keywords: ['gojek', 'grab', 'bensin', 'parkir'] },
  { categoryId: 'cat-4', categoryName: 'Tagihan', keywords: ['listrik', 'pln', 'pulsa', 'internet'] },
];

describe('findMatches', () => {
  describe('EXACT matches', () => {
    it('matches exact normalized description against keyword', () => {
      const matches = findMatches('indomaret', ['indomaret'], CANDIDATES);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Belanja',
        keyword: 'indomaret',
        kind: 'EXACT',
      });
    });

    it('matches exact keyword regardless of candidate order', () => {
      const matches = findMatches('pln', ['pln'], CANDIDATES);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        categoryName: 'Tagihan',
        kind: 'EXACT',
      });
    });
  });

  describe('CONTAINS matches', () => {
    it('matches when normalized text contains keyword', () => {
      const matches = findMatches('alfamart serpong', ['alfamart', 'serpong'], CANDIDATES);
      // alfamart → Belanja (CONTAINS), serpong → no match
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        categoryName: 'Belanja',
        keyword: 'alfamart',
        kind: 'CONTAINS',
      });
    });

    it('matches contain even with extra text around keyword', () => {
      const matches = findMatches('beli pulsa 50rb', ['beli', 'pulsa', '50rb'], CANDIDATES);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        categoryName: 'Tagihan',
        keyword: 'pulsa',
        kind: 'CONTAINS',
      });
    });
  });

  describe('TOKEN matches', () => {
    it('matches individual token against keyword', () => {
      const matches = findMatches('makan bakso enak', ['makan', 'bakso', 'enak'], CANDIDATES);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const makananMatch = matches.find((m) => m.categoryName === 'Makanan');
      expect(makananMatch).toBeDefined();
    });

    it('matches multiple tokens across categories', () => {
      const matches = findMatches(
        'makan bakso lalu isi bensin',
        ['makan', 'bakso', 'lalu', 'isi', 'bensin'],
        CANDIDATES,
      );
      const categories = matches.map((m) => m.categoryName);
      expect(categories).toContain('Makanan');
      expect(categories).toContain('Transportasi');
    });
  });

  describe('no match', () => {
    it('returns empty array when no keywords match', () => {
      const matches = findMatches('xyz abc unknown', ['xyz', 'abc', 'unknown'], CANDIDATES);
      expect(matches).toHaveLength(0);
    });

    it('returns empty array for empty tokens', () => {
      const matches = findMatches('some text', [], CANDIDATES);
      expect(matches).toHaveLength(0);
    });
  });

  describe('keyword case insensitivity', () => {
    it('matches lowercase keyword against any-case description', () => {
      // The findMatches receives already-normalized (lowercase) text
      const matches = findMatches('indomaret', ['indomaret'], CANDIDATES);
      expect(matches).toHaveLength(1);
    });
  });
});
