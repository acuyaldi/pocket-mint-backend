import { expect } from 'vitest';
import {
  AssistantCaptureEventType,
  AssistantCaptureField,
  AssistantCaptureOrigin,
  AssistantChannel,
} from '../../src/generated/prisma/client';
import { CAPTURE_PHASE_MARKER } from '../../src/assistant/capture-events';

const CLOSED_STRINGS = new Set<string>([
  ...Object.values(AssistantCaptureEventType),
  ...Object.values(AssistantCaptureField),
  ...Object.values(AssistantCaptureOrigin),
  ...Object.values(AssistantChannel),
  CAPTURE_PHASE_MARKER,
]);
const ALLOWED_KEYS = ['correlationKey', 'eventType', 'fields', 'id', 'occurredAt', 'origin', 'phaseMarker', 'schemaVersion', 'source'];

/**
 * Fails on any free string in a capture-event payload: every string must be a
 * closed-enum value, the phase-marker constant, or a sha256 correlation key.
 * Shared with the Postgres integration test, which runs it on persisted rows.
 */
export function assertPrivacySafeRow(row: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(row)) {
    expect(ALLOWED_KEYS, `unexpected capture-event column "${key}"`).toContain(key);
    if (key === 'id' || key === 'occurredAt' || value === null || typeof value === 'number') continue;
    if (key === 'correlationKey') {
      expect(value).toMatch(/^[0-9a-f]{64}$/);
      continue;
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      expect(typeof item === 'string' && CLOSED_STRINGS.has(item), `free value in capture-event "${key}": ${JSON.stringify(item)}`).toBe(true);
    }
  }
}
