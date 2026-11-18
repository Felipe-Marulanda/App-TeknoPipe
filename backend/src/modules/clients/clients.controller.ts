import type { RequestHandler } from 'express';
import { z } from 'zod';
import { clientCreateSchema, clientListSchema, clientUpdateSchema } from './clients.validation.js';
import { clientsService } from './clients.service.js';
import { AppError } from '../../errors/app-error.js';

const idSchema = z.uuid();
const statusSchema = z.object({ active: z.boolean() });

export const list: RequestHandler = async (request, response) => {
  const query = clientListSchema.parse(request.query);
  response.json(await clientsService.list(query));
};

export const get: RequestHandler = async (request, response) => {
  response.json({ data: await clientsService.get(idSchema.parse(request.params.id)) });
};

export const create: RequestHandler = async (request, response) => {
  const input = clientCreateSchema.parse(request.body);
  response.status(201).json({ data: await clientsService.create(input) });
};

export const update: RequestHandler = async (request, response) => {
  const input = clientUpdateSchema.parse(request.body);
  response.json({
    data: await clientsService.update(idSchema.parse(request.params.id), input),
  });
};

export const setStatus: RequestHandler = async (request, response) => {
  const { active } = statusSchema.parse(request.body);
  response.json({
    data: await clientsService.setActive(idSchema.parse(request.params.id), active),
  });
};

export const quotations: RequestHandler = async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(request.query);
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  response.json({
    data: await clientsService.quotations(id, query.page, query.pageSize, request.auth),
  });
};
