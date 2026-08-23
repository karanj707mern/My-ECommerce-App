import { Injectable } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Injectable()
export class AuthCookiesService {
  setAuthCookies(res: FastifyReply, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: FastifyReply) {
    res.clearCookie('accessToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  }

  clearCsrfCookie(res: FastifyReply) {
    res.clearCookie('csrf-token');
  }
}
