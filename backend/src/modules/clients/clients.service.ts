import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../errors/app-error.js';
import { clientsRepository } from './clients.repository.js';
import type {
  ClientCreateInput,
  ClientListInput,
  ClientUpdateInput,
} from './clients.validation.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';

function normalizeIdentification(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export const clientsService = {
  async list(input: ClientListInput) {
    const search = input.search;
    const where: Prisma.ClientWhereInput = {
      ...(input.active === undefined ? {} : { active: input.active === 'true' }),
      ...(search
        ? {
            OR: [
              { legalName: { contains: search, mode: 'insensitive' } },
              { identificationNumber: { contains: normalizeIdentification(search) } },
            ],
          }
        : {}),
    };
    const [data, total] = await clientsRepository.findPage(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },

  async get(id: string) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new AppError(404, 'CLIENT_NOT_FOUND', 'No se encontró el cliente.');
    }
    return client;
  },

  create(input: ClientCreateInput) {
    const data: Prisma.ClientCreateInput = {
      identificationType: input.identificationType.trim().toUpperCase(),
      identificationNumber: normalizeIdentification(input.identificationNumber),
      legalName: input.legalName,
    };

    if (input.contactName !== undefined) data.contactName = input.contactName;
    if (input.email !== undefined) {
      data.email = input.email === null ? null : input.email.trim().toLowerCase();
    }
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.address !== undefined) data.address = input.address;
    if (input.city !== undefined) data.city = input.city;
    if (input.department !== undefined) data.department = input.department;

    return clientsRepository.create(data);
  },

  update(id: string, input: ClientUpdateInput) {
    const data: Prisma.ClientUpdateInput = {};

    if (input.identificationType !== undefined) {
      data.identificationType = input.identificationType.toUpperCase();
    }
    if (input.identificationNumber !== undefined) {
      data.identificationNumber = normalizeIdentification(input.identificationNumber);
    }
    if (input.legalName !== undefined) data.legalName = input.legalName;
    if (input.contactName !== undefined) data.contactName = input.contactName;
    if (input.email !== undefined) {
      data.email = input.email === null ? null : input.email.trim().toLowerCase();
    }
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.address !== undefined) data.address = input.address;
    if (input.city !== undefined) data.city = input.city;
    if (input.department !== undefined) data.department = input.department;

    return clientsRepository.update(id, data);
  },

  setActive(id: string, active: boolean) {
    return clientsRepository.update(id, { active });
  },

  async quotations(id: string, page: number, pageSize: number, user: AuthenticatedUser) {
    await clientsService.get(id);
    const where: Prisma.QuotationWhereInput = {
      clientId: id,
      ...(user.role === 'ADMINISTRADOR' ? {} : { createdById: user.id }),
    };
    const [data, total] = await clientsRepository.quotations(
      where,
      (page - 1) * pageSize,
      pageSize,
    );
    return { data, meta: { page, pageSize, total } };
  },
};
