import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Response } from 'express';
import type { CookieOptions } from 'express';

@Injectable()
export class AuthCookiesService {
  private getCookieOptions(maxAge?: number): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      ...(maxAge === undefined ? {} : { maxAge }),
    };
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      ...this.getCookieOptions(60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, {
      ...this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', this.getCookieOptions());
    res.clearCookie('refreshToken', this.getCookieOptions());
  }

  setCsrfCookie(res: Response) {
    const token = crypto.randomUUID().replace(/-/g, '');
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearCsrfCookie(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('csrf-token', {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
  }
}
