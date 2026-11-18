import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';
import { historyRepository } from './history.repository.js';
import type { HistoryListInput } from './history.validation.js';

function nextDay(date: string): Date {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

export const historyService = {
  async list(input: HistoryListInput, user: AuthenticatedUser) {
    const where: Prisma.QuotationWhereInput = {
      ...(user.role === 'ADMINISTRADOR' ? {} : { createdById: user.id }),
      ...(input.status ? { status: input.status } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.from || input.to
        ? {
            issueDate: {
              ...(input.from ? { gte: new Date(`${input.from}T00:00:00.000Z`) } : {}),
              ...(input.to ? { lt: nextDay(input.to) } : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { number: { contains: input.search, mode: 'insensitive' } },
              { clientNameSnapshot: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.QuotationOrderByWithRelationInput =
      input.sortBy === 'issueDate'
        ? { issueDate: input.sortOrder }
        : input.sortBy === 'total'
          ? { total: input.sortOrder }
          : { createdAt: input.sortOrder };
    const [data, total] = await historyRepository.list(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
      orderBy,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },
};
