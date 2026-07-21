// ============================================================
// Merchant normalizer tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { normalizeMerchant, tokenize } from '../../src/domain/categorization/merchantNormalizer';

describe('normalizeMerchant', () => {
  describe('case normalization', () => {
    it('lowercases uppercase text', () => {
      expect(normalizeMerchant('INDOMARET')).toBe('indomaret');
    });

    it('lowercases mixed-case text', () => {
      expect(normalizeMerchant('AlfaMart')).toBe('alfamart');
    });
  });

  describe('whitespace normalization', () => {
    it('trims leading/trailing whitespace', () => {
      expect(normalizeMerchant('  indomaret  ')).toBe('indomaret');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeMerchant('go   jek   food')).toBe('go jek food');
    });
  });

  describe('payment prefix stripping', () => {
    it('strips TRF prefix', () => {
      expect(normalizeMerchant('TRF INDOMARET')).toBe('indomaret');
    });

    it('strips BAYAR prefix', () => {
      expect(normalizeMerchant('BAYAR Listrik')).toBe('listrik');
    });

    it('strips PEMBAYARAN prefix', () => {
      expect(normalizeMerchant('PEMBAYARAN tokopedia')).toBe('tokopedia');
    });

    it('strips TRANSFER prefix', () => {
      expect(normalizeMerchant('TRANSFER gaji')).toBe('gaji');
    });

    it('does not strip prefix from middle of text', () => {
      expect(normalizeMerchant('beli pulsa trf')).toBe('beli pulsa trf');
    });
  });

  describe('trailing number removal', () => {
    it('removes "#123" suffix', () => {
      expect(normalizeMerchant('INDOMARET #123')).toBe('indomaret');
    });

    it('removes "-001" suffix', () => {
      expect(normalizeMerchant('ALFAMART-001')).toBe('alfamart');
    });

    it('removes " 45678" suffix', () => {
      expect(normalizeMerchant('superindo 45678')).toBe('superindo');
    });

    it('preserves single-digit numbers that may be meaningful', () => {
      // A single digit after a space is not stripped (trailing requires 2+ digits)
      const result = normalizeMerchant('warteg 1');
      expect(result).toBe('warteg 1');
    });
  });

  describe('separator normalization', () => {
    it('replaces dashes with spaces', () => {
      expect(normalizeMerchant('go-jek')).toBe('go jek');
    });

    it('replaces underscores with spaces', () => {
      expect(normalizeMerchant('makan_siang')).toBe('makan siang');
    });
  });

  describe('repeated symbol collapsing', () => {
    it('collapses repeated hashes', () => {
      expect(normalizeMerchant('TRX ## belanja')).toBe('belanja');
    });
  });

  describe('edge cases', () => {
    it('returns empty for whitespace-only input', () => {
      expect(normalizeMerchant('   ')).toBe('');
    });

    it('handles empty string', () => {
      expect(normalizeMerchant('')).toBe('');
    });

    it('handles already-clean text', () => {
      expect(normalizeMerchant('indomaret')).toBe('indomaret');
    });

    it('handles only numbers', () => {
      expect(normalizeMerchant('12345')).toBe('12345');
    });
  });
});

describe('tokenize', () => {
  it('splits normalized text into tokens', () => {
    expect(tokenize('go jek food')).toEqual(['go', 'jek', 'food']);
  });

  it('filters tokens shorter than 2 characters', () => {
    expect(tokenize('a bb c ddd')).toEqual(['bb', 'ddd']);
  });

  it('strips non-alphanumeric from tokens', () => {
    expect(tokenize('belanja!')).toEqual(['belanja']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});
