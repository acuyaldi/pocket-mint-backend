"use strict";
// ============================================================
// Assistant Core — static tool registry (§§8-9 of the ADR)
// ------------------------------------------------------------
// A passive, deterministic catalogue of tool contracts. It does
// not know about conversations, does not plan, does not execute
// tools, and is never modified by an LLM.
//
// Registration-time invariant validation catches:
//  - duplicate tool IDs
//  - invalid (≤0) timeout
//  - confirmation policy weaker than the risk tier allows
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const errors_1 = require("./errors");
class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }
    // -- Registration ----------------------------------------------------------
    /**
     * Register a tool contract. Validates invariants and rejects duplicates.
     * After registration, the contract is frozen — callers cannot mutate it.
     */
    register(tool) {
        if (this.tools.has(tool.id)) {
            throw errors_1.AssistantError.duplicateRegistration(tool.id);
        }
        this.validateInvariants(tool);
        this.tools.set(tool.id, Object.freeze(tool));
    }
    // -- Lookup ----------------------------------------------------------------
    /** Look up a tool by its stable ID, or `undefined` if not registered. */
    get(id) {
        return this.tools.get(id);
    }
    // -- Discovery -------------------------------------------------------------
    /** Return every enabled tool. Disabled tools are invisible to callers. */
    listEnabled() {
        return [...this.tools.values()].filter((t) => t.enabled);
    }
    /** Total number of registered tools (enabled + disabled). */
    get size() {
        return this.tools.size;
    }
    // -- Invariant validation --------------------------------------------------
    validateInvariants(tool) {
        if (tool.timeoutMs <= 0) {
            throw errors_1.AssistantError.invalidTimeout(tool.id, tool.timeoutMs);
        }
        // Confirmation policy must not be weaker than the risk tier demands.
        // A stronger confirmation (e.g. LOW + EXPLICIT) is allowed — the user
        // may opt into extra safety. The reverse is a registration error.
        //
        // Minimums per risk tier:
        //   LOW       → NONE     (immediate execution)
        //   MEDIUM    → EXPLICIT (draft + confirm)
        //   HIGH      → EXPLICIT (draft + confirm, stronger preview)
        //   VERY_HIGH → DISABLED (unavailable in v1)
        //
        // STEP_UP is an optional strengthening available to any tier.
        if ((tool.riskLevel === 'MEDIUM' || tool.riskLevel === 'HIGH') &&
            tool.confirmationPolicy === 'NONE') {
            throw errors_1.AssistantError.policyMismatch(tool.id, `${tool.riskLevel} risk requires at least EXPLICIT confirmation`);
        }
        if (tool.riskLevel === 'VERY_HIGH' && tool.confirmationPolicy !== 'DISABLED') {
            throw errors_1.AssistantError.policyMismatch(tool.id, 'VERY_HIGH risk requires DISABLED confirmation policy');
        }
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=registry.js.map