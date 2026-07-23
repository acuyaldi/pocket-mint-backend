"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAssistantPlan = validateAssistantPlan;
const policy_1 = require("./policy");
const provider_types_1 = require("./provider-types");
const TOP_LEVEL_KEYS = ['arguments', 'clarification', 'intent', 'kind', 'userMessage'];
const FORBIDDEN_KEYS = new Set([
    '__proto__', 'prototype', 'constructor',
    'analysis', 'reasoning', 'chainOfThought', 'scratchpad',
    'userId', 'ownerId', 'authorized', 'validated', 'walletOwned',
    'transactionCreated', 'confirmationComplete',
]);
const MAX_RESPONSE_BYTES = 32 * 1024;
const MAX_PLAN_DEPTH = 6;
const SAFE_CLARIFICATION = 'Mohon lengkapi informasi transaksi yang masih diperlukan.';
const SAFE_UNSUPPORTED = 'Permintaan tersebut belum didukung oleh Assistant.';
const SECRET_REQUEST = /\b(api[- ]?key|password|passcode|secret|credential|bearer|access[- ]?token|refresh[- ]?token)\b/i;
function invalid() {
    throw provider_types_1.AssistantProviderError.invalidResponse();
}
function inspect(value, depth = 0) {
    if (depth > MAX_PLAN_DEPTH)
        invalid();
    if (value === null || typeof value !== 'object')
        return;
    if (Array.isArray(value))
        invalid();
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key))
            invalid();
        inspect(child, depth + 1);
    }
}
function plainObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
    const keys = Object.keys(value).sort();
    return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}
function validateAssistantPlan(output, registry) {
    let serialized;
    try {
        serialized = JSON.stringify(output);
    }
    catch {
        invalid();
    }
    if (Buffer.byteLength(serialized, 'utf8') > MAX_RESPONSE_BYTES)
        invalid();
    inspect(output);
    if (!plainObject(output) || !exactKeys(output, TOP_LEVEL_KEYS))
        invalid();
    if (typeof output.userMessage !== 'string' || output.userMessage.length > 2000)
        invalid();
    if (!plainObject(output.arguments))
        invalid();
    if (output.kind === 'intent') {
        if (typeof output.intent !== 'string' || output.clarification !== null)
            invalid();
        const contract = registry.get(output.intent);
        if (!contract || !contract.enabled)
            invalid();
        let validatedArguments;
        try {
            validatedArguments = contract.validateInput(output.arguments);
        }
        catch {
            invalid();
        }
        const policy = (0, policy_1.evaluatePolicy)(contract);
        if (policy.action !== 'EXECUTE_IMMEDIATELY' && policy.action !== 'DRAFT_AND_CONFIRM')
            invalid();
        return { kind: 'intent', intent: output.intent, arguments: validatedArguments, policy };
    }
    if (output.kind === 'clarification') {
        if (output.intent !== null || Object.keys(output.arguments).length !== 0 || !plainObject(output.clarification))
            invalid();
        if (!exactKeys(output.clarification, ['question']))
            invalid();
        const question = output.clarification.question;
        if (typeof question !== 'string' || !question.trim() || question.length > 500 || /[\r\n]/.test(question))
            invalid();
        return {
            kind: 'clarification',
            question: SECRET_REQUEST.test(question) ? SAFE_CLARIFICATION : question.trim(),
        };
    }
    if (output.kind === 'unsupported') {
        if (output.intent !== null || Object.keys(output.arguments).length !== 0 || output.clarification !== null)
            invalid();
        return { kind: 'unsupported', message: SAFE_UNSUPPORTED };
    }
    invalid();
}
//# sourceMappingURL=provider-plan.js.map