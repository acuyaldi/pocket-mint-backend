import { normalizeEntityReference } from './normalization';
import {
  ENTITY_REFERENCE_SOURCES,
  ENTITY_RESOLUTION_LIMITS,
  isEntityType,
  type EntityReferenceInput,
  type NormalizedEntityReference,
} from './types';

type ParsedReference =
  | {
    readonly ok: true;
    readonly reference: EntityReferenceInput;
    readonly normalized: NormalizedEntityReference;
  }
  | { readonly ok: false; readonly kind: 'unsupported_entity_type' }
  | { readonly ok: false; readonly kind: 'invalid_reference'; readonly entityType?: EntityReferenceInput['entityType'] };

const ALLOWED_KEYS = new Set([
  'entityType',
  'referenceText',
  'source',
  'conversationReference',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function safeMetadata(value: unknown, maxBytes: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && Buffer.byteLength(value, 'utf8') <= maxBytes
    && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value);
}

export function parseEntityReferenceInput(value: unknown): ParsedReference {
  if (!isPlainObject(value)) return { ok: false, kind: 'invalid_reference' };
  let keys: readonly (string | symbol)[];
  let descriptors: PropertyDescriptorMap;
  try {
    keys = Reflect.ownKeys(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    return { ok: false, kind: 'invalid_reference' };
  }
  const entityTypeDescriptor = descriptors.entityType;
  const declaredEntityType = entityTypeDescriptor?.enumerable
    && entityTypeDescriptor.get === undefined
    && entityTypeDescriptor.set === undefined
    && isEntityType(entityTypeDescriptor.value)
    ? entityTypeDescriptor.value
    : undefined;
  if (
    keys.some((key) => typeof key !== 'string' || !ALLOWED_KEYS.has(key))
    || Object.values(descriptors).some(
      (descriptor) =>
        !descriptor.enumerable
        || descriptor.get !== undefined
        || descriptor.set !== undefined,
    )
  ) {
    return {
      ok: false,
      kind: 'invalid_reference',
      ...(declaredEntityType === undefined ? {} : { entityType: declaredEntityType }),
    };
  }
  const entityTypeValue = descriptors.entityType?.value;
  const referenceTextValue = descriptors.referenceText?.value;
  const sourceValue = descriptors.source?.value;
  const conversationReferenceValue = descriptors.conversationReference?.value;
  if (!isEntityType(entityTypeValue)) {
    return { ok: false, kind: 'unsupported_entity_type' };
  }
  const entityType = entityTypeValue;
  if (
    (sourceValue !== undefined
      && !(ENTITY_REFERENCE_SOURCES as readonly unknown[]).includes(sourceValue))
    || (conversationReferenceValue !== undefined
      && !safeMetadata(
        conversationReferenceValue,
        ENTITY_RESOLUTION_LIMITS.conversationReferenceBytes,
      ))
  ) {
    return { ok: false, kind: 'invalid_reference', entityType };
  }
  const normalized = normalizeEntityReference(referenceTextValue);
  if (!normalized.ok) return { ok: false, kind: 'invalid_reference', entityType };
  return {
    ok: true,
    reference: Object.freeze({
      entityType,
      referenceText: referenceTextValue as string,
      ...(sourceValue === undefined ? {} : { source: sourceValue as EntityReferenceInput['source'] }),
      ...(conversationReferenceValue === undefined
        ? {}
        : { conversationReference: conversationReferenceValue as string }),
    }),
    normalized,
  };
}
