import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as quotationsController from './quotations.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', quotationsController.list);
router.post('/', quotationsController.create);
router.get('/:id/history', quotationsController.history);
router.post('/:id/duplicate', quotationsController.duplicate);
router.put('/:id', quotationsController.update);
router.get('/:id', quotationsController.get);
router.patch('/:id/status', quotationsController.changeStatus);

export { router as quotationsRoutes };
