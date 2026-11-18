import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import type {
  ProductCreateInput,
  ProductListInput,
  ProductUpdateInput,
} from './products.validation.js';
import { productsRepository } from './products.repository.js';

async function validateCategory(categoryId: string | null | undefined) {
  if (categoryId === undefined || categoryId === null) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category?.active) {
    throw new AppError(422, 'INVALID_CATEGORY', 'La categoría no existe o está inactiva.');
  }
}

export const productsService = {
  async list(input: ProductListInput) {
    const where: Prisma.ProductWhereInput = {
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.active === undefined ? {} : { active: input.active === 'true' }),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { reference: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await productsRepository.list(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },

  async get(id: string) {
    const product = await productsRepository.get(id);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto.');
    }
    return product;
  },

  async create(input: ProductCreateInput) {
    await validateCategory(input.categoryId);
    return productsRepository.create({
      reference: input.reference.trim().toUpperCase(),
      name: input.name,
      unit: input.unit,
      unitPrice: new Prisma.Decimal(input.unitPrice),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
    });
  },

  async update(id: string, input: ProductUpdateInput) {
    await productsService.get(id);
    await validateCategory(input.categoryId);
    const data: Prisma.ProductUpdateInput = {};
    if (input.reference !== undefined) data.reference = input.reference.trim().toUpperCase();
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(input.unitPrice);
    if (input.categoryId === null) data.category = { disconnect: true };
    else if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
    return productsRepository.update(id, data);
  },

  async setActive(id: string, active: boolean) {
    await productsService.get(id);
    return productsRepository.update(id, { active });
  },
};
