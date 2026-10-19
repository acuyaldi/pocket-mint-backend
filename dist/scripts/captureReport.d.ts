import type { PrismaClient } from '../generated/prisma/client';
import { type CaptureReportGroup, type CaptureReportOptions } from '../domain/captureReport';
export declare function parseArgs(argv: readonly string[], now: Date): CaptureReportOptions & {
    json: boolean;
};
export declare function formatReport(groups: readonly CaptureReportGroup[], options: CaptureReportOptions): string;
export declare function buildCaptureReport(db: Pick<PrismaClient, 'assistantCaptureEvent'>, options: CaptureReportOptions): Promise<CaptureReportGroup[]>;
