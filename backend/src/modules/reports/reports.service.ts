import { Prisma } from '../../generated/prisma/client.js';
import type { ReportQuery } from './reports.validation.js';
import { reportsRepository } from './reports.repository.js';

function quotationWhere(input: ReportQuery): Prisma.QuotationWhereInput {
  const dateTo = input.to ? new Date(`${input.to}T00:00:00.000Z`) : undefined;
  if (dateTo) dateTo.setUTCDate(dateTo.getUTCDate() + 1);
  return {
    ...(input.status ? { status: input.status } : {}),
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.userId ? { createdById: input.userId } : {}),
    ...(input.from || dateTo
      ? {
          issueDate: {
            ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
            ...(dateTo ? { lt: dateTo } : {}),
          },
        }
      : {}),
  };
}

export const reportsService = {
  async quotations(input: ReportQuery) {
    const where = quotationWhere(input);
    const [data, total, aggregate] = await reportsRepository.quotations(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return {
      data: data.map((quotation) => ({
        number: quotation.number,
        status: quotation.status,
        issueDate: quotation.issueDate,
        expirationDate: quotation.expirationDate,
        clientName: quotation.clientNameSnapshot,
        createdBy: quotation.createdBy.fullName,
        total: quotation.total.toString(),
        currency: quotation.currency.trim(),
      })),
      meta: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        quotedValue: aggregate._sum.total?.toString() ?? '0.00',
      },
    };
  },

  async clients(input: ReportQuery) {
    const [groups, total] = await reportsRepository.clients(
      quotationWhere(input),
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    const clients = await reportsRepository.clientsByIds(groups.map((group) => group.clientId));
    const clientsById = new Map(clients.map((client) => [client.id, client.legalName]));
    return {
      data: groups.map((group) => ({
        clientId: group.clientId,
        clientName: clientsById.get(group.clientId) ?? '',
        quotationCount: group._count._all,
        quotedValue: group._sum.total?.toString() ?? '0.00',
      })),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  },

  async users(input: ReportQuery) {
    const [groups, total] = await reportsRepository.users(
      quotationWhere(input),
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    const users = await reportsRepository.usersByIds(groups.map((group) => group.createdById));
    const usersById = new Map(users.map((user) => [user.id, user.fullName]));
    return {
      data: groups.map((group) => ({
        userId: group.createdById,
        fullName: usersById.get(group.createdById) ?? '',
        quotationCount: group._count._all,
        quotedValue: group._sum.total?.toString() ?? '0.00',
      })),
      meta: { page: input.page, pageSize: input.pageSize, total },
    };
  },
};
