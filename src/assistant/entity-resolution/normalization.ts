import {
  ENTITY_RESOLUTION_LIMITS,
  type NormalizedEntityReference,
} from './types';

export type EntityReferenceNormalizationFailure =
  | 'invalid_type'
  | 'source_too_large'
  | 'unsafe_character'
  | 'empty'
  | 'normalized_too_large';

export type EntityReferenceNormalizationResult =
  | ({ readonly ok: true } & NormalizedEntityReference)
  | { readonly ok: false; readonly reason: EntityReferenceNormalizationFailure };

const UNSAFE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const UNPAIRED_SURROGATE = /[\ud800-\udfff]/u;
const WHITESPACE = /\s+/gu;
const PUNCTUATION_OR_SEPARATOR = /[\p{P}\p{Z}]+/gu;

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function comparisonForm(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(WHITESPACE, ' ').trim();
}

export function normalizeEntityReference(value: unknown): EntityReferenceNormalizationResult {
  if (typeof value !== 'string') return { ok: false, reason: 'invalid_type' };
  if (utf8Bytes(value) > ENTITY_RESOLUTION_LIMITS.sourceReferenceBytes) {
    return { ok: false, reason: 'source_too_large' };
  }
  if (
    UNSAFE_CONTROL.test(value)
    || BIDI_CONTROL.test(value)
    || UNPAIRED_SURROGATE.test(value)
  ) {
    return { ok: false, reason: 'unsafe_character' };
  }

  const compatible = value.normalize('NFKC').toLowerCase();
  const normalized = compatible
    .replace(PUNCTUATION_OR_SEPARATOR, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
  if (!normalized) return { ok: false, reason: 'empty' };
  if (utf8Bytes(normalized) > ENTITY_RESOLUTION_LIMITS.normalizedReferenceBytes) {
    return { ok: false, reason: 'normalized_too_large' };
  }
  return Object.freeze({
    ok: true,
    sourceText: value,
    normalized,
    comparison: comparisonForm(value),
  });
}
