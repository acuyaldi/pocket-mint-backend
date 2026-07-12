import { Request, Response, NextFunction } from 'express';
import { CreateTransactionDto, UpdateTransactionDto } from '../models/transaction.model';
export declare class TransactionController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static summary(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAllTime(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request<unknown, unknown, CreateTransactionDto>, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request<{
        id: string;
    }, unknown, UpdateTransactionDto>, res: Response, next: NextFunction): Promise<void>;
    static delete(req: Request<{
        id: string;
    }>, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=transaction.controller.d.ts.map