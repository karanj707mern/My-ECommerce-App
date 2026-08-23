import { Controller, Post, Headers, Req, Res, Get } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { OrderService } from '@/order/order.service';

/**
 * Razorpay webhook endpoint. All verification (secret presence, HMAC
 * comparison) and business handling live in OrderService.handleRazorpayWebhook;
 * this controller only adapts the transport layer.
 */
@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Post('razorpay')
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Res() res: FastifyReply,
  ) {
    // Prefer the untouched payload bytes when available so the HMAC matches
    // Razorpay's signature exactly; fall back to the parsed body otherwise.
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});

    const result = await this.orderService.handleRazorpayWebhook(rawBody, signature);

    return res.status(200).send(result ?? { status: 'ok' });
  }

  @Get('razorpay')
  async handleRazorpayWebhookGet() {
    return { status: 'ok' };
  }
}
