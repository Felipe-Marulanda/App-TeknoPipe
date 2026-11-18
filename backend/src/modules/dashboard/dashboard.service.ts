import { QuotationStatus } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../types/authenticated-user.js';
import { dashboardRepository } from './dashboard.repository.js';

const statuses: QuotationStatus[] = [
  'BORRADOR',
  'PENDIENTE',
  'ENVIADA',
  'APROBADA',
  'RECHAZADA',
  'VENCIDA',
];

function scopedUserId(user: AuthenticatedUser): string | null {
  return user.role === 'ADMINISTRADOR' ? null : user.id;
}

function monthStart(date: Date, monthOffset: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

export const dashboardService = {
  async summary(user: AuthenticatedUser) {
    const userId = scopedUserId(user);
    const where = dashboardRepository.summaryWhere(userId);
    const [totals, recentQuotations, recentActivity, months] = await Promise.all([
      dashboardRepository.totals(where),
      dashboardRepository.recentQuotations(where),
      dashboardRepository.recentActivity(userId),
      dashboardRepository.quotationsByMonth(userId, monthStart(new Date(), -11)),
    ]);
    const [quotationCount, valueAggregate, statusGroups] = totals;
    const countByStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<
      QuotationStatus,
      number
    >;
    for (const group of statusGroups) countByStatus[group.status] = group._count._all;
    const monthlyData = new Map(
      months.map((month) => [
        month.month.toISOString().slice(0, 7),
        { count: month.quotation_count, total: month.total },
      ]),
    );
    const start = monthStart(new Date(), -11);
    const quotationsByMonth = Array.from({ length: 12 }, (_, index) => {
      const month = monthStart(start, index);
      const key = month.toISOString().slice(0, 7);
      const value = monthlyData.get(key);
      return { month: key, quotationCount: value?.count ?? 0, total: value?.total ?? '0.00' };
    });

    return {
      totals: {
        quotations: quotationCount,
        valueQuoted: valueAggregate._sum.total?.toString() ?? '0.00',
        byStatus: countByStatus,
      },
      recentQuotations,
      recentActivity,
      quotationsByMonth,
    };
  },

  async quotationsByMonth(user: AuthenticatedUser) {
    const months = await dashboardRepository.quotationsByMonth(
      scopedUserId(user),
      monthStart(new Date(), -11),
    );
    const values = new Map(months.map((month) => [month.month.toISOString().slice(0, 7), month]));
    const start = monthStart(new Date(), -11);
    return Array.from({ length: 12 }, (_, index) => {
      const month = monthStart(start, index);
      const key = month.toISOString().slice(0, 7);
      const value = values.get(key);
      return {
        month: key,
        quotationCount: value?.quotation_count ?? 0,
        total: value?.total ?? '0.00',
      };
    });
  },

  async quotationsByStatus(user: AuthenticatedUser) {
    const [, , groups] = await dashboardRepository.totals({
      ...dashboardRepository.summaryWhere(scopedUserId(user)),
    });
    const result = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<
      QuotationStatus,
      number
    >;
    for (const group of groups) result[group.status] = group._count._all;
    return result;
  },
};
