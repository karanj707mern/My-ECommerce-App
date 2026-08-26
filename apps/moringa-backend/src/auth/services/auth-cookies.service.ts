import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CookieState } from '../../common/http/cookie-state';
import '@/common/http/cookie-types';

@Injectable()
export class AuthCookiesService {
  /**
   * Legacy direct-write variant — kept for any edge caller that already holds
   * the raw reply (e.g. SSE or streaming endpoints that cannot use the
   * interceptor path). New code should prefer {@link queueAuthCookies}.
   */
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

  /**
   * Nestia-compatible variant: queues cookies onto the request-scoped
   * {@link CookieState} instead of writing directly to the response. The
   * global {@link CookieInterceptor} applies them after the handler returns.
   */
  queueAuthCookies(req: FastifyRequest, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieState = (req.cookieState ??= new CookieState());

    cookieState.setCookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });

    cookieState.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: FastifyReply) {
    res.clearCookie('accessToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    res.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  queueClearAuthCookies(req: FastifyRequest) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieState = req.cookieState;
    if (!cookieState) {
      return;
    }
    cookieState.clearCookie('accessToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
    });
    cookieState.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
    });
  }

  clearCsrfCookie(res: FastifyReply) {
    res.clearCookie('csrf-token');
  }
}
