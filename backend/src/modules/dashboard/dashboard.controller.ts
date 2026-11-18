import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { dashboardService } from './dashboard.service.js';

function currentUser(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  return request.auth;
}

export const summary: RequestHandler = async (request, response) => {
  response.json({ data: await dashboardService.summary(currentUser(request)) });
};

export const quotationsByMonth: RequestHandler = async (request, response) => {
  response.json({ data: await dashboardService.quotationsByMonth(currentUser(request)) });
};

export const quotationsByStatus: RequestHandler = async (request, response) => {
  response.json({ data: await dashboardService.quotationsByStatus(currentUser(request)) });
};
