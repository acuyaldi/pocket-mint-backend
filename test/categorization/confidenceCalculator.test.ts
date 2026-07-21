// ============================================================
// Confidence calculator tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { scoreMatches } from '../../src/domain/categorization/confidenceCalculator';
import type { KeywordMatch } from '../../src/domain/categorization/keywordMatcher';

describe('scoreMatches', () => {
  it('returns empty array for no matches', () => {
    expect(scoreMatches([])).toEqual([]);
  });

  it('assigns HIGH confidence to EXACT matches', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '1', categoryName: 'Belanja', keyword: 'indomaret', kind: 'EXACT' },
    ];
    const result = scoreMatches(matches);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      confidence: 'HIGH',
      reason: 'Exact match: "indomaret"',
    });
  });

  it('assigns MEDIUM confidence to CONTAINS matches', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '1', categoryName: 'Belanja', keyword: 'alfamart', kind: 'CONTAINS' },
    ];
    const result = scoreMatches(matches);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      confidence: 'MEDIUM',
      reason: 'Description contains: "alfamart"',
    });
  });

  it('assigns LOW confidence to TOKEN matches', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '2', categoryName: 'Makanan', keyword: 'makan', kind: 'TOKEN' },
    ];
    const result = scoreMatches(matches);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      confidence: 'LOW',
      reason: 'Word matches: "makan"',
    });
  });

  it('uses strongest match when multiple matches for same category', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '1', categoryName: 'Belanja', keyword: 'indomaret', kind: 'EXACT' },
      { categoryId: '1', categoryName: 'Belanja', keyword: 'mart', kind: 'CONTAINS' },
    ];
    const result = scoreMatches(matches);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('HIGH');
  });

  it('ranks by confidence then alphabetically', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '3', categoryName: 'Transportasi', keyword: 'bensin', kind: 'TOKEN' },
      { categoryId: '2', categoryName: 'Makanan', keyword: 'makan', kind: 'EXACT' },
      { categoryId: '1', categoryName: 'Belanja', keyword: 'alfamart', kind: 'CONTAINS' },
      { categoryId: '4', categoryName: 'Tagihan', keyword: 'listrik', kind: 'EXACT' },
    ];
    const result = scoreMatches(matches);
    expect(result.map((s) => s.categoryName)).toEqual([
      'Makanan',     // HIGH, M before T
      'Tagihan',     // HIGH
      'Belanja',     // MEDIUM
      'Transportasi', // LOW
    ]);
  });

  it('handles multiple categories with same confidence', () => {
    const matches: KeywordMatch[] = [
      { categoryId: '1', categoryName: 'Belanja', keyword: 'indomaret', kind: 'EXACT' },
      { categoryId: '3', categoryName: 'Transportasi', keyword: 'gojek', kind: 'EXACT' },
    ];
    const result = scoreMatches(matches);
    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe('HIGH');
    expect(result[1].confidence).toBe('HIGH');
    // Alphabetical within tier: Belanja < Transportasi
    expect(result[0].categoryName).toBe('Belanja');
    expect(result[1].categoryName).toBe('Transportasi');
  });
});
