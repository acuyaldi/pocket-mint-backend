"use strict";
// ============================================================
// Budget command service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free types for the Budget *mutation* service (Phase B1,
// budgeting-api-contract.md). The controller (Phase B2) maps HTTP requests
// into these; the service returns the raw persisted Budget (Decimal `amount`
// intact) — DTO/usage composition stays with the controller and
// budget-query.service.ts.
//
// Scope: create / updateAmount / archive / restore only. There is no
// categoryId on the update input — category reassignment is not a supported
// command (PD-009 Decision L); rejecting a `categoryId` in the update request
// body is a request-shape concern that belongs to the future controller, not
// this service.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=budget.types.js.map