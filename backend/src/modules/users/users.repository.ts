import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

export const usersRepository = {
  list(where: Prisma.UserWhereInput, skip: number, take: number) {
    return Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { fullName: 'asc' },
        select: safeUserSelect,
      }),
      prisma.user.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: safeUserSelect });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: safeUserSelect });
  },

  updatePassword(id: string, data: Prisma.UserUpdateInput) {
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({ where: { id }, data, select: safeUserSelect });
      await transaction.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return user;
    });
  },

  setActive(id: string, active: boolean) {
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id },
        data: { active },
        select: safeUserSelect,
      });
      if (!active) {
        await transaction.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
  },

  activeAdministratorsCount() {
    return prisma.user.count({
      where: { active: true, role: { name: 'ADMINISTRADOR' } },
    });
  },
};
