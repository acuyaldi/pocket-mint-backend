import { Request, Response, NextFunction } from 'express';
interface CreateWalletAliasBody {
    aliasDisplay?: string;
}
export declare class WalletAliasController {
    static create(req: Request<{
        walletId: string;
    }, unknown, CreateWalletAliasBody>, res: Response, next: NextFunction): Promise<void>;
    static remove(req: Request<{
        walletId: string;
        aliasId: string;
    }>, res: Response, next: NextFunction): Promise<void>;
}
export {};
