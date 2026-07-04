import { Router } from 'express';
import { getInstallments, getPaylaterRates } from '../controllers/installment.controller';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const installmentRouter = Router();

// GET /api/v1/installments?status=ACTIVE
installmentRouter.get('/', apiKeyAuth, getInstallments);

// GET /api/v1/installments/rates — static provider rates
installmentRouter.get('/rates', apiKeyAuth, getPaylaterRates);

export { installmentRouter };
