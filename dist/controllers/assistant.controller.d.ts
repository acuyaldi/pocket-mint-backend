import type { NextFunction, Request, Response } from 'express';
import type { AssistantApplicationService } from '../assistant/application.service';
import type { AssistantConversationService } from '../assistant/conversation.service';
export declare function createAssistantControllers(application: AssistantApplicationService, conversations: AssistantConversationService): {
    execute: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    list: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    get: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    archive: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export declare const assistantExecute: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listAssistantConversations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAssistantConversation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const archiveAssistantConversation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=assistant.controller.d.ts.map