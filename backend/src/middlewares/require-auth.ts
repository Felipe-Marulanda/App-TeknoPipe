import { jwtVerify } from 'jose';
import type { RequestHandler } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const authorization = request.get('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }

  let subject: string | undefined;
  try {
    const { payload } = await jwtVerify(token, accessKey, {
      issuer: 'teknopipe-api',
      audience: 'teknopipe-web',
      algorithms: ['HS256'],
    });
    subject = payload.sub;
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.'));
    return;
  }

  if (!subject) {
    next(new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.'));
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: subject },
    select: {
      id: true,
      email: true,
      fullName: true,
      active: true,
      role: { select: { name: true } },
    },
  });

  if (!user?.active) {
    next(new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.'));
    return;
  }

  request.auth = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
  };
  next();
};
