import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as pdfController from './pdf.controller.js';

const router = Router();

router.get('/quotations/:id/pdf', requireAuth, pdfController.quotation);

export { router as pdfRoutes };
