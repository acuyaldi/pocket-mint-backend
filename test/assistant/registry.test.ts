// ============================================================
// Tests: ToolRegistry
// ============================================================
import { describe, expect, it } from 'vitest';
import { ToolRegistry, AssistantError } from '../../src/assistant';

// ---- Helpers ---------------------------------------------------------------

function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test.tool',
    description: 'A test tool',
    capability: 'test.read',
    riskLevel: 'LOW' as const,
    confirmationPolicy: 'NONE' as const,
    idempotencyPolicy: 'NOT_REQUIRED' as const,
    timeoutMs: 5_000,
    enabled: true,
    validateInput: (input: unknown) => input,
    validateOutput: (output: unknown) => output,
    ...overrides,
  };
}

// ---- Tests -----------------------------------------------------------------

describe('ToolRegistry', () => {
  describe('registration and lookup', () => {
    it('registers a valid tool and retrieves it by ID', () => {
      const registry = new ToolRegistry();
      const tool = makeTool();
      registry.register(tool);
      expect(registry.get('test.tool')).toBeDefined();
      expect(registry.get('test.tool')!.id).toBe('test.tool');
      expect(registry.size).toBe(1);
    });

    it('returns undefined for an unregistered tool ID', () => {
      const registry = new ToolRegistry();
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('discovery', () => {
    it('lists enabled tools', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ id: 'tool.a' }));
      registry.register(makeTool({ id: 'tool.b' }));
      expect(registry.listEnabled()).toHaveLength(2);
    });

    it('excludes disabled tools from discovery', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ id: 'tool.a', enabled: false }));
      registry.register(makeTool({ id: 'tool.b' }));
      const enabled = registry.listEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('tool.b');
    });

    it('disabled tool is still in the registry and retrievable', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ id: 'tool.a', enabled: false }));
      expect(registry.get('tool.a')).toBeDefined();
      expect(registry.size).toBe(1);
    });
  });

  describe('invariant validation at registration', () => {
    it('rejects duplicate tool IDs', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ id: 'tool.a' }));
      expect(() => registry.register(makeTool({ id: 'tool.a' }))).toThrow(
        AssistantError,
      );
    });

    it('rejects a timeout of zero', () => {
      const registry = new ToolRegistry();
      expect(() => registry.register(makeTool({ timeoutMs: 0 }))).toThrow(
        AssistantError,
      );
    });

    it('rejects a negative timeout', () => {
      const registry = new ToolRegistry();
      expect(() => registry.register(makeTool({ timeoutMs: -1 }))).toThrow(
        AssistantError,
      );
    });

    it('rejects MEDIUM risk with NONE confirmation (weaker than risk demands)', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'MEDIUM', confirmationPolicy: 'NONE' }),
        ),
      ).toThrow(AssistantError);
    });

    it('rejects HIGH risk with NONE confirmation', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'HIGH', confirmationPolicy: 'NONE' }),
        ),
      ).toThrow(AssistantError);
    });

    it('accepts HIGH risk with EXPLICIT confirmation (minimum for HIGH)', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'HIGH', confirmationPolicy: 'EXPLICIT' }),
        ),
      ).not.toThrow();
    });

    it('accepts HIGH risk with STEP_UP confirmation (strengthened)', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'HIGH', confirmationPolicy: 'STEP_UP' }),
        ),
      ).not.toThrow();
    });

    it('rejects VERY_HIGH risk with EXPLICIT (must be DISABLED)', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'VERY_HIGH', confirmationPolicy: 'EXPLICIT' }),
        ),
      ).toThrow(AssistantError);
    });

    it('accepts MEDIUM risk with EXPLICIT confirmation', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'MEDIUM', confirmationPolicy: 'EXPLICIT' }),
        ),
      ).not.toThrow();
    });

    it('accepts LOW risk with EXPLICIT confirmation (stronger than required)', () => {
      const registry = new ToolRegistry();
      expect(() =>
        registry.register(
          makeTool({ riskLevel: 'LOW', confirmationPolicy: 'EXPLICIT' }),
        ),
      ).not.toThrow();
    });
  });

  describe('immutability after construction', () => {
    it('stored contracts are frozen so callers cannot mutate them', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ id: 'tool.a' }));

      const stored = registry.get('tool.a')!;
      expect(Object.isFrozen(stored)).toBe(true);
      expect(stored.id).toBe('tool.a');
      expect(stored.description).toBe('A test tool');
    });

    it('registry size reflects only registered tools', () => {
      const registry = new ToolRegistry();
      expect(registry.size).toBe(0);
      registry.register(makeTool({ id: 'a' }));
      registry.register(makeTool({ id: 'b' }));
      expect(registry.size).toBe(2);
    });
  });
});
