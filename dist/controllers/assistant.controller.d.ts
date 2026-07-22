import type { Request, Response, NextFunction } from 'express';
/**
 * POST /v1/assistant/execute
 *
 * Authenticated. Accepts a provider-neutral canonical request.
 * Never accepts a caller-supplied user ID — identity comes from
 * the verified JWT via `req.auth`.
 */
export declare function assistantExecute(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=assistant.controller.d.ts.map