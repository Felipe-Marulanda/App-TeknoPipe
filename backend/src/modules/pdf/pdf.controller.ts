import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { pdfService } from './pdf.service.js';

const idSchema = z.uuid();

export const quotation: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  const id = idSchema.parse(request.params.id);
  const pdf = await pdfService.generateQuotation(id, request.auth);
  const filename = `cotizacion-${id.replaceAll('-', '')}.pdf`;
  response
    .status(200)
    .type('application/pdf')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .send(pdf);
};
