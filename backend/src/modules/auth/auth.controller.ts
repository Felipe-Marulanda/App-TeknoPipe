import type { RequestHandler, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { authService } from './auth.service.js';
import { loginSchema } from './auth.validation.js';

const refreshCookie = 'teknopipe_refresh';
const refreshCookiePath = '/api/v1/auth';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: refreshCookiePath,
};

function setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(refreshCookie, token, {
    ...cookieOptions,
    secure: env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const session = await authService.login(input);

  setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
  response.status(200).json({
    data: {
      accessToken: session.accessToken,
      user: session.user,
    },
  });
};

export const refresh: RequestHandler = async (request, response) => {
  const token = request.cookies?.[refreshCookie];
  if (!token) {
    throw new AppError(401, 'INVALID_SESSION', 'La sesión expiró o fue revocada.');
  }

  const session = await authService.refresh(token);
  setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
  response.status(200).json({
    data: {
      accessToken: session.accessToken,
      user: session.user,
    },
  });
};

export const logout: RequestHandler = async (request, response) => {
  await authService.logout(request.cookies?.[refreshCookie]);
  response.clearCookie(refreshCookie, cookieOptions);
  response.status(200).json({
    data: {
      message: 'Sesión cerrada.',
    },
  });
};

export const me: RequestHandler = (request, response) => {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  }

  response.status(200).json({ data: request.auth });
};
