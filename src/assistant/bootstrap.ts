// ============================================================
// Assistant Core — bootstrap
// ------------------------------------------------------------
// Wires the static tool registry and handler registry at
// startup. Import this once during application init to
// register all supported tools.
// ============================================================

import { ToolRegistry } from './registry';
import { monthlySpendingSummary } from './tools';
import { handleMonthlySpendingSummary } from './handlers/monthly-spending-summary.handler';
import type { HandlerRegistry } from './executor';
import prisma from '../lib/prisma';
import { createAssistantConversationService } from './conversation.service';
import { createAssistantApplicationService } from './application.service';

/** The application-wide tool registry. Populated at startup. */
export const toolRegistry = new ToolRegistry();

/** The application-wide handler registry. Populated at startup. */
export const handlerRegistry: HandlerRegistry = new Map();

// ---- Register Phase 21.2 tools ---------------------------------------------

toolRegistry.register(monthlySpendingSummary);
handlerRegistry.set(monthlySpendingSummary.id, handleMonthlySpendingSummary as never);

export const assistantConversationService = createAssistantConversationService(prisma);
export const assistantApplicationService = createAssistantApplicationService({ conversations: assistantConversationService, toolRegistry, handlerRegistry });
