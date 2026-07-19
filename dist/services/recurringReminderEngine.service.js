"use strict";
// ============================================================
// Recurring reminder engine (Phase 4; installments added in Phase 7)
// ------------------------------------------------------------
// Deterministic, idempotent evaluation: for a given calendar date, finds
// active MONTHLY templates (nextDueDate is only defined for MONTHLY today,
// see recurringTransaction.controller.ts) whose reminderDate
// (nextDueDate - reminderOffsetDays) falls on that date, and records one
// reminder event per (template, occurrence, offset). No notification is
// sent or displayed here — that's a later phase.
//
// Phase 7: the same event table also carries installment due-date
// reminders. Installments have no per-row reminder config (unlike
// templates) — every ACTIVE installment gets a reminder at a fixed offset,
// keyed by installmentId instead of templateId.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurringReminderEngineService = exports.INSTALLMENT_REMINDER_OFFSET_DAYS = void 0;
exports.createRecurringReminderEngineService = createRecurringReminderEngineService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const billingCycle_1 = require("../domain/billingCycle");
/** Fixed lead time for installment due-date reminders — not user-configurable. */
exports.INSTALLMENT_REMINDER_OFFSET_DAYS = 3;
function subtractDays(dateStr, days) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day - days));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
function createRecurringReminderEngineService(db) {
    async function evaluateReminders(evaluationDate) {
        const templates = await db.recurringTransactionTemplate.findMany({
            where: { isActive: true, reminderEnabled: true, frequency: 'MONTHLY' },
            select: { id: true, userId: true, startDate: true, endDate: true, reminderOffsetDays: true },
        });
        const events = [];
        for (const template of templates) {
            if (template.reminderOffsetDays === null)
                continue;
            const occurrenceDate = (0, billingCycle_1.nextMonthlyOccurrence)((0, reportingTime_1.formatReportingDate)(template.startDate, config_1.reportingConfig.timezone), template.endDate ? (0, reportingTime_1.formatReportingDate)(template.endDate, config_1.reportingConfig.timezone) : null, evaluationDate);
            if (!occurrenceDate)
                continue;
            const reminderDate = subtractDays(occurrenceDate, template.reminderOffsetDays);
            if (reminderDate !== evaluationDate)
                continue;
            const event = await db.recurringReminderEvent.upsert({
                where: {
                    templateId_occurrenceDate_offsetDays: {
                        templateId: template.id,
                        occurrenceDate: (0, reportingTime_1.parseBusinessDate)(occurrenceDate, config_1.reportingConfig.timezone),
                        offsetDays: template.reminderOffsetDays,
                    },
                },
                create: {
                    templateId: template.id,
                    userId: template.userId,
                    occurrenceDate: (0, reportingTime_1.parseBusinessDate)(occurrenceDate, config_1.reportingConfig.timezone),
                    offsetDays: template.reminderOffsetDays,
                    reminderDate: (0, reportingTime_1.parseBusinessDate)(reminderDate, config_1.reportingConfig.timezone),
                },
                update: {},
            });
            events.push(event);
        }
        const installments = await db.installment.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, userId: true, nextDueDate: true },
        });
        for (const installment of installments) {
            const dueDate = (0, reportingTime_1.formatReportingDate)(installment.nextDueDate, config_1.reportingConfig.timezone);
            const reminderDate = subtractDays(dueDate, exports.INSTALLMENT_REMINDER_OFFSET_DAYS);
            if (reminderDate !== evaluationDate)
                continue;
            const event = await db.recurringReminderEvent.upsert({
                where: {
                    installmentId_occurrenceDate_offsetDays: {
                        installmentId: installment.id,
                        occurrenceDate: (0, reportingTime_1.parseBusinessDate)(dueDate, config_1.reportingConfig.timezone),
                        offsetDays: exports.INSTALLMENT_REMINDER_OFFSET_DAYS,
                    },
                },
                create: {
                    installmentId: installment.id,
                    userId: installment.userId,
                    occurrenceDate: (0, reportingTime_1.parseBusinessDate)(dueDate, config_1.reportingConfig.timezone),
                    offsetDays: exports.INSTALLMENT_REMINDER_OFFSET_DAYS,
                    reminderDate: (0, reportingTime_1.parseBusinessDate)(reminderDate, config_1.reportingConfig.timezone),
                },
                update: {},
            });
            events.push(event);
        }
        return events;
    }
    return { evaluateReminders };
}
exports.recurringReminderEngineService = createRecurringReminderEngineService(prisma_1.default);
//# sourceMappingURL=recurringReminderEngine.service.js.map