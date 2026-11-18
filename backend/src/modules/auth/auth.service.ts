import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { LoginInput } from './auth.validation.js';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function createAccessToken(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
}): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('teknopipe-api')
    .setAudience('teknopipe-web')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessKey);
}

function newRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function publicUser(user: { id: string; email: string; fullName: string; role: { name: string } }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
  };
}

export const authService = {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { role: true },
    });

    if (!user?.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    }

    const refreshToken = newRefreshToken();
    const expiresAt = new Date(Date.now() + refreshLifetimeMs);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken: await createAccessToken({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
      }),
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: publicUser(user),
    };
  },

  async refresh(refreshToken: string) {
    const now = new Date();
    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshToken) },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt <= now || !session.user.active) {
      throw new AppError(401, 'INVALID_SESSION', 'La sesión expiró o fue revocada.');
    }

    const nextRefreshToken = newRefreshToken();
    const nextExpiresAt = new Date(Date.now() + refreshLifetimeMs);

    await prisma.$transaction(async (transaction) => {
      const revoked = await transaction.userSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        throw new AppError(401, 'INVALID_SESSION', 'La sesión ya fue utilizada o revocada.');
      }

      await transaction.userSession.create({
        data: {
          userId: session.userId,
          refreshTokenHash: hashRefreshToken(nextRefreshToken),
          expiresAt: nextExpiresAt,
        },
      });
    });

    return {
      accessToken: await createAccessToken({
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role.name,
      }),
      refreshToken: nextRefreshToken,
      refreshExpiresAt: nextExpiresAt,
      user: publicUser(session.user),
    };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await prisma.userSession.updateMany({
      where: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  },
};
