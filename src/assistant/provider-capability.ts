import { evaluatePolicy } from './policy';
import type { ToolRegistry } from './registry';
import type { ProviderCapability } from './provider-types';

export function buildProviderCapabilityCatalog(registry: ToolRegistry): ProviderCapability[] {
  return registry.listEnabled()
    .map((tool): ProviderCapability => ({
      intent: tool.id,
      description: tool.description,
      category: tool.capability,
      requiredArguments: [...tool.providerArguments.required].sort(),
      optionalArguments: [...tool.providerArguments.optional].sort(),
      argumentContract: Object.fromEntries(
        Object.entries(tool.providerArguments.properties).sort(([left], [right]) => left.localeCompare(right)),
      ),
      confirmationMayBeRequired: evaluatePolicy(tool).action !== 'EXECUTE_IMMEDIATELY',
    }))
    .sort((left, right) => left.intent.localeCompare(right.intent));
}
