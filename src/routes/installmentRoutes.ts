import { Router } from 'express';
import { getInstallments, getPaylaterRates, payInstallment } from '../controllers/installment.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const installmentRouter = Router();

// GET /api/v1/installments?status=ACTIVE
installmentRouter.get('/', requireUser, getInstallments);

// GET /api/v1/installments/rates — static provider rates
installmentRouter.get('/rates', requireUser, getPaylaterRates);

// POST /api/v1/installments/:id/pay - records one installment repayment
installmentRouter.post('/:id/pay', requireUser, mutationLimiter, payInstallment);

export { installmentRouter };
