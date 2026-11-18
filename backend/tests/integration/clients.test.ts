import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const email = `employee-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('base64url');
const identificationNumber = randomUUID().replaceAll('-', '').slice(0, 20);
let userId: string | undefined;
let clientId: string | undefined;

beforeAll(async () => {
  const role = await prisma.role.upsert({
    where: { name: 'EMPLEADO' },
    update: {},
    create: { name: 'EMPLEADO', description: 'Acceso operativo autorizado' },
  });
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Empleado de integración',
      passwordHash: await bcrypt.hash(password, 8),
      roleId: role.id,
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (clientId) {
    await prisma.client.delete({ where: { id: clientId } });
  }
  if (userId) {
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

it('normalizes client identity, rejects duplicates, and restricts employee edits', async () => {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(login.status).toBe(200);
  const accessToken = login.body.data.accessToken as string;

  const input = {
    identificationType: ' cc ',
    identificationNumber: ` ${identificationNumber} `,
    legalName: 'Cliente de integración',
  };
  const created = await request(app)
    .post('/api/v1/clients')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(input);

  if (created.status === 201) {
    clientId = created.body.data.id as string;
  }
  expect(created.status).toBe(201);
  expect(created.body.data.identificationType).toBe('CC');
  expect(created.body.data.identificationNumber).toBe(identificationNumber.toUpperCase());

  const duplicate = await request(app)
    .post('/api/v1/clients')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...input, legalName: 'Otro nombre' });
  expect(duplicate.status, JSON.stringify(duplicate.body)).toBe(409);

  const forbiddenStatusChange = await request(app)
    .patch(`/api/v1/clients/${clientId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ active: false });
  expect(forbiddenStatusChange.status).toBe(403);
});
