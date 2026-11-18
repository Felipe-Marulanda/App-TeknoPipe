import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as reportsController from './reports.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/quotations', reportsController.quotations);
router.get('/clients', reportsController.clients);
router.get('/users', reportsController.users);

export { router as reportsRoutes };
