import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly store = requestContextStore;

  run<T>(context: RequestContext, callback: () => T): T {
    return this.store.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.store.getStore();
  }

  getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  getUserId(): number | undefined {
    return this.getContext()?.userId;
  }

  getIp(): string | undefined {
    return this.getContext()?.ip;
  }

  getHeaders(): { userAgent?: string } | undefined {
    const ctx = this.getContext();
    if (!ctx?.userAgent) return undefined;
    return { userAgent: ctx.userAgent };
  }
}
