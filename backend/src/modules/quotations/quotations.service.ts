import { Prisma, QuotationStatus } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { calculateQuotation } from './quotation-calculator.js';
import type {
  QuotationCreateInput,
  QuotationDuplicateInput,
  QuotationListInput,
} from './quotations.validation.js';
import { quotationsRepository } from './quotations.repository.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';

function addDays(date: Date, days: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export const quotationsService = {
  async list(input: QuotationListInput, user: AuthenticatedUser) {
    const where: Prisma.QuotationWhereInput = {
      ...(user.role === 'ADMINISTRADOR' ? {} : { createdById: user.id }),
      ...(input.status ? { status: input.status as QuotationStatus } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.search ? { number: { contains: input.search, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await quotationsRepository.list(
      where,
      (input.page - 1) * input.pageSize,
      input.pageSize,
    );
    return { data, meta: { page: input.page, pageSize: input.pageSize, total } };
  },

  async get(id: string, user: AuthenticatedUser) {
    const quotation = await quotationsRepository.find(id);
    if (!quotation || (user.role !== 'ADMINISTRADOR' && quotation.createdById !== user.id)) {
      throw new AppError(404, 'QUOTATION_NOT_FOUND', 'No se encontró la cotización.');
    }
    return quotation;
  },

  async create(input: QuotationCreateInput, user: AuthenticatedUser) {
    const [client, products, settings] = await Promise.all([
      prisma.client.findUnique({ where: { id: input.clientId } }),
      prisma.product.findMany({
        where: { id: { in: input.items.map((item) => item.productId) } },
      }),
      prisma.companySettings.findUnique({ where: { id: 1 } }),
    ]);

    if (!client?.active) {
      throw new AppError(422, 'INVALID_CLIENT', 'El cliente no existe o está inactivo.');
    }
    if (!settings) {
      throw new AppError(503, 'SETTINGS_UNAVAILABLE', 'La configuración de empresa no está lista.');
    }
    const productsById = new Map(products.map((product) => [product.id, product]));
    const selectedProducts = input.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product?.active) {
        throw new AppError(
          422,
          'INVALID_PRODUCT',
          'Uno de los productos no existe o está inactivo.',
        );
      }
      if (
        !settings.discountsEnabled &&
        item.discountAmount &&
        new Prisma.Decimal(item.discountAmount).isPositive()
      ) {
        throw new AppError(422, 'DISCOUNTS_DISABLED', 'Los descuentos no están habilitados.');
      }
      return { input: item, product };
    });

    const calculation = calculateQuotation(
      selectedProducts.map(({ input: item, product }) => ({
        quantity: item.quantity,
        unitPrice: product.unitPrice.toString(),
        discountAmount: item.discountAmount ?? '0',
      })),
      settings.taxRate.toString(),
    );
    const issueDate = new Date();
    const issueDateOnly = addDays(issueDate, 0);
    const expirationDate = input.expirationDate
      ? new Date(`${input.expirationDate}T00:00:00.000Z`)
      : settings.defaultValidityDays !== null
        ? addDays(issueDateOnly, settings.defaultValidityDays)
        : null;
    if (!expirationDate) {
      throw new AppError(
        422,
        'EXPIRATION_DATE_REQUIRED',
        'Indique una fecha de vencimiento o configure la vigencia predeterminada.',
      );
    }
    if (expirationDate < issueDateOnly) {
      throw new AppError(
        422,
        'INVALID_EXPIRATION_DATE',
        'La fecha de vencimiento no puede estar en el pasado.',
      );
    }

    return prisma.$transaction(async (transaction) => {
      const year = issueDate.getUTCFullYear();
      const [counter] = await transaction.$queryRaw<{ last_number: number }[]>`
        INSERT INTO "quotation_counters" ("year", "last_number", "updated_at")
        VALUES (${year}, 1, now())
        ON CONFLICT ("year")
        DO UPDATE SET
          "last_number" = "quotation_counters"."last_number" + 1,
          "updated_at" = now()
        RETURNING "last_number"
      `;
      if (!counter) {
        throw new AppError(500, 'NUMBER_GENERATION_FAILED', 'No fue posible asignar un número.');
      }

      const number = `${settings.quotationPrefix}-${year}-${String(counter.last_number).padStart(6, '0')}`;
      return transaction.quotation.create({
        data: {
          number,
          clientId: client.id,
          createdById: user.id,
          status: 'BORRADOR',
          issueDate: issueDateOnly,
          expirationDate,
          clientIdentificationType: client.identificationType,
          clientIdentificationSnapshot: client.identificationNumber,
          clientNameSnapshot: client.legalName,
          clientContactSnapshot: client.contactName,
          clientEmailSnapshot: client.email,
          clientPhoneSnapshot: client.phone,
          clientAddressSnapshot: client.address,
          clientCitySnapshot: client.city,
          clientDepartmentSnapshot: client.department,
          currency: settings.currency,
          taxRate: settings.taxRate,
          subtotal: calculation.subtotal,
          discountTotal: calculation.discountTotal,
          taxTotal: calculation.taxTotal,
          total: calculation.total,
          ...(input.observations !== undefined ? { observations: input.observations } : {}),
          commercialTerms: input.commercialTerms ?? settings.defaultTerms,
          items: {
            create: selectedProducts.map(({ input: item, product }, index) => {
              const calculated = calculation.lines[index];
              if (!calculated) {
                throw new AppError(
                  500,
                  'CALCULATION_FAILED',
                  'No fue posible calcular la cotización.',
                );
              }
              return {
                productId: product.id,
                lineNumber: index + 1,
                productReference: product.reference,
                productName: product.name,
                description: product.description,
                unit: product.unit,
                quantity: item.quantity,
                unitPrice: product.unitPrice,
                ...calculated,
              };
            }),
          },
          statusHistory: {
            create: {
              changedById: user.id,
              previousStatus: null,
              newStatus: 'BORRADOR',
              observation: 'Cotización creada.',
            },
          },
        },
        include: {
          items: { orderBy: { lineNumber: 'asc' } },
          statusHistory: true,
        },
      });
    });
  },

  async update(id: string, input: QuotationCreateInput, user: AuthenticatedUser) {
    const [existing, client, products, settings] = await Promise.all([
      prisma.quotation.findUnique({ where: { id } }),
      prisma.client.findUnique({ where: { id: input.clientId } }),
      prisma.product.findMany({ where: { id: { in: input.items.map((item) => item.productId) } } }),
      prisma.companySettings.findUnique({ where: { id: 1 } }),
    ]);
    if (!existing || (user.role !== 'ADMINISTRADOR' && existing.createdById !== user.id)) {
      throw new AppError(404, 'QUOTATION_NOT_FOUND', 'No se encontró la cotización.');
    }
    if (existing.status !== 'BORRADOR') {
      throw new AppError(
        409,
        'QUOTATION_NOT_EDITABLE',
        'Solo se pueden editar cotizaciones en borrador.',
      );
    }
    if (!client?.active) {
      throw new AppError(422, 'INVALID_CLIENT', 'El cliente no existe o está inactivo.');
    }
    if (!settings) {
      throw new AppError(503, 'SETTINGS_UNAVAILABLE', 'La configuración de empresa no está lista.');
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const selectedProducts = input.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product?.active) {
        throw new AppError(
          422,
          'INVALID_PRODUCT',
          'Uno de los productos no existe o está inactivo.',
        );
      }
      if (
        !settings.discountsEnabled &&
        item.discountAmount &&
        new Prisma.Decimal(item.discountAmount).isPositive()
      ) {
        throw new AppError(422, 'DISCOUNTS_DISABLED', 'Los descuentos no están habilitados.');
      }
      return { input: item, product };
    });
    const calculation = calculateQuotation(
      selectedProducts.map(({ input: item, product }) => ({
        quantity: item.quantity,
        unitPrice: product.unitPrice.toString(),
        discountAmount: item.discountAmount ?? '0',
      })),
      settings.taxRate.toString(),
    );
    const today = addDays(new Date(), 0);
    const expirationDate = input.expirationDate
      ? new Date(`${input.expirationDate}T00:00:00.000Z`)
      : existing.expirationDate;
    if (expirationDate < today) {
      throw new AppError(
        422,
        'INVALID_EXPIRATION_DATE',
        'La fecha de vencimiento no puede estar en el pasado.',
      );
    }

    return prisma.$transaction(async (transaction) => {
      const current = await transaction.quotation.findUnique({ where: { id } });
      if (!current || current.status !== 'BORRADOR') {
        throw new AppError(409, 'QUOTATION_NOT_EDITABLE', 'La cotización dejó de ser editable.');
      }
      await transaction.quotationItem.deleteMany({ where: { quotationId: id } });
      const updated = await transaction.quotation.updateMany({
        where: { id, status: 'BORRADOR' },
        data: {
          clientId: client.id,
          expirationDate,
          clientIdentificationType: client.identificationType,
          clientIdentificationSnapshot: client.identificationNumber,
          clientNameSnapshot: client.legalName,
          clientContactSnapshot: client.contactName,
          clientEmailSnapshot: client.email,
          clientPhoneSnapshot: client.phone,
          clientAddressSnapshot: client.address,
          clientCitySnapshot: client.city,
          clientDepartmentSnapshot: client.department,
          currency: settings.currency,
          taxRate: settings.taxRate,
          subtotal: calculation.subtotal,
          discountTotal: calculation.discountTotal,
          taxTotal: calculation.taxTotal,
          total: calculation.total,
          observations: input.observations ?? null,
          commercialTerms: input.commercialTerms ?? settings.defaultTerms,
        },
      });
      if (updated.count !== 1) {
        throw new AppError(409, 'QUOTATION_NOT_EDITABLE', 'La cotización dejó de ser editable.');
      }
      await transaction.quotationItem.createMany({
        data: selectedProducts.map(({ input: item, product }, index) => {
          const calculated = calculation.lines[index];
          if (!calculated) {
            throw new AppError(500, 'CALCULATION_FAILED', 'No fue posible calcular la cotización.');
          }
          return {
            quotationId: id,
            productId: product.id,
            lineNumber: index + 1,
            productReference: product.reference,
            productName: product.name,
            description: product.description,
            unit: product.unit,
            quantity: item.quantity,
            unitPrice: product.unitPrice,
            ...calculated,
          };
        }),
      });
      return transaction.quotation.findUniqueOrThrow({
        where: { id },
        include: { items: { orderBy: { lineNumber: 'asc' } } },
      });
    });
  },

  async duplicate(id: string, user: AuthenticatedUser, input: QuotationDuplicateInput) {
    const source = await quotationsService.get(id, user);
    const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
    const client = await prisma.client.findUnique({ where: { id: source.clientId } });
    if (!settings) {
      throw new AppError(503, 'SETTINGS_UNAVAILABLE', 'La configuración de empresa no está lista.');
    }
    if (!client?.active) {
      throw new AppError(422, 'INVALID_CLIENT', 'El cliente no existe o está inactivo.');
    }

    const issueDate = new Date();
    const issueDateOnly = addDays(issueDate, 0);
    const defaultExpiration =
      settings.defaultValidityDays !== null
        ? addDays(issueDateOnly, settings.defaultValidityDays)
        : source.expirationDate >= issueDateOnly
          ? source.expirationDate
          : null;
    const expirationDate = input.expirationDate
      ? new Date(`${input.expirationDate}T00:00:00.000Z`)
      : defaultExpiration;
    if (!expirationDate) {
      throw new AppError(
        422,
        'EXPIRATION_DATE_REQUIRED',
        'Indique una fecha de vencimiento para la nueva cotización.',
      );
    }
    if (expirationDate < issueDateOnly) {
      throw new AppError(
        422,
        'INVALID_EXPIRATION_DATE',
        'La fecha de vencimiento no puede estar en el pasado.',
      );
    }

    return prisma.$transaction(async (transaction) => {
      const rootId = source.revisionOfId ?? source.id;
      const lockedRoot = await transaction.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "quotations" WHERE "id" = ${rootId}::uuid FOR UPDATE
      `;
      if (!lockedRoot[0]) {
        throw new AppError(404, 'QUOTATION_NOT_FOUND', 'No se encontró la cotización original.');
      }
      const [counter] = await transaction.$queryRaw<{ last_number: number }[]>`
        INSERT INTO "quotation_counters" ("year", "last_number", "updated_at")
        VALUES (${issueDate.getUTCFullYear()}, 1, now())
        ON CONFLICT ("year")
        DO UPDATE SET
          "last_number" = "quotation_counters"."last_number" + 1,
          "updated_at" = now()
        RETURNING "last_number"
      `;
      const revisions = await transaction.quotation.aggregate({
        where: { revisionOfId: rootId },
        _max: { revisionNumber: true },
      });
      if (!counter) {
        throw new AppError(500, 'NUMBER_GENERATION_FAILED', 'No fue posible asignar un número.');
      }
      const revisionNumber = (revisions._max.revisionNumber ?? 1) + 1;
      const number = `${settings.quotationPrefix}-${issueDate.getUTCFullYear()}-${String(counter.last_number).padStart(6, '0')}`;
      return transaction.quotation.create({
        data: {
          number,
          clientId: source.clientId,
          createdById: user.id,
          revisionOfId: rootId,
          revisionNumber,
          status: 'BORRADOR',
          issueDate: issueDateOnly,
          expirationDate,
          clientIdentificationType: source.clientIdentificationType,
          clientIdentificationSnapshot: source.clientIdentificationSnapshot,
          clientNameSnapshot: source.clientNameSnapshot,
          clientContactSnapshot: source.clientContactSnapshot,
          clientEmailSnapshot: source.clientEmailSnapshot,
          clientPhoneSnapshot: source.clientPhoneSnapshot,
          clientAddressSnapshot: source.clientAddressSnapshot,
          clientCitySnapshot: source.clientCitySnapshot,
          clientDepartmentSnapshot: source.clientDepartmentSnapshot,
          currency: source.currency,
          taxRate: source.taxRate,
          subtotal: source.subtotal,
          discountTotal: source.discountTotal,
          taxTotal: source.taxTotal,
          total: source.total,
          observations: input.observations ?? source.observations,
          commercialTerms: source.commercialTerms,
          items: {
            create: source.items.map((item) => ({
              productId: item.productId,
              lineNumber: item.lineNumber,
              productReference: item.productReference,
              productName: item.productName,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              discountAmount: item.discountAmount,
              taxableBase: item.taxableBase,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
          statusHistory: {
            create: {
              changedById: user.id,
              previousStatus: null,
              newStatus: 'BORRADOR',
              observation: `Nueva revisión de ${source.number}.`,
            },
          },
        },
        include: { items: { orderBy: { lineNumber: 'asc' } }, statusHistory: true },
      });
    });
  },

  async history(id: string, user: AuthenticatedUser) {
    const quotation = await quotationsService.get(id, user);
    return quotation.statusHistory;
  },

  async changeStatus(
    id: string,
    status: QuotationStatus,
    user: AuthenticatedUser,
    observation?: string,
  ) {
    return prisma.$transaction(async (transaction) => {
      const quotation = await transaction.quotation.findUnique({ where: { id } });
      if (!quotation || (user.role !== 'ADMINISTRADOR' && quotation.createdById !== user.id)) {
        throw new AppError(404, 'QUOTATION_NOT_FOUND', 'No se encontró la cotización.');
      }

      const allowed: Record<QuotationStatus, QuotationStatus[]> = {
        BORRADOR: ['PENDIENTE'],
        PENDIENTE: ['ENVIADA', 'VENCIDA'],
        ENVIADA: ['APROBADA', 'RECHAZADA', 'VENCIDA'],
        APROBADA: [],
        RECHAZADA: [],
        VENCIDA: [],
      };
      if (!allowed[quotation.status].includes(status)) {
        throw new AppError(
          409,
          'INVALID_STATUS_TRANSITION',
          'La transición de estado no está permitida.',
        );
      }
      if (['APROBADA', 'RECHAZADA', 'VENCIDA'].includes(status) && user.role !== 'ADMINISTRADOR') {
        throw new AppError(403, 'FORBIDDEN', 'Solo un administrador puede cerrar la cotización.');
      }
      if (
        status === 'VENCIDA' &&
        quotation.expirationDate >=
          new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
      ) {
        throw new AppError(409, 'NOT_EXPIRED', 'La cotización todavía está vigente.');
      }

      const updated = await transaction.quotation.updateMany({
        where: { id, status: quotation.status },
        data: { status },
      });
      if (updated.count !== 1) {
        throw new AppError(
          409,
          'CONCURRENT_STATUS_CHANGE',
          'La cotización cambió en otra solicitud.',
        );
      }

      await transaction.quotationStatusHistory.create({
        data: {
          quotationId: id,
          changedById: user.id,
          previousStatus: quotation.status,
          newStatus: status,
          ...(observation !== undefined ? { observation } : {}),
        },
      });
      return transaction.quotation.findUniqueOrThrow({ where: { id } });
    });
  },
};
