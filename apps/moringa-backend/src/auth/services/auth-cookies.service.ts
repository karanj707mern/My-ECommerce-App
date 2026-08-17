import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class AuthCookiesService {
  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }

  clearCsrfCookie(res: Response) {
    res.clearCookie('csrf-token');
  }
}
