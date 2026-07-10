import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/v1/wallets
 * Returns list of wallets for the authenticated user,
 * with computed fields: sisa_limit & outstanding_debt for DEBT wallets.
 */
export declare const getAllWallets: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * POST /api/v1/wallets
 * Create a new wallet for the user.
 */
export declare const createWallet: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/v1/wallets/:id
 * Update wallet details.
 */
export declare const updateWallet: (req: Request<{
    id: string;
}>, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/v1/wallets/:id
 * Hard delete with transaction check: refuses when the wallet has transaction
 * history unless ?force=true (frontend confirm modal sends force).
 */
export declare const deleteWallet: (req: Request<{
    id: string;
}>, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/v1/wallets/:id/sparkline
 * Returns up to 7 historical balance data points for a wallet.
 * Used to render mini sparkline charts on dashboard wallet cards.
 */
export declare const getWalletSparkline: (req: Request<{
    id: string;
}>, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=account.controller.d.ts.map