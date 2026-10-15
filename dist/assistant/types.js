"use strict";
// ============================================================
// Assistant Core — canonical identifiers and types
// ------------------------------------------------------------
// Provider-neutral. No LLM vendor types, no Prisma references,
// no Express/http types. Everything upstream of the provider
// adapter uses these types exclusively.
//
// Money representation at the tool boundary:
// Domain services return Prisma.Decimal. The tool handler
// serializes to number via Number(decimal.toString()) —
// the same convention used by existing controllers. No
// financial arithmetic is performed with JS numbers inside
// Assistant Core. Rupiah amounts fit safely within
// Number.MAX_SAFE_INTEGER (9 quadrillion IDR) for the
// single-month summaries this phase supports.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map