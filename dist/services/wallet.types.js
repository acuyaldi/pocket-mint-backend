"use strict";
// ============================================================
// Wallet command service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the wallet *mutation* service. The controller
// maps HTTP requests into these; the service returns typed domain records (raw
// Prisma wallet with Decimal fields intact — the controller owns serialization).
// No `any`, no raw request objects, and a narrow Prisma dependency so tests can
// inject a fake without a DI framework or a repository layer.
//
// Scope: create / update / delete only. Wallet reads (list, sparkline) stay in
// the controller for a later sprint, so no query surface is modeled here.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=wallet.types.js.map