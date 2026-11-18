import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';

const createdCategoryIds: string[] = [];
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

afterAll(async () => {
  if (createdCategoryIds.length > 0) {
    await prisma.category.deleteMany({
      where: { id: { in: createdCategoryIds } },
    });
  }
  await Promise.all([prisma.$disconnect(), pool.end()]);
});

it('enforces the company settings singleton at the database layer', async () => {
  await expect(
    pool.query('INSERT INTO "company_settings" ("id", "updated_at") VALUES ($1, now())', [2]),
  ).rejects.toMatchObject({
    code: '23514',
  });
});

it('persists categories and enforces their unique name in PostgreSQL', async () => {
  const category = await prisma.category.create({
    data: {
      name: `integration-${randomUUID()}`,
    },
  });
  createdCategoryIds.push(category.id);

  await expect(
    prisma.category.create({
      data: {
        name: category.name,
      },
    }),
  ).rejects.toMatchObject({
    code: 'P2002',
  });
});
