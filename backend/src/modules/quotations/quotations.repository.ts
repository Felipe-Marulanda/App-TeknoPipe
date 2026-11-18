import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

export const quotationsRepository = {
  list(where: Prisma.QuotationWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, legalName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);
  },

  find(id: string) {
    return prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { lineNumber: 'asc' } },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          include: { changedBy: { select: { id: true, fullName: true } } },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  },
};
