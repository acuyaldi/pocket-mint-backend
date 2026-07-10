import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/v1/installments/rates
 * Static paylater provider rates (bunga %/bulan + biaya admin %).
 */
export declare function getPaylaterRates(_req: Request, res: Response): void;
/**
 * GET /api/v1/installments
 * List installments for the authenticated user, optionally filtered by status.
 * Includes wallet name and type via relation.
 */
export declare function getInstallments(req: Request<unknown, unknown, unknown, {
    status?: string;
}>, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=installment.controller.d.ts.map