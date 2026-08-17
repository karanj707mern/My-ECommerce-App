import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderEventsService {
  async emitOrderCreated(order: Record<string, unknown>) {
    // Placeholder for order events
  }
}
