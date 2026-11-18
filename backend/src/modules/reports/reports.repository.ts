import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

export const reportsRepository = {
  quotations(where: Prisma.QuotationWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take,
        orderBy: { issueDate: 'desc' },
        select: {
          number: true,
          status: true,
          issueDate: true,
          expirationDate: true,
          total: true,
          currency: true,
          clientNameSnapshot: true,
          createdBy: { select: { fullName: true } },
        },
      }),
      prisma.quotation.count({ where }),
      prisma.quotation.aggregate({ where, _sum: { total: true } }),
    ]);
  },

  clients(where: Prisma.QuotationWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.quotation.groupBy({
        by: ['clientId'],
        where,
        skip,
        take,
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      prisma.client.count({ where: { quotations: { some: where } } }),
    ]);
  },

  users(where: Prisma.QuotationWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.quotation.groupBy({
        by: ['createdById'],
        where,
        skip,
        take,
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
      }),
      prisma.user.count({ where: { quotations: { some: where } } }),
    ]);
  },

  clientsByIds(ids: string[]) {
    return prisma.client.findMany({
      where: { id: { in: ids } },
      select: { id: true, legalName: true },
    });
  },

  usersByIds(ids: string[]) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
  },
};
