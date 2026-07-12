"use strict";
// ============================================================
// Focused query-string parsers (HTTP boundary)
// ------------------------------------------------------------
// Express parses `req.query` values into `string | ParsedQs | (string |
// ParsedQs)[]`, so a field a controller expects to be a scalar can arrive as an
// array (`?type[]=a&type[]=b`) or a nested object (`?type[x]=1`). These helpers
// reduce such values to a single scalar BEFORE they reach a service or Prisma,
// preventing `[object Object]` coercions and array-shaped values leaking into a
// `where` clause.
//
// This is deliberately NOT a validation framework: there is no schema, no
// business-rule checking, and the existing lenient month/year/limit clamp/default
// semantics stay in the services untouched. These only enforce scalar *shape*.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.scalarString = scalarString;
exports.scalarInt = scalarInt;
exports.scalarBooleanTrue = scalarBooleanTrue;
/**
 * Reduce a query value to a single scalar string, or `undefined`.
 * - a string is returned as-is;
 * - an array collapses to the scalar form of its first element (repeated params);
 * - a nested object (never a scalar) becomes `undefined` — it is not coerced to
 *   `"[object Object]"`.
 */
function scalarString(value) {
    if (value === undefined || value === null)
        return undefined;
    if (Array.isArray(value))
        return scalarString(value[0]);
    if (typeof value === 'object')
        return undefined;
    return value;
}
/**
 * Parse an optional integer from a query value. Non-scalar, empty, and
 * non-numeric inputs yield `undefined` — the same lenient outcome the old
 * `parseInt`-based helper produced, so the service still applies its
 * clamp/default. `NaN` never reaches the service.
 */
function scalarInt(value) {
    const s = scalarString(value);
    if (s === undefined)
        return undefined;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? undefined : n;
}
/**
 * A boolean flag that is `true` only when the scalar value is exactly `'true'`.
 * Preserves the existing `?force=true` semantics (any other value → `false`),
 * while safely collapsing an array/object shape first.
 */
function scalarBooleanTrue(value) {
    return scalarString(value) === 'true';
}
//# sourceMappingURL=queryParsers.js.map