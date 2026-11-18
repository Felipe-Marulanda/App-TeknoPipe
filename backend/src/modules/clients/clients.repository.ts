import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

export const clientsRepository = {
  findPage(where: Prisma.ClientWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { legalName: 'asc' },
      }),
      prisma.client.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  create(data: Prisma.ClientCreateInput) {
    return prisma.client.create({ data });
  },

  update(id: string, data: Prisma.ClientUpdateInput) {
    return prisma.client.update({ where: { id }, data });
  },

  quotations(where: Prisma.QuotationWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          status: true,
          issueDate: true,
          expirationDate: true,
          total: true,
          currency: true,
        },
      }),
      prisma.quotation.count({ where }),
    ]);
  },
};
