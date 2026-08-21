import { Controller, Post, Headers, Req, Res, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { OrderQueueService } from '@/infrastructure/bullmq.service';

@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly orderQueueService: OrderQueueService) {}

  @Post('razorpay')
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = require('crypto')
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    res.status(200).json({ status: 'ok' });

    const event = req.body;
    const orderId = event.payload?.order?.entity?.id;
    const userId = event.payload?.order?.entity?.notes?.userId;

    if (orderId && userId) {
      await this.orderQueueService.enqueue({
        orderId: Number(orderId),
        userId: Number(userId),
        action: 'process_payment',
        payload: { event },
        idempotencyKey: `razorpay:${orderId}:${event.event || 'unknown'}`,
      });
    }
  }

  @Get('razorpay')
  async handleRazorpayWebhookGet(@Res() res: Response) {
    return res.status(200).json({ status: 'ok' });
  }
}
