import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';

const adminEmail = `catalog-admin-${randomUUID()}@example.test`;
const employeeEmail = `catalog-employee-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('base64url');
let createdPassword: string;
let adminId: string | undefined;
let employeeId: string | undefined;
let createdUserId: string | undefined;
let categoryId: string | undefined;
let productId: string | undefined;

beforeAll(async () => {
  const [adminRole, employeeRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMINISTRADOR' },
      update: {},
      create: { name: 'ADMINISTRADOR', description: 'Acceso general al sistema' },
    }),
    prisma.role.upsert({
      where: { name: 'EMPLEADO' },
      update: {},
      create: { name: 'EMPLEADO', description: 'Acceso operativo autorizado' },
    }),
  ]);
  const [admin, employee] = await Promise.all([
    prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Administrador de catálogo',
        passwordHash: await bcrypt.hash(password, 8),
        roleId: adminRole.id,
      },
    }),
    prisma.user.create({
      data: {
        email: employeeEmail,
        fullName: 'Empleado de catálogo',
        passwordHash: await bcrypt.hash(password, 8),
        roleId: employeeRole.id,
      },
    }),
  ]);
  adminId = admin.id;
  employeeId = employee.id;
});

afterAll(async () => {
  if (productId) {
    await prisma.product.delete({ where: { id: productId } });
  }
  if (categoryId) {
    await prisma.category.delete({ where: { id: categoryId } });
  }
  if (createdUserId) {
    await prisma.user.delete({ where: { id: createdUserId } });
  }
  if (employeeId) {
    await prisma.user.delete({ where: { id: employeeId } });
  }
  if (adminId) {
    await prisma.user.delete({ where: { id: adminId } });
  }
  await prisma.$disconnect();
});

function refreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie']?.find((cookie) =>
    cookie.startsWith('teknopipe_refresh='),
  );
  const cookie = header?.split(';')[0];
  if (!cookie) throw new Error('La respuesta no incluyó la cookie de renovación.');
  return cookie;
}

it('manages users and catalog with backend role enforcement and input validation', async () => {
  const [adminLogin, employeeLogin] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: adminEmail, password }),
    request(app).post('/api/v1/auth/login').send({ email: employeeEmail, password }),
  ]);
  expect(adminLogin.status).toBe(200);
  expect(employeeLogin.status).toBe(200);
  const adminToken = adminLogin.body.data.accessToken as string;
  const employeeToken = employeeLogin.body.data.accessToken as string;
  createdPassword = randomBytes(24).toString('base64url');

  const employeeDenied = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${employeeToken}`);
  expect(employeeDenied.status).toBe(403);

  const user = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: `created-${randomUUID()}@example.test`,
      fullName: 'Usuario creado',
      password: createdPassword,
      role: 'EMPLEADO',
    });
  expect(user.status).toBe(201);
  createdUserId = user.body.data.id as string;
  expect(user.body.data.passwordHash).toBeUndefined();

  const oversizedPassword = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: `oversized-${randomUUID()}@example.test`,
      fullName: 'Contraseña inválida',
      password: 'é'.repeat(37),
      role: 'EMPLEADO',
    });
  expect(oversizedPassword.status).toBe(400);

  const foundUser = await request(app)
    .get(`/api/v1/users/${createdUserId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(foundUser.status).toBe(200);
  expect(foundUser.body.data.passwordHash).toBeUndefined();

  const createdUserLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.body.data.email, password: createdPassword });
  expect(createdUserLogin.status).toBe(200);

  const passwordUpdated = await request(app)
    .put(`/api/v1/users/${createdUserId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ password: randomBytes(24).toString('base64url') });
  expect(passwordUpdated.status).toBe(200);

  const oldSessionRefresh = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', env.CORS_ORIGIN)
    .set('Cookie', refreshCookie(createdUserLogin));
  expect(oldSessionRefresh.status).toBe(401);

  const selfDeactivation = await request(app)
    .patch(`/api/v1/users/${adminId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ active: false });
  expect(selfDeactivation.status).toBe(409);

  const category = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Categoría ${randomUUID()}` });
  expect(category.status).toBe(201);
  categoryId = category.body.data.id as string;

  const product = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      reference: `ref-${randomUUID()}`,
      name: 'Tubería de prueba',
      unit: 'metro',
      unitPrice: '1250.50',
      categoryId,
    });
  expect(product.status).toBe(201);
  productId = product.body.data.id as string;
  expect(product.body.data.reference).toBe(product.body.data.reference.toUpperCase());
  expect(product.body.data.unitPrice).toBe('1250.5');

  const productUpdated = await request(app)
    .put(`/api/v1/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Tubería actualizada', unitPrice: '1300.00' });
  expect(productUpdated.status).toBe(200);
  expect(productUpdated.body.data.unitPrice).toBe('1300');

  const categoryUpdated = await request(app)
    .put(`/api/v1/categories/${categoryId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ description: 'Categoría de integración' });
  expect(categoryUpdated.status).toBe(200);

  const found = await request(app)
    .get(`/api/v1/products?search=${encodeURIComponent(product.body.data.reference)}`)
    .set('Authorization', `Bearer ${employeeToken}`);
  expect(found.status).toBe(200);
  expect(found.body.meta.total).toBe(1);

  const invalidPrice = await request(app)
    .put(`/api/v1/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ unitPrice: '-1' });
  expect(invalidPrice.status).toBe(400);

  const employeeWrite = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${employeeToken}`)
    .send({ name: 'No autorizada' });
  expect(employeeWrite.status).toBe(403);

  const inactiveCategory = await request(app)
    .patch(`/api/v1/categories/${categoryId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ active: false });
  expect(inactiveCategory.status).toBe(200);

  const productWithInactiveCategory = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      reference: `inactive-${randomUUID()}`,
      name: 'Producto inválido',
      unit: 'unidad',
      unitPrice: '10',
      categoryId,
    });
  expect(productWithInactiveCategory.status).toBe(422);

  const settings = await request(app)
    .get('/api/v1/settings')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(settings.status).toBe(200);
  expect(settings.body.data.id).toBe(1);

  const unchangedSettings = await request(app)
    .put('/api/v1/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ commercialName: settings.body.data.commercialName });
  expect(unchangedSettings.status).toBe(200);

  const invalidTaxRate = await request(app)
    .put('/api/v1/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ taxRate: '100.01' });
  expect(invalidTaxRate.status).toBe(400);

  const invalidLogo = await request(app)
    .put('/api/v1/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ logoData: 'data:image/png;base64,AAAA' });
  expect(invalidLogo.status).toBe(422);

  const report = await request(app)
    .get('/api/v1/reports/quotations?format=csv')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(report.status).toBe(200);
  expect(report.headers['content-type']).toContain('text/csv');
  expect(report.text).toContain('"number","status"');

  const invalidDateRange = await request(app)
    .get('/api/v1/reports/quotations?from=2026-12-31&to=2026-01-01')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(invalidDateRange.status).toBe(400);

  const employeeReport = await request(app)
    .get('/api/v1/reports/quotations')
    .set('Authorization', `Bearer ${employeeToken}`);
  expect(employeeReport.status).toBe(403);
});
