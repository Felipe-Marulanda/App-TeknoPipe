import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  categoryCreateSchema,
  categoryListSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
} from './categories.validation.js';
import { categoriesService } from './categories.service.js';

const idSchema = z.uuid();

export const list: RequestHandler = async (request, response) => {
  response.json(await categoriesService.list(categoryListSchema.parse(request.query)));
};

export const get: RequestHandler = async (request, response) => {
  response.json({ data: await categoriesService.get(idSchema.parse(request.params.id)) });
};

export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json({ data: await categoriesService.create(categoryCreateSchema.parse(request.body)) });
};

export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await categoriesService.update(
      idSchema.parse(request.params.id),
      categoryUpdateSchema.parse(request.body),
    ),
  });
};

export const setStatus: RequestHandler = async (request, response) => {
  const { active } = categoryStatusSchema.parse(request.body);
  response.json({
    data: await categoriesService.setActive(idSchema.parse(request.params.id), active),
  });
};
