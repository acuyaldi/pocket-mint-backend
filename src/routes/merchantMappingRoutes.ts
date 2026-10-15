import { Router } from 'express';
import { MerchantMappingController } from '../controllers/merchantMapping.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const merchantMappingRouter = Router();

// GET /api/v1/merchant-mappings?search=
merchantMappingRouter.get('/', requireUser, MerchantMappingController.list);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
merchantMappingRouter.post('/', requireUser, mutationLimiter, MerchantMappingController.create);
merchantMappingRouter.patch('/:id', requireUser, mutationLimiter, MerchantMappingController.update);
merchantMappingRouter.delete('/:id', requireUser, mutationLimiter, MerchantMappingController.remove);

export { merchantMappingRouter };
