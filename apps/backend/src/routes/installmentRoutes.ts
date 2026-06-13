import { Router } from 'express';
import { getInstallments } from '../controllers/installment.controller';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const installmentRouter = Router();

// GET /api/v1/installments?status=ACTIVE
installmentRouter.get('/', apiKeyAuth, getInstallments);

export { installmentRouter };
