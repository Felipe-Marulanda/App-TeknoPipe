import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as historyController from './history.controller.js';

const router = Router();

router.get('/', requireAuth, historyController.list);

export { router as historyRoutes };
