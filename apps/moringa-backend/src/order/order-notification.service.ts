import { Injectable } from '@nestjs/common';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class OrderNotificationService {
  constructor(private readonly notificationService: NotificationService) {}

  async sendOrderConfirmation(userId: number, orderId: number) {
    await this.notificationService.create({
      userId,
      type: 'ORDER_PLACED',
      channel: 'EMAIL',
      recipient: '',
      subject: 'Order Confirmed',
      body: `Your order ${orderId} has been confirmed.`,
    });
  }
}
