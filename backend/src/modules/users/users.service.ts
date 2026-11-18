import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../errors/app-error.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';
import type { UserCreateInput, UserListInput, UserUpdateInput } from './users.validation.js';
import { usersRepository } from './users.repository.js';

export const usersService = {
  async list(input: UserListInput) {
    const where: Prisma.UserWhereInput = {
      ...(input.role ? { role: { name: input.role } } : {}),
      ...(input.active === undefined ? {} : { active: input.active === 'true' }),
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await usersRepository.list(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },

  async get(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
    }
    return user;
  },

  async create(input: UserCreateInput) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return usersRepository.create({
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName,
      passwordHash,
      role: { connect: { name: input.role } },
    });
  },

  async update(id: string, input: UserUpdateInput, actor: AuthenticatedUser) {
    const current = await usersRepository.findById(id);
    if (!current) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
    }
    if (actor.id === id && input.role && input.role !== current.role.name) {
      throw new AppError(409, 'SELF_ROLE_CHANGE', 'No puede cambiar su propio rol.');
    }
    if (
      current.active &&
      current.role.name === 'ADMINISTRADOR' &&
      input.role !== undefined &&
      input.role !== 'ADMINISTRADOR' &&
      (await usersRepository.activeAdministratorsCount()) <= 1
    ) {
      throw new AppError(
        409,
        'LAST_ADMINISTRATOR',
        'Debe existir al menos un administrador activo.',
      );
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.password !== undefined) data.passwordHash = await bcrypt.hash(input.password, 12);
    if (input.role !== undefined) data.role = { connect: { name: input.role } };
    return input.password !== undefined
      ? usersRepository.updatePassword(id, data)
      : usersRepository.update(id, data);
  },

  async setActive(id: string, active: boolean, actor: AuthenticatedUser) {
    const current = await usersRepository.findById(id);
    if (!current) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
    }
    if (actor.id === id && !active) {
      throw new AppError(409, 'SELF_DEACTIVATION', 'No puede desactivar su propio usuario.');
    }
    if (
      !active &&
      current.active &&
      current.role.name === 'ADMINISTRADOR' &&
      (await usersRepository.activeAdministratorsCount()) <= 1
    ) {
      throw new AppError(
        409,
        'LAST_ADMINISTRATOR',
        'Debe existir al menos un administrador activo.',
      );
    }
    return usersRepository.setActive(id, active);
  },
};
