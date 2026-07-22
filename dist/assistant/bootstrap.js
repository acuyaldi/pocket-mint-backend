"use strict";
// ============================================================
// Assistant Core — bootstrap
// ------------------------------------------------------------
// Wires the static tool registry and handler registry at
// startup. Import this once during application init to
// register all supported tools.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlerRegistry = exports.toolRegistry = void 0;
const registry_1 = require("./registry");
const tools_1 = require("./tools");
const monthly_spending_summary_handler_1 = require("./handlers/monthly-spending-summary.handler");
/** The application-wide tool registry. Populated at startup. */
exports.toolRegistry = new registry_1.ToolRegistry();
/** The application-wide handler registry. Populated at startup. */
exports.handlerRegistry = new Map();
// ---- Register Phase 21.2 tools ---------------------------------------------
exports.toolRegistry.register(tools_1.monthlySpendingSummary);
exports.handlerRegistry.set(tools_1.monthlySpendingSummary.id, monthly_spending_summary_handler_1.handleMonthlySpendingSummary);
//# sourceMappingURL=bootstrap.js.map