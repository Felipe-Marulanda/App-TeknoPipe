import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const email = `quotation-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('base64url');
let userId: string | undefined;
let clientId: string | undefined;
let productId: string | undefined;
let secondProductId: string | undefined;
let quotationId: string | undefined;
let duplicateId: string | undefined;
let previousTaxRate: string | undefined;

beforeAll(async () => {
  const settings = await prisma.companySettings.findUniqueOrThrow({ where: { id: 1 } });
  previousTaxRate = settings.taxRate.toString();
  if (previousTaxRate !== '19') {
    await prisma.companySettings.update({ where: { id: 1 }, data: { taxRate: '19' } });
  }

  const role = await prisma.role.upsert({
    where: { name: 'EMPLEADO' },
    update: {},
    create: { name: 'EMPLEADO', description: 'Acceso operativo autorizado' },
  });
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Empleado de cotizaciones',
      passwordHash: await bcrypt.hash(password, 8),
      roleId: role.id,
    },
  });
  userId = user.id;

  const client = await prisma.client.create({
    data: {
      identificationType: 'NIT',
      identificationNumber: randomUUID().replaceAll('-', '').slice(0, 20),
      legalName: 'Cliente de cotización',
    },
  });
  clientId = client.id;

  const product = await prisma.product.create({
    data: {
      reference: `TEST-${randomUUID()}`,
      name: 'Producto de cotización',
      unit: 'unidad',
      unitPrice: '1000.00',
    },
  });
  productId = product.id;

  const secondProduct = await prisma.product.create({
    data: {
      reference: `TEST-${randomUUID()}`,
      name: 'Segundo producto de cotización',
      unit: 'unidad',
      unitPrice: '2250.25',
    },
  });
  secondProductId = secondProduct.id;
});

afterAll(async () => {
  if (duplicateId) {
    await prisma.quotationStatusHistory.deleteMany({ where: { quotationId: duplicateId } });
    await prisma.quotationItem.deleteMany({ where: { quotationId: duplicateId } });
    await prisma.quotation.delete({ where: { id: duplicateId } });
  }
  if (quotationId) {
    await prisma.quotationStatusHistory.deleteMany({ where: { quotationId } });
    await prisma.quotationItem.deleteMany({ where: { quotationId } });
    await prisma.quotation.delete({ where: { id: quotationId } });
  }
  if (productId) {
    await prisma.product.delete({ where: { id: productId } });
  }
  if (secondProductId) {
    await prisma.product.delete({ where: { id: secondProductId } });
  }
  if (clientId) {
    await prisma.client.delete({ where: { id: clientId } });
  }
  if (userId) {
    await prisma.user.delete({ where: { id: userId } });
  }
  if (previousTaxRate && previousTaxRate !== '19') {
    await prisma.companySettings.update({
      where: { id: 1 },
      data: { taxRate: previousTaxRate },
    });
  }
  await prisma.$disconnect();
});

it('creates a quote from server prices, preserves snapshots, and checks state transitions', async () => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(login.status).toBe(200);
  const accessToken = login.body.data.accessToken as string;
  const expirationDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const created = await request(app)
    .post('/api/v1/quotations')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      clientId,
      expirationDate,
      items: [
        { productId, quantity: '2' },
        { productId: secondProductId, quantity: '3' },
      ],
    });

  if (created.status === 201) {
    quotationId = created.body.data.id as string;
  }
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  expect(created.body.data.subtotal).toBe('8750.75');
  expect(created.body.data.taxTotal).toBe('1662.64');
  expect(created.body.data.total).toBe('10413.39');
  expect(created.body.data.items).toHaveLength(2);
  expect(created.body.data.items[0].productName).toBe('Producto de cotización');
  expect(created.body.data.items[1].productName).toBe('Segundo producto de cotización');
  expect(created.body.data.statusHistory).toHaveLength(1);

  const edited = await request(app)
    .put(`/api/v1/quotations/${quotationId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      clientId,
      expirationDate,
      items: [
        { productId, quantity: '2' },
        { productId: secondProductId, quantity: '3' },
      ],
      observations: 'Ajuste de borrador',
    });
  expect(edited.status).toBe(200);
  expect(edited.body.data.observations).toBe('Ajuste de borrador');
  expect(edited.body.data.total).toBe(created.body.data.total);

  const historyList = await request(app)
    .get(`/api/v1/history?search=${encodeURIComponent(created.body.data.number)}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(historyList.status).toBe(200);
  expect(historyList.body.meta.total).toBe(1);

  const dashboard = await request(app)
    .get('/api/v1/dashboard/summary')
    .set('Authorization', `Bearer ${accessToken}`);
  expect(dashboard.status).toBe(200);
  expect(
    dashboard.body.data.recentQuotations.some((item: { id: string }) => item.id === quotationId),
  ).toBe(true);
  expect(dashboard.body.data.quotationsByMonth).toHaveLength(12);

  const clientHistory = await request(app)
    .get(`/api/v1/clients/${clientId}/quotations`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(clientHistory.status).toBe(200);
  expect(clientHistory.body.data.meta.total).toBe(1);

  await prisma.product.update({
    where: { id: productId },
    data: { name: 'Nombre actualizado', unitPrice: '9000.00' },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { legalName: 'Cliente actualizado' },
  });

  const fetched = await request(app)
    .get(`/api/v1/quotations/${quotationId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(fetched.status).toBe(200);
  expect(fetched.body.data.clientNameSnapshot).toBe('Cliente de cotización');
  expect(fetched.body.data.items[0].productName).toBe('Producto de cotización');
  expect(fetched.body.data.items[0].unitPrice).toBe('1000');

  const settings = await prisma.companySettings.findUniqueOrThrow({ where: { id: 1 } });
  const logoData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/G5sAAAAASUVORK5CYII=';
  await prisma.companySettings.update({ where: { id: 1 }, data: { logoData } });
  let pdf: request.Response;
  try {
    pdf = await request(app)
      .get(`/api/v1/quotations/${quotationId}/pdf`)
      .set('Authorization', `Bearer ${accessToken}`);
  } finally {
    await prisma.companySettings.update({
      where: { id: 1 },
      data: { logoData: settings.logoData },
    });
  }
  expect(pdf.status).toBe(200);
  expect(pdf.headers['content-type']).toContain('application/pdf');
  expect(Buffer.isBuffer(pdf.body)).toBe(true);
  expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');

  const pending = await request(app)
    .patch(`/api/v1/quotations/${quotationId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ status: 'PENDIENTE' });
  expect(pending.status).toBe(200);

  const history = await request(app)
    .get(`/api/v1/quotations/${quotationId}/history`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(history.status).toBe(200);
  expect(history.body.data).toHaveLength(2);
  expect(history.body.data[1].newStatus).toBe('PENDIENTE');

  const sent = await request(app)
    .patch(`/api/v1/quotations/${quotationId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ status: 'ENVIADA' });
  expect(sent.status).toBe(200);

  const skippedState = await request(app)
    .patch(`/api/v1/quotations/${quotationId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ status: 'APROBADA' });
  expect(skippedState.status).toBe(403);

  const duplicate = await request(app)
    .post(`/api/v1/quotations/${quotationId}/duplicate`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({});
  if (duplicate.status === 201) {
    duplicateId = duplicate.body.data.id as string;
  }
  expect(duplicate.status, JSON.stringify(duplicate.body)).toBe(201);
  expect(duplicate.body.data.status).toBe('BORRADOR');
  expect(duplicate.body.data.revisionOfId).toBe(quotationId);
  expect(duplicate.body.data.items[0].unitPrice).toBe('1000');
});
