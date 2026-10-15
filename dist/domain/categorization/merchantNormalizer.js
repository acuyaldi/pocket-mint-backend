"use strict";
// ============================================================
// Merchant normalizer
// ------------------------------------------------------------
// Deterministic normalization of transaction descriptions for
// keyword matching. Pure function — no side effects, no I/O.
//
// Rules applied in order:
// 1. Lowercase
// 2. Trim leading/trailing whitespace
// 3. Collapse repeated whitespace to single space
// 4. Remove common payment/transfer prefixes
// 5. Remove trailing transaction numbers/IDs (e.g. "#123", "-001")
// 6. Normalize punctuation (collapse repeated symbols)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMerchant = normalizeMerchant;
exports.tokenize = tokenize;
exports.prepareForMatching = prepareForMatching;
/**
 * Common Indonesian payment/transfer prefixes that add no categorization
 * signal. Stripped from the start of the normalized description.
 */
const PAYMENT_PREFIXES = [
    /^trf\s+/i,
    /^trx\s+/i,
    /^transfer\s+/i,
    /^pmb\s+/i,
    /^pembayaran\s+/i,
    /^bayar\s+/i,
    /^pmt\s+/i,
    /^payment\s+/i,
    /^tx\s+/i,
];
/** Strip trailing transaction/reference numbers. */
const TRAILING_NUMBERS = /[\s\-–—#]+\d{2,}$/;
/** Characters to treat as whitespace separators. */
const SEPARATOR_CHARS = /[\-–—_.]/g;
/** Repeated symbols to collapse. */
const REPEATED_SYMBOLS = /([^a-z0-9\s])\1+/g;
/**
 * Normalize a transaction description into a clean, deterministic form
 * suitable for keyword matching.
 *
 * Examples:
 *   "INDOMARET #123"   → "indomaret"
 *   "ALFAMART-001"     → "alfamart"
 *   "TRF  GO-JEK  ##"  → "go jek"
 *   "BAYAR   Listrik"  → "listrik"
 */
function normalizeMerchant(raw) {
    let normalized = raw.toLowerCase().trim();
    // Strip payment prefixes
    for (const prefix of PAYMENT_PREFIXES) {
        normalized = normalized.replace(prefix, '');
    }
    // Replace common separators with spaces
    normalized = normalized.replace(SEPARATOR_CHARS, ' ');
    // Strip trailing ID numbers
    normalized = normalized.replace(TRAILING_NUMBERS, '');
    // Collapse repeated whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    // Collapse repeated non-alphanumeric symbols (e.g. "##" → "#")
    normalized = normalized.replace(REPEATED_SYMBOLS, '$1');
    // Strip stray non-alphanumeric characters at start/end
    normalized = normalized.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');
    return normalized;
}
/**
 * Extract individual keyword tokens from a normalized description for
 * partial/contains matching.
 */
function tokenize(normalized) {
    return normalized
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .map((t) => t.replace(/[^a-z0-9]/g, ''));
}
/**
 * Normalize the input description and return the normalized form
 * plus individual tokens.
 */
function prepareForMatching(input) {
    const normalized = normalizeMerchant(input.description);
    const tokens = tokenize(normalized);
    return { normalized, tokens };
}
//# sourceMappingURL=merchantNormalizer.js.map