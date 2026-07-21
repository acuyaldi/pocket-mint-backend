"use strict";
// ============================================================
// Budget query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free inputs and outputs for the read-only budget
// calculation/query service (Phase A domain foundation, PD-009 Approved). No
// controller or route consumes this yet — see PD-009 Implementation Impact.
// A narrow Prisma dependency (reads only, `budget` + `transaction`) so tests
// can inject a fake without a DI framework or a repository layer.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=budget-query.types.js.map