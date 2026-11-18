import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import * as categoriesController from './categories.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', categoriesController.list);
router.get('/:id', categoriesController.get);
router.post('/', requireRole('ADMINISTRADOR'), categoriesController.create);
router.put('/:id', requireRole('ADMINISTRADOR'), categoriesController.update);
router.patch('/:id/status', requireRole('ADMINISTRADOR'), categoriesController.setStatus);

export { router as categoriesRoutes };
