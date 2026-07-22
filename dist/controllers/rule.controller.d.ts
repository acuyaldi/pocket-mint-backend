import { Request, Response, NextFunction } from 'express';
import type { CreateRuleDto, ReorderRulesDto, UpdateRuleDto } from '../models/rule.model';
export declare class RuleController {
    static list(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request<unknown, unknown, CreateRuleDto>, res: Response, next: NextFunction): Promise<void>;
    static reorder(req: Request<unknown, unknown, ReorderRulesDto>, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request<{
        id: string;
    }, unknown, UpdateRuleDto>, res: Response, next: NextFunction): Promise<void>;
    static remove(req: Request<{
        id: string;
    }>, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=rule.controller.d.ts.map