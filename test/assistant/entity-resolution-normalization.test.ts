import { describe, expect, it } from 'vitest';
import {
  ENTITY_RESOLUTION_LIMITS,
  normalizeEntityReference,
} from '../../src/assistant/entity-resolution';

function expectNormalized(source: string, expected: string): void {
  const result = normalizeEntityReference(source);
  expect(result).toMatchObject({ ok: true, normalized: expected });
}

describe('entity-reference normalization', () => {
  it.each([
    ['  BCA   Debit ', 'bca debit'],
    ['Rekening\tUtama', 'rekening utama'],
    ['Rekening\u2028Utama', 'rekening utama'],
    ['ＢＣＡ', 'bca'],
    ['BCA-DEBIT', 'bca debit'],
    ['BCA---DEBIT', 'bca debit'],
    ['Bank_Biru...Utama', 'bank biru utama'],
    ['Makan 2026', 'makan 2026'],
    ['rekening utama', 'rekening utama'],
    ['BCA 💳', 'bca 💳'],
  ])('normalizes %j deterministically', (source, expected) => {
    expectNormalized(source, expected);
    expect(JSON.stringify(normalizeEntityReference(source))).toBe(
      JSON.stringify(normalizeEntityReference(source)),
    );
  });

  it('uses NFKC compatibility normalization without transliterating scripts', () => {
    expectNormalized('ＢＣＡ', 'bca');
    expectNormalized('Банк', 'банк');
  });

  it.each([
    ['null byte', 'BCA\u0000'],
    ['C0 control', 'BCA\u0007'],
    ['C1 control', 'BCA\u0085'],
    ['bidi override', 'BCA\u202e'],
    ['bidi isolate', 'BCA\u2066'],
    ['unpaired surrogate', 'BCA\ud800'],
    ['empty', ' \t\r\n---... '],
  ])('rejects %s', (_label, source) => {
    expect(normalizeEntityReference(source)).toMatchObject({ ok: false });
  });

  it('enforces source UTF-8 bytes at and above the boundary', () => {
    const atLimit = 'a'.repeat(ENTITY_RESOLUTION_LIMITS.sourceReferenceBytes);
    expect(normalizeEntityReference(atLimit)).toMatchObject({ ok: true });
    expect(normalizeEntityReference(`${atLimit}a`)).toEqual({
      ok: false,
      reason: 'source_too_large',
    });
  });

  it('counts multibyte source bytes rather than UTF-16 code units', () => {
    const emojiCount = Math.floor(ENTITY_RESOLUTION_LIMITS.sourceReferenceBytes / 4);
    expect(normalizeEntityReference('💳'.repeat(emojiCount))).toMatchObject({ ok: true });
    expect(normalizeEntityReference(`a${'💳'.repeat(emojiCount)}`)).toEqual({
      ok: false,
      reason: 'source_too_large',
    });
  });

  it('rejects a normalized result over its independent byte limit', () => {
    const source = 'İ'.repeat(Math.floor(ENTITY_RESOLUTION_LIMITS.sourceReferenceBytes / 2));
    expect(Buffer.byteLength(source, 'utf8')).toBeLessThanOrEqual(
      ENTITY_RESOLUTION_LIMITS.sourceReferenceBytes,
    );
    expect(normalizeEntityReference(source)).toEqual({
      ok: false,
      reason: 'normalized_too_large',
    });
  });
});
