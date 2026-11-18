import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
});

const seedEnvironment = z
  .object({
    DATABASE_URL: z.url(),
    SEED_ADMIN_EMAIL: z.email().transform((email) => email.trim().toLowerCase()),
    SEED_ADMIN_PASSWORD: z.string().min(12),
    SEED_ADMIN_NAME: z.string().trim().min(1).max(160).default('Administrador inicial'),
  })
  .parse(process.env);

const adapter = new PrismaPg({
  connectionString: seedEnvironment.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seed(): Promise<void> {
  const [adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMINISTRADOR' },
      update: { description: 'Acceso general al sistema' },
      create: { name: 'ADMINISTRADOR', description: 'Acceso general al sistema' },
    }),
    prisma.role.upsert({
      where: { name: 'EMPLEADO' },
      update: { description: 'Acceso operativo autorizado' },
      create: { name: 'EMPLEADO', description: 'Acceso operativo autorizado' },
    }),
  ]);

  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      commercialName: 'TEKNOPIPE',
      currency: 'COP',
      taxRate: '19.00',
      quotationPrefix: 'COT',
    },
  });

  const passwordHash = await bcrypt.hash(seedEnvironment.SEED_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: seedEnvironment.SEED_ADMIN_EMAIL },
    update: {},
    create: {
      email: seedEnvironment.SEED_ADMIN_EMAIL,
      passwordHash,
      fullName: seedEnvironment.SEED_ADMIN_NAME,
      roleId: adminRole.id,
    },
  });
}

try {
  await seed();
  console.info('Roles, configuración inicial y administrador verificados.');
} catch (error) {
  console.error('No fue posible ejecutar el seed de TEKNOPIPE.', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
