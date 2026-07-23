import { Router } from 'express';
import { archiveAssistantConversation, assistantExecute, assistantMessages, cancelAssistantFinancialDraft, confirmAssistantFinancialDraft, getAssistantConversation, listAssistantConversations } from '../controllers/assistant.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const assistantRouter = Router();

// All Assistant endpoints require a verified user — the
// authenticated userId is the sole identity source.
assistantRouter.post('/execute', requireUser, mutationLimiter, assistantExecute);
assistantRouter.post('/messages', requireUser, mutationLimiter, assistantMessages);
assistantRouter.get('/conversations', requireUser, listAssistantConversations);
assistantRouter.get('/conversations/:conversationId', requireUser, getAssistantConversation);
assistantRouter.post('/conversations/:conversationId/archive', requireUser, mutationLimiter, archiveAssistantConversation);
assistantRouter.post('/drafts/:draftId/confirm', requireUser, mutationLimiter, confirmAssistantFinancialDraft);
assistantRouter.post('/drafts/:draftId/cancel', requireUser, mutationLimiter, cancelAssistantFinancialDraft);

export { assistantRouter };
