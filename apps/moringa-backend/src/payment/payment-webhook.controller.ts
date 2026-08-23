import { Controller, Post, Headers, Req, Res, Get } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { BullMQService } from '@/infrastructure/bullmq.service';

@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly orderQueueService: BullMQService) {}

  @Post('razorpay')
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(400).send({ error: 'Webhook secret not configured' });
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = require('crypto')
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send({ error: 'Invalid signature' });
    }

    res.status(200).send({ status: 'ok' });

    const event = req.body as Record<string, unknown> | undefined;
    const orderEntity = (event?.payload as Record<string, unknown> | undefined)?.order as
      | Record<string, unknown>
      | undefined;
    const orderId = orderEntity?.id;
    const userId = (orderEntity?.notes as Record<string, unknown> | undefined)?.userId;

    if (orderId && userId) {
      await this.orderQueueService.enqueue({
        orderId: Number(orderId),
        userId: Number(userId),
        action: 'process_payment',
        payload: { event },
        idempotencyKey: `razorpay:${orderId}:${(event?.event as string) || 'unknown'}`,
      });
    }
  }

  @Get('razorpay')
  async handleRazorpayWebhookGet() {
    return { status: 'ok' };
  }
}