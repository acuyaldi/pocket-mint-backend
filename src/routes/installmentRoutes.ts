import { Router } from 'express';
import { getInstallments, getPaylaterRates } from '../controllers/installment.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const installmentRouter = Router();

// GET /api/v1/installments?status=ACTIVE
installmentRouter.get('/', requireUser, getInstallments);

// GET /api/v1/installments/rates — static provider rates
installmentRouter.get('/rates', requireUser, getPaylaterRates);

export { installmentRouter };
