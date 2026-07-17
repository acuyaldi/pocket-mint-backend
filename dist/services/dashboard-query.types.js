"use strict";
// ============================================================
// Dashboard query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free inputs and outputs for the dashboard *query* service.
// The dashboard is read-only, so there is no command counterpart. The controller
// maps the authenticated request into these and serializes the typed Decimal
// result back out (one clear boundary). No `any`, no raw request objects, and a
// narrow Prisma dependency (reads only) so tests can inject a fake without a DI
// framework or a repository layer.
//
// Scope note: the live endpoint is exactly `GET /dashboard/summary`, which
// reports the caller's net-worth totals. There are no month/year query params,
// no income/expense/trend fields, and no installment or recent-transaction data
// on this endpoint today — so none are modeled here (inventing them would break
// the "ground everything in real code" rule).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=dashboard-query.types.js.map