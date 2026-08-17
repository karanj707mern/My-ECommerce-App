import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_EXEMPT_PATHS = [
  '/auth',
  '/wishlist',
  '/cart',
  '/order/guest',
  '/gift-card',
];

function normalizePath(path: string): string {
  return path.replace(/^\/api\/v1(?=\/|$)/, '') || '/';
}

function isExemptPath(path: string): boolean {
  const normalizedPath = normalizePath(path);

  return CSRF_EXEMPT_PATHS.some(
    (prefix) =>
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`),
  );
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies?.['csrf-token'];

    if (!csrfCookie) {
      const token = crypto.randomUUID().replace(/-/g, '');
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('csrf-token', token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    if (STATE_CHANGING_METHODS.has(req.method) && !isExemptPath(req.path)) {
      const currentCookie = req.cookies?.['csrf-token'];
      if (!currentCookie || csrfHeader !== currentCookie) {
        res.status(403).json({
          message: 'Invalid CSRF token',
        });
        return;
      }
    }

    next();
  }
}
