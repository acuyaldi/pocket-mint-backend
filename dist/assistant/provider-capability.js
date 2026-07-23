"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProviderCapabilityCatalog = buildProviderCapabilityCatalog;
const policy_1 = require("./policy");
function buildProviderCapabilityCatalog(registry) {
    return registry.listEnabled()
        .map((tool) => ({
        intent: tool.id,
        description: tool.description,
        category: tool.capability,
        requiredArguments: [...tool.providerArguments.required].sort(),
        optionalArguments: [...tool.providerArguments.optional].sort(),
        argumentContract: Object.fromEntries(Object.entries(tool.providerArguments.properties).sort(([left], [right]) => left.localeCompare(right))),
        confirmationMayBeRequired: (0, policy_1.evaluatePolicy)(tool).action !== 'EXECUTE_IMMEDIATELY',
    }))
        .sort((left, right) => left.intent.localeCompare(right.intent));
}
//# sourceMappingURL=provider-capability.js.map