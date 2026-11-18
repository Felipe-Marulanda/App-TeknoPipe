import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  productCreateSchema,
  productListSchema,
  productStatusSchema,
  productUpdateSchema,
} from './products.validation.js';
import { productsService } from './products.service.js';

const idSchema = z.uuid();

export const list: RequestHandler = async (request, response) => {
  response.json(await productsService.list(productListSchema.parse(request.query)));
};

export const get: RequestHandler = async (request, response) => {
  response.json({ data: await productsService.get(idSchema.parse(request.params.id)) });
};

export const create: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json({ data: await productsService.create(productCreateSchema.parse(request.body)) });
};

export const update: RequestHandler = async (request, response) => {
  response.json({
    data: await productsService.update(
      idSchema.parse(request.params.id),
      productUpdateSchema.parse(request.body),
    ),
  });
};

export const setStatus: RequestHandler = async (request, response) => {
  const { active } = productStatusSchema.parse(request.body);
  response.json({
    data: await productsService.setActive(idSchema.parse(request.params.id), active),
  });
};
