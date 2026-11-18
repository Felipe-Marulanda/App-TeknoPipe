import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

const includeCategory = { category: { select: { id: true, name: true, active: true } } };

export const productsRepository = {
  list(where: Prisma.ProductWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: includeCategory,
      }),
      prisma.product.count({ where }),
    ]);
  },

  get(id: string) {
    return prisma.product.findUnique({ where: { id }, include: includeCategory });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data, include: includeCategory });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data, include: includeCategory });
  },
};
