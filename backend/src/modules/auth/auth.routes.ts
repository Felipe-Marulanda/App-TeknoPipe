import { Router } from 'express';
import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as authController from './auth.controller.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiados intentos. Intente nuevamente más tarde.',
      },
    });
  },
});

const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  if (request.get('origin') !== env.CORS_ORIGIN) {
    next(new AppError(403, 'UNTRUSTED_ORIGIN', 'Origen no autorizado.'));
    return;
  }
  next();
};

router.post('/login', loginLimiter, authController.login);
router.post('/refresh', requireTrustedOrigin, authController.refresh);
router.post('/logout', requireTrustedOrigin, authController.logout);
router.get('/me', requireAuth, authController.me);

export { router as authRoutes };
