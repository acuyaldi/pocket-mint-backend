"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantApplicationService = createAssistantApplicationService;
const errors_1 = require("./errors");
const executor_1 = require("./executor");
const intent_1 = require("./intent");
const renderer_1 = require("./renderer");
const persistence_1 = require("./persistence");
const policy_1 = require("./policy");
const logger_1 = require("../utils/logger");
const entity_resolution_1 = require("./entity-resolution");
function createAssistantApplicationService(deps) {
    async function prepareProviderExecution(input) {
        if (!deps.contexts)
            throw new Error('Assistant context service is not configured');
        return deps.contexts.buildExecutionContext(input);
    }
    async function execute(userId, correlationId, request) {
        const locale = request.locale?.trim() || 'id-ID';
        if (request.conversationId)
            await deps.conversations.assertContinuable(userId, request.conversationId);
        const provided = (0, persistence_1.normalizeProvidedMessage)(request.message);
        let resolved;
        let validatedInput;
        try {
            resolved = (0, intent_1.resolveIntent)(request);
            const contract = deps.toolRegistry.get(resolved.toolId);
            if (!contract)
                throw errors_1.AssistantError.toolNotFound(resolved.toolId);
            validatedInput = contract.validateInput(resolved.arguments);
        }
        catch (error) {
            const operational = error instanceof errors_1.AssistantError ? error : errors_1.AssistantError.invalidRequest('request cannot be validated');
            const safeMessage = (0, persistence_1.safeRejectedAssistantMessage)(operational.code);
            const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: persistence_1.SAFE_REJECTED_INTENT, locale, content: (0, persistence_1.safeRejectedUserMessage)(), source: 'SAFE_REQUEST_SUMMARY' });
            await deps.conversations.finalizeRejected({ ...turn, content: safeMessage, safeErrorCode: operational.code });
            return { httpStatus: operational.statusCode, response: { status: 'rejected', code: operational.code, message: safeMessage, correlationId, ...turn } };
        }
        const fallback = request.intent === 'transaction.create' ? 'Siapkan draft transaksi untuk konfirmasi.' : (0, persistence_1.monthlySummaryFallback)(validatedInput);
        const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: request.intent, locale, content: provided ?? fallback, source: provided ? 'USER_PROVIDED' : 'CANONICAL_FALLBACK' });
        await deps.conversations.markTurnRunning(turn.turnId);
        const contract = deps.toolRegistry.get(resolved.toolId);
        const policy = (0, policy_1.evaluatePolicy)(contract);
        const redactedInput = request.intent === 'transaction.create' ? { operation: 'transaction.create' } : (0, persistence_1.monthlySummaryInputForAudit)(validatedInput);
        const executionId = await deps.conversations.beginToolExecution({ ...turn, correlationId, toolId: contract.id, capability: contract.capability, riskLevel: contract.riskLevel, policyDecision: policy.action, redactedInput });
        const startedAt = Date.now();
        if (policy.action === 'DRAFT_AND_CONFIRM') {
            if (!deps.financialDrafts)
                throw new Error('Financial draft service is not configured');
            try {
                const transactionInput = validatedInput;
                const walletResolution = 'walletReference' in transactionInput
                    ? await resolveTransactionWallet(deps.entityResolution, userId, transactionInput.walletReference)
                    : undefined;
                if (walletResolution && walletResolution.kind !== 'resolved') {
                    const publicResolution = (0, entity_resolution_1.toPublicEntityResolutionResult)(walletResolution);
                    if (walletResolution.kind === 'ambiguous' || walletResolution.kind === 'not_found') {
                        const message = renderWalletClarification(walletResolution);
                        await deps.conversations.finalize({
                            executionId,
                            ...turn,
                            status: 'SUCCEEDED',
                            turnStatus: 'CLARIFICATION_REQUIRED',
                            assistantContent: message,
                            assistantSource: 'DETERMINISTIC_RENDERER',
                            durationMs: Date.now() - startedAt,
                            outputSummary: {
                                operation: 'transaction.create',
                                walletResolution: walletResolution.kind,
                            },
                        });
                        return {
                            httpStatus: 200,
                            response: {
                                status: 'clarification_required',
                                message,
                                data: publicResolution,
                                correlationId,
                                ...turn,
                            },
                        };
                    }
                    const invalid = errors_1.AssistantError.invalidInput('transaction.create', 'walletReference is invalid');
                    const safeMessage = (0, persistence_1.safeRejectedAssistantMessage)(invalid.code);
                    await deps.conversations.finalize({
                        executionId,
                        ...turn,
                        status: 'FAILED',
                        turnStatus: 'REJECTED',
                        assistantContent: safeMessage,
                        assistantSource: 'SAFE_ERROR',
                        durationMs: Date.now() - startedAt,
                        safeErrorCode: invalid.code,
                        outputSummary: {
                            operation: 'transaction.create',
                            walletResolution: publicResolution.kind,
                        },
                    });
                    return {
                        httpStatus: invalid.statusCode,
                        response: {
                            status: 'rejected',
                            code: invalid.code,
                            message: safeMessage,
                            correlationId,
                            ...turn,
                        },
                    };
                }
                const merchantResolution = transactionInput.merchantReference === undefined
                    ? undefined
                    : await resolveTransactionMerchant(deps.entityResolution, userId, transactionInput.merchantReference);
                if (merchantResolution?.kind === 'ambiguous') {
                    const publicResolution = (0, entity_resolution_1.toPublicEntityResolutionResult)(merchantResolution);
                    const message = renderMerchantClarification(merchantResolution);
                    await deps.conversations.finalize({
                        executionId,
                        ...turn,
                        status: 'SUCCEEDED',
                        turnStatus: 'CLARIFICATION_REQUIRED',
                        assistantContent: message,
                        assistantSource: 'DETERMINISTIC_RENDERER',
                        durationMs: Date.now() - startedAt,
                        outputSummary: {
                            operation: 'transaction.create',
                            merchantResolution: merchantResolution.kind,
                        },
                    });
                    return {
                        httpStatus: 200,
                        response: {
                            status: 'clarification_required',
                            message,
                            data: publicResolution,
                            correlationId,
                            ...turn,
                        },
                    };
                }
                if (merchantResolution
                    && merchantResolution.kind !== 'resolved'
                    && merchantResolution.kind !== 'not_found') {
                    const invalid = errors_1.AssistantError.invalidInput('transaction.create', 'merchantReference is invalid');
                    const safeMessage = (0, persistence_1.safeRejectedAssistantMessage)(invalid.code);
                    await deps.conversations.finalize({
                        executionId,
                        ...turn,
                        status: 'FAILED',
                        turnStatus: 'REJECTED',
                        assistantContent: safeMessage,
                        assistantSource: 'SAFE_ERROR',
                        durationMs: Date.now() - startedAt,
                        safeErrorCode: invalid.code,
                        outputSummary: {
                            operation: 'transaction.create',
                            merchantResolution: merchantResolution.kind,
                        },
                    });
                    return {
                        httpStatus: invalid.statusCode,
                        response: {
                            status: 'rejected',
                            code: invalid.code,
                            message: safeMessage,
                            correlationId,
                            ...turn,
                        },
                    };
                }
                const merchantDisplayLabel = merchantResolution?.kind === 'resolved'
                    ? merchantResolution.displayLabel
                    : merchantResolution?.kind === 'not_found'
                        ? safeFreeFormMerchantText(merchantResolution.normalizedReference)
                        : undefined;
                const walletId = walletResolution
                    ? walletResolution.entity.internalId
                    : transactionInput.walletId;
                const draftInput = {
                    type: transactionInput.type,
                    amount: transactionInput.amount,
                    walletId,
                    categoryId: transactionInput.categoryId,
                    date: transactionInput.date,
                    ...(transactionInput.description !== undefined
                        ? { description: transactionInput.description }
                        : merchantDisplayLabel === undefined
                            ? {}
                            : { description: merchantDisplayLabel }),
                };
                const draft = await deps.financialDrafts.prepare({
                    ...draftInput,
                    ...(walletResolution === undefined
                        ? {}
                        : { walletDisplayLabel: walletResolution.displayLabel }),
                    ...(merchantDisplayLabel === undefined
                        ? {}
                        : { merchantDisplayLabel }),
                    userId,
                    ...turn,
                    executionId,
                });
                await deps.conversations.finalize({ executionId, ...turn, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: draft.renderedText, assistantSource: 'DETERMINISTIC_RENDERER', durationMs: Date.now() - startedAt, outputSummary: { draftId: draft.draftId, operation: 'transaction.create', status: 'PENDING_CONFIRMATION' } });
                return { httpStatus: 200, response: { status: 'success', renderedText: draft.renderedText, data: draft, correlationId, ...turn } };
            }
            catch (error) {
                const operational = error instanceof errors_1.AssistantError ? error : { message: 'Assistant draft preparation failed', statusCode: 500, code: 'ASSISTANT_DRAFT_PREPARATION_FAILED' };
                await deps.conversations.finalize({ executionId, ...turn, status: 'FAILED', turnStatus: 'FAILED', assistantContent: operational.message, assistantSource: 'SAFE_ERROR', durationMs: Date.now() - startedAt, safeErrorCode: operational.code }).catch(() => undefined);
                return { httpStatus: operational.statusCode, response: { status: 'error', code: operational.code, message: operational.message, correlationId, ...turn } };
            }
        }
        let result;
        try {
            result = await (0, executor_1.executeTool)(resolved.toolId, validatedInput, { userId, correlationId, ...turn, timestamp: new Date() }, deps.toolRegistry, deps.handlerRegistry);
        }
        catch (error) {
            const operational = error instanceof errors_1.AssistantError ? error : { message: 'Assistant execution failed', statusCode: 500, code: 'ASSISTANT_EXECUTION_FAILED' };
            const status = operational.code === 'ASSISTANT_EXECUTION_TIMEOUT' ? 'TIMED_OUT'
                : operational.code === 'ASSISTANT_POLICY_DENIED' || operational.code === 'ASSISTANT_TOOL_DISABLED' ? 'DENIED'
                    : 'FAILED';
            await deps.conversations.finalize({ executionId, ...turn, status, turnStatus: 'FAILED', assistantContent: operational.message, assistantSource: 'SAFE_ERROR', durationMs: Date.now() - startedAt, safeErrorCode: operational.code }).catch(() => undefined);
            return { httpStatus: operational.statusCode, response: { status: 'error', code: operational.code, message: operational.message, correlationId, ...turn } };
        }
        const renderedText = (0, persistence_1.assertAssistantMessageLength)((0, renderer_1.renderMonthlySpendingSummary)(result.output));
        try {
            await deps.conversations.finalize({ executionId, ...turn, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: renderedText, assistantSource: 'DETERMINISTIC_RENDERER', durationMs: result.durationMs, outputSummary: (0, persistence_1.monthlySummaryOutputForAudit)(result.output) });
        }
        catch (error) {
            logger_1.logger.error('assistant_finalization_failed', { correlationId, conversationId: turn.conversationId, turnId: turn.turnId });
            throw error;
        }
        return { httpStatus: 200, response: { status: 'success', renderedText, data: result.output, correlationId, ...turn } };
    }
    return { execute, prepareProviderExecution };
}
async function resolveTransactionWallet(service, authenticatedUserId, walletReference) {
    if (!service)
        throw new Error('Entity resolution service is not configured');
    return service.resolve({
        authenticatedUserId,
        reference: {
            entityType: 'wallet',
            referenceText: walletReference,
            source: 'provider_extracted',
        },
        trustedConstraints: entity_resolution_1.WALLET_TRANSACTION_CREATE_CONSTRAINTS,
    });
}
async function resolveTransactionMerchant(service, authenticatedUserId, merchantReference) {
    if (!service)
        throw new Error('Entity resolution service is not configured');
    return service.resolve({
        authenticatedUserId,
        reference: {
            entityType: 'merchant',
            referenceText: merchantReference,
            source: 'provider_extracted',
        },
        trustedConstraints: entity_resolution_1.MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
    });
}
function safeFreeFormMerchantText(normalizedReference) {
    if (!normalizedReference
        || Buffer.byteLength(normalizedReference, 'utf8') > 256
        || /[<>\u0000-\u001f\u007f-\u009f]/u.test(normalizedReference)) {
        throw errors_1.AssistantError.invalidInput('transaction.create', 'merchantReference is invalid');
    }
    return normalizedReference;
}
function renderWalletClarification(resolution) {
    if (resolution.kind === 'not_found') {
        return 'Wallet tersebut tidak ditemukan atau tidak dapat digunakan. Sebutkan nama wallet aktif yang lain.';
    }
    const options = resolution.options
        .map((option) => option.discriminator
        ? `${option.displayLabel} (${option.discriminator})`
        : option.displayLabel)
        .join(', ');
    return `Wallet yang dimaksud belum jelas. Pilih salah satu: ${options}.`;
}
function renderMerchantClarification(resolution) {
    const options = resolution.options
        .map((option) => option.displayLabel)
        .join(', ');
    return `Merchant yang dimaksud belum jelas. Pilih salah satu: ${options}.`;
}
//# sourceMappingURL=application.service.js.map