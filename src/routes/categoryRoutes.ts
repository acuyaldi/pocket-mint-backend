import { Router } from 'express';
import { getCategories } from '../controllers/category.controller';
import { getSuggestions } from '../controllers/categorization.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const categoryRouter = Router();

categoryRouter.get('/', requireUser, getCategories);
categoryRouter.get('/suggestions', requireUser, getSuggestions);

export { categoryRouter };
