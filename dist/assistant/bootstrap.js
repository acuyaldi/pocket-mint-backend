"use strict";
// ============================================================
// Assistant Core — bootstrap
// ------------------------------------------------------------
// Wires the static tool registry and handler registry at
// startup. Import this once during application init to
// register all supported tools.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistantApplicationService = exports.assistantConversationService = exports.handlerRegistry = exports.toolRegistry = void 0;
const registry_1 = require("./registry");
const tools_1 = require("./tools");
const monthly_spending_summary_handler_1 = require("./handlers/monthly-spending-summary.handler");
const prisma_1 = __importDefault(require("../lib/prisma"));
const conversation_service_1 = require("./conversation.service");
const application_service_1 = require("./application.service");
/** The application-wide tool registry. Populated at startup. */
exports.toolRegistry = new registry_1.ToolRegistry();
/** The application-wide handler registry. Populated at startup. */
exports.handlerRegistry = new Map();
// ---- Register Phase 21.2 tools ---------------------------------------------
exports.toolRegistry.register(tools_1.monthlySpendingSummary);
exports.handlerRegistry.set(tools_1.monthlySpendingSummary.id, monthly_spending_summary_handler_1.handleMonthlySpendingSummary);
exports.assistantConversationService = (0, conversation_service_1.createAssistantConversationService)(prisma_1.default);
exports.assistantApplicationService = (0, application_service_1.createAssistantApplicationService)({ conversations: exports.assistantConversationService, toolRegistry: exports.toolRegistry, handlerRegistry: exports.handlerRegistry });
//# sourceMappingURL=bootstrap.js.map