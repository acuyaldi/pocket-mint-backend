import { Router } from 'express';
import { RuleController } from '../controllers/rule.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const ruleRouter = Router();

// GET /api/v1/rules
ruleRouter.get('/', requireUser, RuleController.list);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
ruleRouter.post('/', requireUser, mutationLimiter, RuleController.create);
// Must be registered before '/:id' so 'reorder' isn't captured as an id.
ruleRouter.patch('/reorder', requireUser, mutationLimiter, RuleController.reorder);
ruleRouter.patch('/:id', requireUser, mutationLimiter, RuleController.update);
ruleRouter.delete('/:id', requireUser, mutationLimiter, RuleController.remove);

export { ruleRouter };
