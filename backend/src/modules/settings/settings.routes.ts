import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import * as settingsController from './settings.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMINISTRADOR'));
router.get('/', settingsController.get);
router.put('/', settingsController.update);

export { router as settingsRoutes };
