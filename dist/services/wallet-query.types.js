"use strict";
// ============================================================
// Wallet query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// The read counterpart to wallet.types.ts. Explicit, Express-free inputs and
// outputs for the wallet *query* service (listing, net-worth snapshot, and the
// seven-day sparkline). The controller maps HTTP requests into these and
// serializes the typed results (Decimals intact) back out. No `any`, no raw
// request objects, and a narrow Prisma dependency so tests can inject a fake
// without a DI framework or a repository layer.
//
// Scope: reads only. Wallet mutations live in wallet.types.ts / wallet.service.ts
// (Sprint 3C); no write surface is modeled here.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=wallet-query.types.js.map