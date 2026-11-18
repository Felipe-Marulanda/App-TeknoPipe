import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

export const categoriesRepository = {
  list(where: Prisma.CategoryWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      prisma.category.count({ where }),
    ]);
  },

  get(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },
};
