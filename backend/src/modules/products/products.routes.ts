import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import * as productsController from './products.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', productsController.list);
router.get('/:id', productsController.get);
router.post('/', requireRole('ADMINISTRADOR'), productsController.create);
router.put('/:id', requireRole('ADMINISTRADOR'), productsController.update);
router.patch('/:id/status', requireRole('ADMINISTRADOR'), productsController.setStatus);

export { router as productsRoutes };
