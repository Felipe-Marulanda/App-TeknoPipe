import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', dashboardController.summary);
router.get('/quotations-by-month', dashboardController.quotationsByMonth);
router.get('/quotations-by-status', dashboardController.quotationsByStatus);

export { router as dashboardRoutes };
