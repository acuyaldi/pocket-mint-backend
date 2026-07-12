"use strict";
// ============================================================
// Installment query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free inputs and outputs for the installment *query* service.
// The installment HTTP surface is read-only (list + a static rates endpoint that
// touches neither identity nor the database), so there is no command counterpart:
// installment mutations live entirely inside the transaction command service
// (create as part of a transaction's atomic write, delete on reversal). The
// controller maps the authenticated request into these types and serializes the
// typed Decimal result back out (one clear boundary). No `any`, no raw request
// objects, and a narrow Prisma dependency (reads only) so tests can inject a fake
// without a DI framework or a repository layer.
//
// Scope note: the live list endpoint reports the installment's *stored contract*
// values (principal, interest, grandTotal, monthlyAmount, term, status) exactly as
// persisted. There is no paid-terms / payment-lifecycle field in the schema, so no
// progress or remaining-amount is computed here — modelling those would invent
// behaviour the endpoint does not have.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=installment-query.types.js.map