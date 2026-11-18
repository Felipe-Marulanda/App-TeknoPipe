import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import * as clientsController from './clients.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', clientsController.list);
router.post('/', requireRole('ADMINISTRADOR', 'EMPLEADO'), clientsController.create);
router.get('/:id/quotations', clientsController.quotations);
router.get('/:id', clientsController.get);
router.put('/:id', requireRole('ADMINISTRADOR'), clientsController.update);
router.patch('/:id/status', requireRole('ADMINISTRADOR'), clientsController.setStatus);

export { router as clientsRoutes };
