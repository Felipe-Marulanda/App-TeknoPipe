import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../errors/app-error.js';
import type {
  CategoryCreateInput,
  CategoryListInput,
  CategoryUpdateInput,
} from './categories.validation.js';
import { categoriesRepository } from './categories.repository.js';

export const categoriesService = {
  async list(input: CategoryListInput) {
    const where: Prisma.CategoryWhereInput = {
      ...(input.active === undefined ? {} : { active: input.active === 'true' }),
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await categoriesRepository.list(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },

  async get(id: string) {
    const category = await categoriesRepository.get(id);
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
    }
    return category;
  },

  create(input: CategoryCreateInput) {
    return categoriesRepository.create({
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
    });
  },

  update(id: string, input: CategoryUpdateInput) {
    const data: Prisma.CategoryUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    return categoriesRepository.update(id, data);
  },

  setActive(id: string, active: boolean) {
    return categoriesRepository.update(id, { active });
  },
};
