import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { reportQuerySchema } from './reports.validation.js';
import { reportsService } from './reports.service.js';

type CsvValue = string | number | Date | null;
type CsvRow = Record<string, CsvValue>;

function csvCell(value: CsvValue): string {
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function sendReport(
  response: Parameters<RequestHandler>[1],
  report: { data: CsvRow[]; meta: object },
  format: string,
  name: string,
  headers: string[],
) {
  if (format !== 'csv') {
    response.json(report);
    return;
  }
  const csv = [
    headers.map(csvCell).join(','),
    ...report.data.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(',')),
  ].join('\r\n');
  response
    .status(200)
    .type('text/csv; charset=utf-8')
    .setHeader('Content-Disposition', `attachment; filename="${name}.csv"`)
    .send(`\uFEFF${csv}`);
}

function assertAdmin(request: Parameters<RequestHandler>[0]) {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }
  if (request.auth.role !== 'ADMINISTRADOR') {
    throw new AppError(403, 'FORBIDDEN', 'No tiene permisos para consultar reportes.');
  }
}

export const quotations: RequestHandler = async (request, response) => {
  assertAdmin(request);
  const input = reportQuerySchema.parse(request.query);
  const report = await reportsService.quotations(input);
  sendReport(response, report, input.format, 'reporte-cotizaciones', [
    'number',
    'status',
    'issueDate',
    'expirationDate',
    'clientName',
    'createdBy',
    'total',
    'currency',
  ]);
};

export const clients: RequestHandler = async (request, response) => {
  assertAdmin(request);
  const input = reportQuerySchema.parse(request.query);
  const report = await reportsService.clients(input);
  sendReport(response, report, input.format, 'reporte-clientes', [
    'clientId',
    'clientName',
    'quotationCount',
    'quotedValue',
  ]);
};

export const users: RequestHandler = async (request, response) => {
  assertAdmin(request);
  const input = reportQuerySchema.parse(request.query);
  const report = await reportsService.users(input);
  sendReport(response, report, input.format, 'reporte-usuarios', [
    'userId',
    'fullName',
    'quotationCount',
    'quotedValue',
  ]);
};
