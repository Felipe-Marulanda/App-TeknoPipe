import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { historyListSchema } from './history.validation.js';
import { historyService } from './history.service.js';

export const list: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  response.json(await historyService.list(historyListSchema.parse(request.query), request.auth));
};
