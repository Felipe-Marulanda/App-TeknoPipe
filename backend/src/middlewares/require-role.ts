import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export function requireRole(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.'));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'No tiene permisos para realizar esta acción.'));
      return;
    }

    next();
  };
}
