"use strict";
// ============================================================
// Transaction query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// The read counterpart to transaction.types.ts. Explicit, Express-free inputs
// and outputs for the transaction *query* service; the controller maps HTTP
// query strings into these and serializes the typed results back out. No `any`,
// no raw request objects, and a narrow Prisma dependency (reads only) so tests
// can inject a fake without a DI framework or a repository layer.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSACTION_INCLUDE = void 0;
const transaction_types_1 = require("./transaction.types");
Object.defineProperty(exports, "TRANSACTION_INCLUDE", { enumerable: true, get: function () { return transaction_types_1.TRANSACTION_INCLUDE; } });
//# sourceMappingURL=transaction-query.types.js.map