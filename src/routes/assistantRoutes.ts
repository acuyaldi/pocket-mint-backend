import { Router } from 'express';
import { archiveAssistantConversation, assistantExecute, getAssistantConversation, listAssistantConversations } from '../controllers/assistant.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const assistantRouter = Router();

// All Assistant endpoints require a verified user — the
// authenticated userId is the sole identity source.
assistantRouter.post('/execute', requireUser, mutationLimiter, assistantExecute);
assistantRouter.get('/conversations', requireUser, listAssistantConversations);
assistantRouter.get('/conversations/:conversationId', requireUser, getAssistantConversation);
assistantRouter.post('/conversations/:conversationId/archive', requireUser, mutationLimiter, archiveAssistantConversation);

export { assistantRouter };
