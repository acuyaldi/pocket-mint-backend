// ============================================================
// Recurring reminder engine (Phase 4)
// ------------------------------------------------------------
// Deterministic, idempotent evaluation: for a given calendar date, finds
// active MONTHLY templates (nextDueDate is only defined for MONTHLY today,
// see recurringTransaction.controller.ts) whose reminderDate
// (nextDueDate - reminderOffsetDays) falls on that date, and records one
// reminder event per (template, occurrence, offset). No notification is
// sent or displayed here — that's a later phase.
// ============================================================

import prisma from '../lib/prisma';
import { reportingConfig } from '../config';
import { formatReportingDate, parseBusinessDate } from '../domain/reportingTime';
import { nextMonthlyOccurrence } from '../domain/billingCycle';
import type { RecurringReminderEnginePrismaClient, RecurringReminderEvent } from './recurringReminderEngine.types';

function subtractDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function createRecurringReminderEngineService(db: RecurringReminderEnginePrismaClient) {
  async function evaluateReminders(evaluationDate: string): Promise<RecurringReminderEvent[]> {
    const templates = await db.recurringTransactionTemplate.findMany({
      where: { isActive: true, reminderEnabled: true, frequency: 'MONTHLY' },
      select: { id: true, userId: true, startDate: true, endDate: true, reminderOffsetDays: true },
    });

    const events: RecurringReminderEvent[] = [];
    for (const template of templates) {
      if (template.reminderOffsetDays === null) continue;

      const occurrenceDate = nextMonthlyOccurrence(
        formatReportingDate(template.startDate, reportingConfig.timezone),
        template.endDate ? formatReportingDate(template.endDate, reportingConfig.timezone) : null,
        evaluationDate
      );
      if (!occurrenceDate) continue;

      const reminderDate = subtractDays(occurrenceDate, template.reminderOffsetDays);
      if (reminderDate !== evaluationDate) continue;

      const event = await db.recurringReminderEvent.upsert({
        where: {
          templateId_occurrenceDate_offsetDays: {
            templateId: template.id,
            occurrenceDate: parseBusinessDate(occurrenceDate, reportingConfig.timezone),
            offsetDays: template.reminderOffsetDays,
          },
        },
        create: {
          templateId: template.id,
          userId: template.userId,
          occurrenceDate: parseBusinessDate(occurrenceDate, reportingConfig.timezone),
          offsetDays: template.reminderOffsetDays,
          reminderDate: parseBusinessDate(reminderDate, reportingConfig.timezone),
        },
        update: {},
      });
      events.push(event);
    }
    return events;
  }

  return { evaluateReminders };
}

export const recurringReminderEngineService = createRecurringReminderEngineService(prisma);
