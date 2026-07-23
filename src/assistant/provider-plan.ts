import { evaluatePolicy } from './policy';
import type { ToolRegistry } from './registry';
import { AssistantProviderError, type AssistantPlan } from './provider-types';

const TOP_LEVEL_KEYS = ['arguments', 'clarification', 'intent', 'kind', 'userMessage'];
const FORBIDDEN_KEYS = new Set([
  '__proto__', 'prototype', 'constructor',
  'analysis', 'reasoning', 'chainofthought', 'scratchpad',
  'userid', 'ownerid', 'authorized', 'validated', 'walletowned',
  'transactioncreated', 'confirmationcomplete',
]);
const MAX_RESPONSE_BYTES = 32 * 1024;
const MAX_PLAN_DEPTH = 6;
const SAFE_CLARIFICATION = 'Mohon lengkapi informasi transaksi yang masih diperlukan.';
const SAFE_UNSUPPORTED = 'Permintaan tersebut belum didukung oleh Assistant.';
const SECRET_REQUEST = /\b(api[- ]?key|password|passcode|kata sandi|pin|otp|one[- ]?time password|secret|credential|bank login|bearer|access[- ]?token|refresh[- ]?token|recovery (?:code|phrase)|kode pemulihan|seed phrase|mnemonic|private key|frasa pemulihan|disable security|nonaktifkan keamanan|skip (?:security|verification)|lewati verifikasi)\b/i;
const UNSAFE_MARKUP = /[<>]|!?\[[^\]]*\]\s*\(|(?:https?:\/\/|javascript:|data:)/i;
const UNSAFE_CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

function invalid(): never {
  throw AssistantProviderError.invalidResponse();
}

function inspect(value: unknown, depth = 0): void {
  if (depth > MAX_PLAN_DEPTH) invalid();
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) invalid();
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.normalize('NFKC').toLowerCase())) invalid();
    inspect(child, depth + 1);
  }
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}

export function validateAssistantPlan(output: unknown, registry: ToolRegistry): AssistantPlan {
  let serialized: string;
  try {
    serialized = JSON.stringify(output);
  } catch {
    invalid();
  }
  if (Buffer.byteLength(serialized!, 'utf8') > MAX_RESPONSE_BYTES) invalid();
  inspect(output);
  if (!plainObject(output) || !exactKeys(output, TOP_LEVEL_KEYS)) invalid();
  if (typeof output.userMessage !== 'string' || output.userMessage.length > 2000) invalid();
  if (!plainObject(output.arguments)) invalid();

  if (output.kind === 'intent') {
    if (typeof output.intent !== 'string' || output.clarification !== null) invalid();
    const contract = registry.get(output.intent);
    if (!contract || !contract.enabled) invalid();
    let validatedArguments: unknown;
    try {
      validatedArguments = contract.validateInput(output.arguments);
    } catch {
      invalid();
    }
    const policy = evaluatePolicy(contract);
    if (policy.action !== 'EXECUTE_IMMEDIATELY' && policy.action !== 'DRAFT_AND_CONFIRM') invalid();
    return { kind: 'intent', intent: output.intent, arguments: validatedArguments, policy };
  }

  if (output.kind === 'clarification') {
    if (output.intent !== null || Object.keys(output.arguments).length !== 0 || !plainObject(output.clarification)) invalid();
    if (!exactKeys(output.clarification, ['question'])) invalid();
    const question = output.clarification.question;
    if (typeof question !== 'string' || !question.trim() || question.length > 500 || /[\r\n]/.test(question)) invalid();
    const unsafeQuestion = SECRET_REQUEST.test(question)
      || UNSAFE_MARKUP.test(question)
      || UNSAFE_CONTROL.test(question);
    return {
      kind: 'clarification',
      question: unsafeQuestion ? SAFE_CLARIFICATION : question.trim(),
    };
  }

  if (output.kind === 'unsupported') {
    if (output.intent !== null || Object.keys(output.arguments).length !== 0 || output.clarification !== null) invalid();
    return { kind: 'unsupported', message: SAFE_UNSUPPORTED };
  }

  invalid();
}
