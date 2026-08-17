import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { GuestTokenRequest } from '../interfaces/request.interface';

@Injectable()
export class GuestTokenMiddleware implements NestMiddleware {
  private readonly cookieName = 'guest_token';
  private readonly maxAge = 365 * 24 * 60 * 60 * 1000;

  use(req: Request, res: Response, next: NextFunction): void {
    const guestRequest = req as GuestTokenRequest;

    const headerToken = req.headers['x-guest-token'] as string | undefined;

    const cookieToken = req.cookies?.guest_token;

    guestRequest.guestToken = (headerToken ||
      cookieToken ||
      this.generateToken()) as string;

    if (!cookieToken && !headerToken) {
      this.setCookie(res, guestRequest.guestToken);
    }

    next();
  }

  private generateToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const random = (Math.random() * 16) | 0;
      const value = c === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  private setCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: this.maxAge,
    });
  }
}
