import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { Observable, Subject } from 'rxjs';

export type OrderStreamMessage =
  | {
      type: 'connected';
      order: null;
    }
  | {
      type: 'order.updated';
      order: unknown;
    };

@Injectable()
export class OrderEventsService {
  private static readonly adminCacheKey = 'orders:events:admin:last';

  private readonly userStreams = new Map<number, Subject<OrderStreamMessage>>();
  private readonly adminStream = new Subject<OrderStreamMessage>();
  private readonly orderUpdatesStream = new Subject<{
    userId: number;
    message: OrderStreamMessage;
  }>();

  constructor(private readonly redisCacheService: RedisCacheService) {}

  subscribe(userId: number): Observable<OrderStreamMessage> {
    return new Observable<OrderStreamMessage>((subscriber) => {
      const subject = this.getOrCreateSubject(userId);
      const subscription = subject.subscribe(subscriber);

      subscriber.next({
        type: 'connected',
        order: null,
      });

      return () => {
        subscription.unsubscribe();

        if (!subject.observers.length) {
          this.userStreams.delete(userId);
          subject.complete();
        }
      };
    });
  }

  subscribeAdmin(): Observable<OrderStreamMessage> {
    return new Observable<OrderStreamMessage>((subscriber) => {
      const subscription = this.adminStream.subscribe(subscriber);

      subscriber.next({
        type: 'connected',
        order: null,
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  emitOrderUpdated(userId: number, order: unknown) {
    const message: OrderStreamMessage = {
      type: 'order.updated',
      order,
    };

    this.getOrCreateSubject(userId).next(message);
    this.adminStream.next(message);
    this.orderUpdatesStream.next({ userId, message });
    void this.cacheLastOrderEvent(userId, message).catch(() => undefined);
  }

  subscribeOrderUpdates() {
    return this.orderUpdatesStream.asObservable();
  }

  getLastOrderEvent(userId: number) {
    return this.redisCacheService.getJson<OrderStreamMessage>(
      this.getUserCacheKey(userId),
    );
  }

  getLastAdminOrderEvent() {
    return this.redisCacheService.getJson<OrderStreamMessage>(
      OrderEventsService.adminCacheKey,
    );
  }

  private getOrCreateSubject(userId: number) {
    const existingSubject = this.userStreams.get(userId);

    if (existingSubject) {
      return existingSubject;
    }

    const subject = new Subject<OrderStreamMessage>();
    this.userStreams.set(userId, subject);
    return subject;
  }

  private async cacheLastOrderEvent(
    userId: number,
    message: OrderStreamMessage,
  ) {
    await Promise.all([
      this.redisCacheService.setJson(this.getUserCacheKey(userId), message),
      this.redisCacheService.setJson(OrderEventsService.adminCacheKey, message),
    ]);
  }

  private getUserCacheKey(userId: number) {
    return `orders:events:user:${userId}:last`;
  }
}
