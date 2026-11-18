import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/prisma.js';

function creatorFilter(userId: string | null) {
  return userId === null ? Prisma.empty : Prisma.sql`AND created_by_id = ${userId}::uuid`;
}

export const dashboardRepository = {
  summaryWhere(userId: string | null) {
    return userId === null ? {} : { createdById: userId };
  },

  totals(where: Prisma.QuotationWhereInput) {
    return Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.aggregate({ where, _sum: { total: true } }),
      prisma.quotation.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);
  },

  recentQuotations(where: Prisma.QuotationWhereInput) {
    return prisma.quotation.findMany({
      where,
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        number: true,
        status: true,
        issueDate: true,
        total: true,
        currency: true,
        clientNameSnapshot: true,
      },
    });
  },

  recentActivity(userId: string | null) {
    return prisma.quotationStatusHistory.findMany({
      where: userId === null ? {} : { quotation: { createdById: userId } },
      take: 8,
      orderBy: { changedAt: 'desc' },
      include: {
        changedBy: { select: { id: true, fullName: true } },
        quotation: {
          select: { id: true, number: true, createdById: true, clientNameSnapshot: true },
        },
      },
    });
  },

  quotationsByMonth(userId: string | null, start: Date) {
    const filter = creatorFilter(userId);
    return prisma.$queryRaw<
      { month: Date; quotation_count: number; total: string }[]
    >`SELECT date_trunc('month', issue_date)::date AS month,
             count(*)::int AS quotation_count,
             COALESCE(sum(total), 0)::text AS total
      FROM quotations
      WHERE issue_date >= ${start}::date
      ${filter}
      GROUP BY date_trunc('month', issue_date)
      ORDER BY month`;
  },
};
