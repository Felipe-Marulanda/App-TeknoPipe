import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/config/prisma.js';

const email = `auth-${randomUUID()}@example.test`;
const password = randomBytes(24).toString('base64url');
let userId: string | undefined;

function refreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie']?.find((cookie) =>
    cookie.startsWith('teknopipe_refresh='),
  );
  const cookie = header?.split(';')[0];
  if (!cookie) {
    throw new Error('La respuesta no incluyó la cookie de renovación.');
  }
  return cookie;
}

beforeAll(async () => {
  const role = await prisma.role.upsert({
    where: { name: 'ADMINISTRADOR' },
    update: {},
    create: { name: 'ADMINISTRADOR', description: 'Acceso general al sistema' },
  });
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Prueba de autenticación',
      passwordHash: await bcrypt.hash(password, 8),
      roleId: role.id,
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) {
    await prisma.user.delete({
      where: { id: userId },
    });
  }
  await prisma.$disconnect();
});

it('login, consulta, rota y revoca una sesión', async () => {
  const anonymous = await request(app).get('/api/v1/auth/me');
  expect(anonymous.status).toBe(401);

  const forged = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', 'Bearer token.falsificado');
  expect(forged.status).toBe(401);

  const now = Math.floor(Date.now() / 1000);
  const expiredToken = await new SignJWT({ role: 'ADMINISTRADOR' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId!)
    .setIssuer('teknopipe-api')
    .setAudience('teknopipe-web')
    .setIssuedAt(now - 120)
    .setExpirationTime(now - 60)
    .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));
  const expired = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(expired.status).toBe(401);

  const untrustedOrigin = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', 'https://sitio-no-autorizado.example');
  expect(untrustedOrigin.status).toBe(403);

  const login = await request(app).post('/api/v1/auth/login').send({ email, password });

  expect(login.status).toBe(200);
  expect(login.body.data.user.email).toBe(email);
  expect(login.body.data.accessToken).toEqual(expect.any(String));
  expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');

  const firstCookie = refreshCookie(login);
  const profile = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${login.body.data.accessToken}`);
  expect(profile.status).toBe(200);
  expect(profile.body.data.id).toBe(userId);

  const refreshed = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', env.CORS_ORIGIN)
    .set('Cookie', firstCookie);
  expect(refreshed.status).toBe(200);
  expect(refreshCookie(refreshed)).not.toBe(firstCookie);

  const replay = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', env.CORS_ORIGIN)
    .set('Cookie', firstCookie);
  expect(replay.status).toBe(401);

  const rotatedCookie = refreshCookie(refreshed);
  const logout = await request(app)
    .post('/api/v1/auth/logout')
    .set('Origin', env.CORS_ORIGIN)
    .set('Cookie', rotatedCookie);
  expect(logout.status).toBe(200);

  const revoked = await request(app)
    .post('/api/v1/auth/refresh')
    .set('Origin', env.CORS_ORIGIN)
    .set('Cookie', rotatedCookie);
  expect(revoked.status).toBe(401);

  const failedLogins = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    failedLogins.push(
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `missing-${attempt}@example.test`, password }),
    );
  }
  expect(failedLogins.some((response) => response.status === 429)).toBe(true);
});
