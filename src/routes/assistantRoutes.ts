import { Router } from 'express';
import { assistantExecute } from '../controllers/assistant.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const assistantRouter = Router();

// All Assistant endpoints require a verified user — the
// authenticated userId is the sole identity source.
assistantRouter.post('/execute', requireUser, assistantExecute);

export { assistantRouter };
