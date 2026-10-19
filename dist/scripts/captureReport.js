"use strict";
// ============================================================
// Read-only capture-quality report (Phase 39.0) over the Phase 35.1
// assistant_capture_events table. Only findMany is used — no writes.
//
//   npx ts-node src/scripts/captureReport.ts [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--min-samples=30] [--json]
//   # or, after build: node dist/scripts/captureReport.js [...]
//
// Defaults: the last 30 days (to = now), min samples 30. A rate whose
// denominator is below --min-samples prints INSUFFICIENT DATA.
// Exit code: 0 on success, 1 on usage/DB error.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = parseArgs;
exports.formatReport = formatReport;
exports.buildCaptureReport = buildCaptureReport;
const prisma_1 = __importDefault(require("../lib/prisma"));
const captureReport_1 = require("../domain/captureReport");
const DAY_MS = 24 * 60 * 60 * 1000;
function parseArgs(argv, now) {
    const value = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
    const date = (name, fallback) => {
        const raw = value(name);
        if (raw === undefined)
            return fallback;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime()))
            throw new Error(`--${name} must be a date (YYYY-MM-DD or ISO), got "${raw}"`);
        return parsed;
    };
    const to = date('to', now);
    const from = date('from', new Date(to.getTime() - 30 * DAY_MS));
    const minSamples = Number(value('min-samples') ?? 30);
    if (!(from < to))
        throw new Error('--from must be before --to');
    if (!Number.isInteger(minSamples) || minSamples < 1)
        throw new Error('--min-samples must be a positive integer');
    return { from, to, now, minSamples, json: argv.includes('--json') };
}
const pct = (rate) => rate.value === captureReport_1.INSUFFICIENT_DATA
    ? `${captureReport_1.INSUFFICIENT_DATA} (n=${rate.denominator})`
    : `${(rate.value * 100).toFixed(1)}% (${rate.numerator}/${rate.denominator})`;
function formatReport(groups, options) {
    const lines = [
        'Assistant capture report (Phase 39.0) — read-only, nothing was changed.',
        `Window: ${options.from.toISOString()} → ${options.to.toISOString()} · min samples ${options.minSamples}`,
    ];
    if (groups.length === 0)
        lines.push('', `No capture events in this window — ${captureReport_1.INSUFFICIENT_DATA}.`);
    for (const g of groups) {
        const o = g.outcomes;
        lines.push('', `== ${g.source} · ${g.phaseMarker} ==`, `Capture starts: ${g.captureStarts}`, '1. Clarification per field (of capture starts):', ...(Object.keys(g.clarificationByField).length === 0
            ? ['   (none)']
            : Object.entries(g.clarificationByField).sort().map(([f, r]) => `   ${f.padEnd(20)} ${pct(r)}`)), `2. Draft edit rate (of confirmed): ${pct(g.editRate)}${Object.keys(g.editedByField).length ? ` [${Object.entries(g.editedByField).sort().map(([f, n]) => `${f} ${n}`).join(', ')}]` : ''}`, `3. Cancel rate (of drafts created): ${pct(g.cancelRate)}`, `4. Direct-draft rate (vs after clarification): ${pct(g.directDraftRate)} — drafts created ${g.draftsCreated}`, `   Outcomes: confirmed ${o.confirmed} · cancelled ${o.cancelled} · expired ${o.expired} (+${o.abandonedPastTtl} abandoned past TTL) · failed ${o.failed} · open ${o.open}`);
    }
    lines.push('', '5. Web vs Telegram: compare the WEB and TELEGRAM sections of the same phase marker above.');
    return lines.join('\n');
}
async function buildCaptureReport(db, options) {
    // ponytail: loads the window's rows into memory and aggregates in TS. Fine
    // at current volume; move to SQL GROUP BY if the window reaches ~1e6 rows.
    // No upper bound on purpose: a draft created in-window may terminate after `to`.
    const rows = await db.assistantCaptureEvent.findMany({
        where: { occurredAt: { gte: options.from } },
        select: { occurredAt: true, eventType: true, source: true, phaseMarker: true, correlationKey: true, fields: true, origin: true },
    });
    return (0, captureReport_1.computeCaptureReport)(rows, options);
}
async function main() {
    const options = parseArgs(process.argv.slice(2), new Date());
    const groups = await buildCaptureReport(prisma_1.default, options);
    console.log(options.json ? JSON.stringify({ window: { from: options.from, to: options.to, minSamples: options.minSamples }, groups }, null, 2) : formatReport(groups, options));
    return 0;
}
if (require.main === module) {
    main()
        .then((code) => prisma_1.default.$disconnect().then(() => process.exit(code)))
        .catch(async (err) => {
        console.error('captureReport failed:', err instanceof Error ? err.message : String(err));
        await prisma_1.default.$disconnect();
        process.exit(1);
    });
}
//# sourceMappingURL=captureReport.js.map