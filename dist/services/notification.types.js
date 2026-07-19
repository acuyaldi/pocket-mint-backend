"use strict";
// ============================================================
// Notification service contracts (Phase 5)
// ------------------------------------------------------------
// The notification center reads/mutates the RecurringReminderEvent rows
// persisted by the reminder engine (Phase 4) — no separate Notification
// table. Mirrors recurringTransaction.types.ts's narrow-Prisma-slice DI
// pattern.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_INCLUDE = void 0;
exports.NOTIFICATION_INCLUDE = {
    template: {
        select: { id: true, name: true, type: true, amountMode: true, amount: true, walletId: true, categoryId: true },
    },
};
//# sourceMappingURL=notification.types.js.map