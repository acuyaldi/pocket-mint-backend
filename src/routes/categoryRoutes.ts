import { Router } from 'express';
import { getCategories } from '../controllers/category.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const categoryRouter = Router();

categoryRouter.get('/', requireUser, getCategories);

export { categoryRouter };
