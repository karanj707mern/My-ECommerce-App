import { Controller, Post, Headers, Req, Get, HttpCode } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { OrderService } from '../order/order.service';

/**
 * Razorpay webhook endpoint. All verification (secret presence, HMAC
 * comparison) and business handling live in OrderService.handleRazorpayWebhook;
 * this controller only adapts the transport layer.
 */
@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: FastifyRequest & { rawBody?: Buffer },
  ) {
    // Prefer the untouched payload bytes when available so the HMAC matches
    // Razorpay's signature exactly; fall back to the parsed body otherwise.
    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});

    const result = await this.orderService.handleRazorpayWebhook(rawBody, signature);

    return result ?? { status: 'ok' };
  }

  @Get('razorpay')
  async handleRazorpayWebhookGet() {
    return { status: 'ok' };
  }
}
