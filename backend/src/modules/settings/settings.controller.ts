import type { RequestHandler } from 'express';
import { settingsUpdateSchema } from './settings.validation.js';
import { settingsService } from './settings.service.js';

export const get: RequestHandler = async (_request, response) => {
  response.json({ data: await settingsService.get() });
};

export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await settingsService.update(settingsUpdateSchema.parse(request.body)),
  });
};
