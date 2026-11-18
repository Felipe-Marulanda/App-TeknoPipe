import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

export const historyRepository = {
  list(
    where: Prisma.QuotationWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.QuotationOrderByWithRelationInput,
  ) {
    return Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          number: true,
          status: true,
          issueDate: true,
          expirationDate: true,
          total: true,
          currency: true,
          clientNameSnapshot: true,
          client: { select: { id: true, legalName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);
  },
};
