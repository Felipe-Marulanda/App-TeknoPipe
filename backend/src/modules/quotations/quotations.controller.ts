import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import {
  quotationCreateSchema,
  quotationDuplicateSchema,
  quotationListSchema,
  quotationStatusSchema,
} from './quotations.validation.js';
import { quotationsService } from './quotations.service.js';

const idSchema = z.uuid();

function currentUser(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  return request.auth;
}

export const list: RequestHandler = async (request, response) => {
  response.json(
    await quotationsService.list(quotationListSchema.parse(request.query), currentUser(request)),
  );
};

export const get: RequestHandler = async (request, response) => {
  response.json({
    data: await quotationsService.get(idSchema.parse(request.params.id), currentUser(request)),
  });
};

export const create: RequestHandler = async (request, response) => {
  const quotation = await quotationsService.create(
    quotationCreateSchema.parse(request.body),
    currentUser(request),
  );
  response.status(201).json({ data: quotation });
};

export const update: RequestHandler = async (request, response) => {
  const quotation = await quotationsService.update(
    idSchema.parse(request.params.id),
    quotationCreateSchema.parse(request.body),
    currentUser(request),
  );
  response.json({ data: quotation });
};

export const duplicate: RequestHandler = async (request, response) => {
  const quotation = await quotationsService.duplicate(
    idSchema.parse(request.params.id),
    currentUser(request),
    quotationDuplicateSchema.parse(request.body ?? {}),
  );
  response.status(201).json({ data: quotation });
};

export const history: RequestHandler = async (request, response) => {
  response.json({
    data: await quotationsService.history(idSchema.parse(request.params.id), currentUser(request)),
  });
};

export const changeStatus: RequestHandler = async (request, response) => {
  const input = quotationStatusSchema.parse(request.body);
  const quotation = await quotationsService.changeStatus(
    idSchema.parse(request.params.id),
    input.status,
    currentUser(request),
    input.observation,
  );
  response.json({ data: quotation });
};
