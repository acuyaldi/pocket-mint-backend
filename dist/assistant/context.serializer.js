"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeAssistantContext = serializeAssistantContext;
exports.assistantContextByteLength = assistantContextByteLength;
function serializeAssistantContext(context) {
    return JSON.stringify(context);
}
function assistantContextByteLength(context) {
    return Buffer.byteLength(serializeAssistantContext(context), 'utf8');
}
//# sourceMappingURL=context.serializer.js.map