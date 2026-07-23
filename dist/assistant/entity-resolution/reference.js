"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEntityReferenceInput = parseEntityReferenceInput;
const normalization_1 = require("./normalization");
const types_1 = require("./types");
const ALLOWED_KEYS = new Set([
    'entityType',
    'referenceText',
    'source',
    'conversationReference',
]);
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    try {
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }
    catch {
        return false;
    }
}
function safeMetadata(value, maxBytes) {
    return typeof value === 'string'
        && value.length > 0
        && Buffer.byteLength(value, 'utf8') <= maxBytes
        && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function parseEntityReferenceInput(value) {
    if (!isPlainObject(value))
        return { ok: false, kind: 'invalid_reference' };
    let keys;
    let descriptors;
    try {
        keys = Reflect.ownKeys(value);
        descriptors = Object.getOwnPropertyDescriptors(value);
    }
    catch {
        return { ok: false, kind: 'invalid_reference' };
    }
    const entityTypeDescriptor = descriptors.entityType;
    const declaredEntityType = entityTypeDescriptor?.enumerable
        && entityTypeDescriptor.get === undefined
        && entityTypeDescriptor.set === undefined
        && (0, types_1.isEntityType)(entityTypeDescriptor.value)
        ? entityTypeDescriptor.value
        : undefined;
    if (keys.some((key) => typeof key !== 'string' || !ALLOWED_KEYS.has(key))
        || Object.values(descriptors).some((descriptor) => !descriptor.enumerable
            || descriptor.get !== undefined
            || descriptor.set !== undefined)) {
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
    if (!(0, types_1.isEntityType)(entityTypeValue)) {
        return { ok: false, kind: 'unsupported_entity_type' };
    }
    const entityType = entityTypeValue;
    if ((sourceValue !== undefined
        && !types_1.ENTITY_REFERENCE_SOURCES.includes(sourceValue))
        || (conversationReferenceValue !== undefined
            && !safeMetadata(conversationReferenceValue, types_1.ENTITY_RESOLUTION_LIMITS.conversationReferenceBytes))) {
        return { ok: false, kind: 'invalid_reference', entityType };
    }
    const normalized = (0, normalization_1.normalizeEntityReference)(referenceTextValue);
    if (!normalized.ok)
        return { ok: false, kind: 'invalid_reference', entityType };
    return {
        ok: true,
        reference: Object.freeze({
            entityType,
            referenceText: referenceTextValue,
            ...(sourceValue === undefined ? {} : { source: sourceValue }),
            ...(conversationReferenceValue === undefined
                ? {}
                : { conversationReference: conversationReferenceValue }),
        }),
        normalized,
    };
}
//# sourceMappingURL=reference.js.map