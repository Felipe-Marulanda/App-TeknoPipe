import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const settingsRepository = {
  get() {
    return prisma.companySettings.findUnique({ where: { id: 1 } });
  },

  update(data: Prisma.CompanySettingsUpdateInput) {
    return prisma.companySettings.update({ where: { id: 1 }, data });
  },
};
