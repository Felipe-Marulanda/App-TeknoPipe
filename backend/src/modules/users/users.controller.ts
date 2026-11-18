import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import {
  userCreateSchema,
  userListSchema,
  userStatusSchema,
  userUpdateSchema,
} from './users.validation.js';
import { usersService } from './users.service.js';

const idSchema = z.uuid();

function currentUser(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  return request.auth;
}

export const list: RequestHandler = async (request, response) => {
  response.json(await usersService.list(userListSchema.parse(request.query)));
};

export const get: RequestHandler = async (request, response) => {
  response.json({ data: await usersService.get(idSchema.parse(request.params.id)) });
};

export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json({ data: await usersService.create(userCreateSchema.parse(request.body)) });
};

export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await usersService.update(
      idSchema.parse(request.params.id),
      userUpdateSchema.parse(request.body),
      currentUser(request),
    ),
  });
};

export const setStatus: RequestHandler = async (request, response) => {
  const { active } = userStatusSchema.parse(request.body);
  response.json({
    data: await usersService.setActive(
      idSchema.parse(request.params.id),
      active,
      currentUser(request),
    ),
  });
};
