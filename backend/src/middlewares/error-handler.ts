import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos inválidos.',
        details: error.issues.map(({ path, message }) => ({ path, message })),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      response.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Ya existe un registro con esos datos.',
        },
      });
      return;
    }
    if (error.code === 'P2025') {
      response.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No se encontró el recurso solicitado.',
        },
      });
      return;
    }
  }

  console.error('Error no controlado en la API.', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno.',
    },
  });
};
