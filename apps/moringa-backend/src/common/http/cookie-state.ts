import { Injectable, Scope } from '@nestjs/common';
import type { CookieSetOptions } from 'fastify';

export interface PendingCookie {
  name: string;
  value: string;
  options?: CookieSetOptions;
}

export interface PendingCookieClear {
  name: string;
  options?: CookieSetOptions;
}

/**
 * Request-scoped cookie queue.
 *
 * Controllers populate this instead of using `@Res()` passthrough. A global
 * interceptor drains the queue and applies the cookies to the real response
 * after the handler returns its typed value. This keeps controllers free of
 * `@Res()` so Nestia can analyze and generate typed SDK clients from them.
 */
@Injectable({ scope: Scope.REQUEST })
export class CookieState {
  private readonly toSet: PendingCookie[] = [];
  private readonly toClear: PendingCookieClear[] = [];

  setCookie(name: string, value: string, options?: CookieSetOptions): void {
    this.toSet.push({ name, value, options });
  }

  clearCookie(name: string, options?: CookieSetOptions): void {
    this.toClear.push({ name, options });
  }

  consume(): { toSet: PendingCookie[]; toClear: PendingCookieClear[] } {
    const result = { toSet: this.toSet.slice(), toClear: this.toClear.slice() };
    this.toSet.length = 0;
    this.toClear.length = 0;
    return result;
  }
}
