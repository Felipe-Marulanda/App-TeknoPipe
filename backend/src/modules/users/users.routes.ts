import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import * as usersController from './users.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMINISTRADOR'));
router.get('/', usersController.list);
router.post('/', usersController.create);
router.get('/:id', usersController.get);
router.put('/:id', usersController.update);
router.patch('/:id/status', usersController.setStatus);

export { router as usersRoutes };
