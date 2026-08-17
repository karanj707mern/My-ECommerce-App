import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
} from '@prisma/client';
import { NotificationService } from '@/notification/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';

interface OrderNotificationOrder {
  id: number;
  orderNumber?: string | null;
  invoiceNumber?: string | null;
  orderTitle?: string | null;
  total: number;
  subtotal: number;
  shippingAmount: number;
  handlingAmount: number;
  taxAmount: number;
  shippingType?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryAt?: Date | null;
  adminNotes?: string | null;
  recipientName?: string | null;
  phoneNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  items: {
    quantity: number;
    price: number;
    product: {
      name: string;
      image?: string | null;
    };
  }[];
  user?: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface OrderIssueNotification {
  id: number;
  type?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  adminResponse?: string | null;
  resolutionSummary?: string | null;
}

@Injectable()
export class OrderNotificationService {
  private readonly currency: string;
  private readonly API_PUBLIC_URL: string;
  private readonly FRONTEND_URL: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.currency = this.configService.get<string>('razorpay.currency', 'INR');
    this.API_PUBLIC_URL = this.configService
      .get<string>('app.backendUrl', '')
      .replace(/\/$/, '');
    this.FRONTEND_URL = this.configService
      .get<string>('app.frontendUrl', '')
      .replace(/\/$/, '');
  }

  private formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  }

  private formatDate(value?: Date | null) {
    if (!value) {
      return null;
    }

    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private buildOrderLineItems(order: OrderNotificationOrder) {
    return order.items
      .map(
        (item) =>
          `<li>${sanitizeHtml(item.product.name)} x ${item.quantity} - ${this.formatCurrency(
            item.price * item.quantity,
          )}</li>`,
      )
      .join('');
  }

  private resolveAssetUrl(value?: string | null) {
    if (!value) {
      return null;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    const baseUrl = this.API_PUBLIC_URL || this.FRONTEND_URL;

    if (!baseUrl) {
      return null;
    }

    return new URL(value, baseUrl).toString();
  }

  private buildOrderUrl(path = '/orders/active') {
    if (!this.FRONTEND_URL) {
      return null;
    }

    return new URL(path, this.FRONTEND_URL).toString();
  }

  private buildStatusPill(label: string, color = '#0f5132') {
    return `<span style="display:inline-block;border-radius:999px;background:${color};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.08em;padding:7px 12px;text-transform:uppercase;">${sanitizeHtml(label)}</span>`;
  }

  private buildItemRows(order: OrderNotificationOrder) {
    return order.items
      .map((item) => {
        const imageUrl = this.resolveAssetUrl(item.product.image);
        const imageMarkup = imageUrl
          ? `<img src="${sanitizeHtml(imageUrl)}" alt="${sanitizeHtml(item.product.name)}" width="56" height="56" style="border-radius:12px;display:block;height:56px;object-fit:cover;width:56px;" />`
          : `<div style="background:#f1f5f2;border-radius:12px;height:56px;width:56px;"></div>`;

        return `
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #e7e5e4;width:68px;">${imageMarkup}</td>
            <td style="padding:14px 0;border-bottom:1px solid #e7e5e4;">
              <p style="color:#1c1917;font-size:14px;font-weight:700;line-height:1.4;margin:0;">${sanitizeHtml(item.product.name)}</p>
              <p style="color:#78716c;font-size:13px;margin:4px 0 0;">Qty ${item.quantity} x ${this.formatCurrency(item.price)}</p>
            </td>
            <td style="padding:14px 0;border-bottom:1px solid #e7e5e4;text-align:right;color:#1c1917;font-size:14px;font-weight:700;white-space:nowrap;">${this.formatCurrency(item.price * item.quantity)}</td>
          </tr>
        `;
      })
      .join('');
  }

  private buildMoneyRows(order: OrderNotificationOrder) {
    return `
      <tr><td style="padding:6px 0;color:#78716c;">Subtotal</td><td style="padding:6px 0;text-align:right;color:#1c1917;">${this.formatCurrency(order.subtotal)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Shipping</td><td style="padding:6px 0;text-align:right;color:#1c1917;">${this.formatCurrency(order.shippingAmount)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Handling</td><td style="padding:6px 0;text-align:right;color:#1c1917;">${this.formatCurrency(order.handlingAmount)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Tax</td><td style="padding:6px 0;text-align:right;color:#1c1917;">${this.formatCurrency(order.taxAmount)}</td></tr>
      <tr><td style="border-top:1px solid #e7e5e4;color:#1c1917;font-size:16px;font-weight:800;padding:12px 0 0;">Total</td><td style="border-top:1px solid #e7e5e4;color:#1c1917;font-size:18px;font-weight:800;padding:12px 0 0;text-align:right;">${this.formatCurrency(order.total)}</td></tr>
    `;
  }

  private buildEmailShell(input: {
    preview: string;
    eyebrow: string;
    title: string;
    statusLabel?: string;
    statusColor?: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string | null;
  }) {
    const cta = input.ctaUrl
      ? `<p style="margin:28px 0 0;"><a href="${sanitizeHtml(input.ctaUrl)}" style="background:#0f5132;border-radius:999px;color:#ffffff;display:inline-block;font-size:14px;font-weight:700;padding:13px 20px;text-decoration:none;">${sanitizeHtml(input.ctaLabel || 'View order')}</a></p>`
      : '';

    return `
      <div style="display:none;max-height:0;overflow:hidden;">${sanitizeHtml(input.preview)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f7f3;margin:0;padding:28px 0;width:100%;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:24px;max-width:680px;overflow:hidden;width:100%;">
              <tr>
                <td style="background:#0f5132;color:#ffffff;padding:26px 28px;">
                  <p style="font-size:12px;font-weight:700;letter-spacing:.18em;margin:0 0 10px;text-transform:uppercase;">Moringa Store</p>
                  <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:500;line-height:1.2;margin:0;">${sanitizeHtml(input.title)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="color:#047857;font-size:12px;font-weight:800;letter-spacing:.18em;margin:0 0 12px;text-transform:uppercase;">${sanitizeHtml(input.eyebrow)}</p>
                  ${
                    input.statusLabel
                      ? `<p style="margin:0 0 20px;">${this.buildStatusPill(input.statusLabel, input.statusColor)}</p>`
                      : ''
                  }
                  ${input.body}
                  ${cta}
                </td>
              </tr>
            </table>
            <p style="color:#78716c;font-size:12px;line-height:1.6;margin:18px auto 0;max-width:640px;">You are receiving this email because this address is linked to a Moringa Store order. Keep this message for your records.</p>
          </td>
        </tr>
      </table>
    `;
  }

  private buildOrderDetailsBlock(order: OrderNotificationOrder) {
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
        <tr>
          <td style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:18px;padding:18px;">
            <p style="color:#78716c;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Order details</p>
            <p style="color:#1c1917;font-size:14px;line-height:1.7;margin:0;"><strong>Order:</strong> ${sanitizeHtml(order.orderNumber || String(order.id))}<br/>
            <strong>Invoice:</strong> ${sanitizeHtml(order.invoiceNumber || 'Available after payment')}<br/>
            <strong>Shipping:</strong> ${sanitizeHtml(order.shippingType || 'standard')}</p>
          </td>
        </tr>
      </table>
    `;
  }

  private buildAddress(order: OrderNotificationOrder) {
    return [
      order.recipientName ? sanitizeHtml(order.recipientName) : '',
      order.addressLine1 ? sanitizeHtml(order.addressLine1) : '',
      order.addressLine2 ? sanitizeHtml(order.addressLine2) : '',
      [order.city, order.state, order.postalCode]
        .filter(Boolean)
        .map((s) => (s ? sanitizeHtml(s) : ''))
        .join(', '),
      order.country ? sanitizeHtml(order.country) : '',
    ]
      .filter(Boolean)
      .join('<br/>');
  }

  private buildText(order: OrderNotificationOrder, message: string) {
    return [
      `Moringa Store: ${message}`,
      `Order: ${order.orderNumber || order.id}`,
      order.trackingNumber ? `Tracking: ${order.trackingNumber}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private async queueCustomerNotifications(
    order: OrderNotificationOrder,
    type: NotificationType,
    subject: string,
    html: string,
    text: string,
    extraPayload: Record<string, unknown> = {},
  ) {
    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      status: type,
      ...extraPayload,
    };
    const notifications: Parameters<NotificationService['queue']>[0][] = [];

    if (order.user?.email) {
      notifications.push({
        userId: order.user.id ?? null,
        orderId: order.id,
        type,
        channel: NotificationChannel.EMAIL,
        recipient: order.user.email,
        subject,
        body: html,
        payload,
      });
    }

    if (order.phoneNumber && this.notificationService.isSmsConfigured) {
      notifications.push({
        userId: order.user?.id ?? null,
        orderId: order.id,
        type,
        channel: NotificationChannel.SMS,
        recipient: order.phoneNumber,
        body: text,
        payload,
      });
    }

    if (order.phoneNumber && this.notificationService.isWhatsappConfigured) {
      notifications.push({
        userId: order.user?.id ?? null,
        orderId: order.id,
        type,
        channel: NotificationChannel.WHATSAPP,
        recipient: order.phoneNumber,
        body: text,
        payload,
      });
    }

    await this.notificationService.queueMany(notifications);
  }

  async sendOrderPlaced(order: OrderNotificationOrder) {
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'your order';
    const sanitizedOrderNumber = order.orderNumber
      ? sanitizeHtml(order.orderNumber)
      : order.id.toString();
    const sanitizedInvoiceNumber = order.invoiceNumber
      ? sanitizeHtml(order.invoiceNumber)
      : 'Will be assigned shortly';
    const sanitizedShippingType = order.shippingType
      ? sanitizeHtml(order.shippingType)
      : 'standard';

    const subject = `${sanitizedOrderTitle} confirmed`;
    const html = this.buildEmailShell({
      preview: `Order ${sanitizedOrderNumber} is confirmed. Total ${this.formatCurrency(order.total)}.`,
      eyebrow: 'Order confirmed',
      title: `${sanitizedOrderTitle} is confirmed`,
      statusLabel: 'Order placed',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Thank you for shopping with us. Your order has been received and is queued for processing.</p>
        ${this.buildOrderDetailsBlock({
          ...order,
          orderNumber: sanitizedOrderNumber,
          invoiceNumber: sanitizedInvoiceNumber,
          shippingType: sanitizedShippingType,
        })}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">${this.buildItemRows(order)}</table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">${this.buildMoneyRows(order)}</table>
        <div style="background:#fafaf9;border-radius:18px;margin-top:20px;padding:18px;">
          <p style="color:#78716c;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Delivery address</p>
          <p style="color:#44403c;font-size:14px;line-height:1.7;margin:0;">${this.buildAddress(order)}</p>
        </div>
      `,
      ctaLabel: 'Track order',
      ctaUrl: this.buildOrderUrl('/orders/active'),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.ORDER_PLACED,
      subject,
      html,
      this.buildText(
        order,
        `${order.orderTitle || 'your order'} is confirmed. Total ${this.formatCurrency(order.total)}.`,
      ),
    );
  }

  async sendPaymentConfirmed(order: OrderNotificationOrder) {
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'your order';
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderNumber = order.orderNumber
      ? sanitizeHtml(order.orderNumber)
      : order.id.toString();

    const subject = `Payment received for ${sanitizedOrderTitle}`;
    const html = this.buildEmailShell({
      preview: `Payment received for order ${sanitizedOrderNumber}.`,
      eyebrow: 'Payment confirmed',
      title: `Payment received for ${sanitizedOrderTitle}`,
      statusLabel: 'Paid',
      statusColor: '#b45309',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Your payment was captured successfully. We are now preparing your items for dispatch.</p>
        ${this.buildOrderDetailsBlock(order)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">${this.buildItemRows(order)}</table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">${this.buildMoneyRows(order)}</table>
      `,
      ctaLabel: 'View invoice and tracking',
      ctaUrl: this.buildOrderUrl('/orders/active'),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.PAYMENT_CONFIRMED,
      subject,
      html,
      this.buildText(
        order,
        `payment received for ${order.orderTitle || 'your order'}.`,
      ),
    );
  }

  async sendOrderStatusUpdated(
    order: OrderNotificationOrder,
    status: OrderStatus,
    note?: string | null,
  ) {
    const readableStatus = status.replace(/_/g, ' ').toLowerCase();
    const sanitizedCourierName = order.courierName
      ? sanitizeHtml(order.courierName)
      : '';
    const sanitizedTrackingNumber = order.trackingNumber
      ? sanitizeHtml(order.trackingNumber)
      : '';
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'Your order';
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderIdentifier =
      order.orderTitle || order.orderNumber
        ? sanitizeHtml(order.orderTitle || order.orderNumber || '')
        : order.id.toString();
    const sanitizedNote = note ? sanitizeHtml(note) : '';
    const sanitizedAdminNotes = order.adminNotes
      ? sanitizeHtml(order.adminNotes)
      : '';

    const trackingDetails = [
      sanitizedCourierName
        ? `<p><strong>Courier:</strong> ${sanitizedCourierName}</p>`
        : '',
      sanitizedTrackingNumber
        ? `<p><strong>Tracking number:</strong> ${sanitizedTrackingNumber}</p>`
        : '',
      order.estimatedDeliveryAt
        ? `<p><strong>Estimated delivery:</strong> ${this.formatDate(order.estimatedDeliveryAt)}</p>`
        : '',
      sanitizedAdminNotes
        ? `<p><strong>Delivery note:</strong> ${sanitizedAdminNotes}</p>`
        : '',
    ].join('');
    const subject = `${sanitizedOrderTitle} is now ${readableStatus}`;
    const html = this.buildEmailShell({
      preview: `${sanitizedOrderIdentifier} is now ${readableStatus}.`,
      eyebrow: 'Order status update',
      title: `${sanitizedOrderTitle} update`,
      statusLabel: status.replace(/_/g, ' '),
      statusColor: status === OrderStatus.DELIVERED ? '#047857' : '#2563eb',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Your order <strong>${sanitizedOrderIdentifier}</strong> moved to <strong>${status.replace(
          /_/g,
          ' ',
        )}</strong>.</p>
        ${sanitizedNote ? `<p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">${sanitizedNote}</p>` : ''}
        <div style="background:#fafaf9;border-radius:18px;margin-top:20px;padding:18px;">
          ${trackingDetails || '<p style="color:#78716c;font-size:14px;margin:0;">We will share courier and delivery details as soon as they are available.</p>'}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">${this.buildItemRows(order)}</table>
      `,
      ctaLabel: 'Track order',
      ctaUrl: this.buildOrderUrl(
        status === OrderStatus.DELIVERED
          ? '/orders/delivered'
          : '/orders/active',
      ),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.ORDER_STATUS_UPDATED,
      subject,
      html,
      this.buildText(
        order,
        `${order.orderTitle || 'your order'} is now ${readableStatus}.`,
      ),
    );
  }

  async sendOrderCancelled(
    order: OrderNotificationOrder,
    reason?: string | null,
  ) {
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'Your order';
    const sanitizedReason = reason ? sanitizeHtml(reason) : '';
    const subject = `${order.orderTitle || 'Your order'} cancelled`;
    const html = this.buildEmailShell({
      preview: `${order.orderTitle || 'Your order'} was cancelled.`,
      eyebrow: 'Order cancelled',
      title: `${sanitizedOrderTitle} cancelled`,
      statusLabel: 'Cancelled',
      statusColor: '#dc2626',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Your order <strong>${sanitizedOrderTitle}</strong> has been cancelled.</p>
        ${sanitizedReason ? `<p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">${sanitizedReason}</p>` : ''}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">${this.buildItemRows(order)}</table>
      `,
      ctaLabel: 'View cancelled orders',
      ctaUrl: this.buildOrderUrl('/orders/cancelled'),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.ORDER_CANCELLED,
      subject,
      html,
      this.buildText(
        order,
        `${order.orderTitle || 'your order'} was cancelled.`,
      ),
    );
  }

  async sendSupportIssueSubmitted(
    order: OrderNotificationOrder,
    issue: OrderIssueNotification,
  ) {
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'your order';
    const sanitizedIssueTitle = issue.title
      ? sanitizeHtml(issue.title)
      : 'Support request';
    const sanitizedIssueType = issue.type
      ? sanitizeHtml(issue.type.replace(/_/g, ' ').toLowerCase())
      : 'support request';

    const subject = `Support request received for ${sanitizedOrderTitle}`;
    const html = this.buildEmailShell({
      preview: `Support request received for ${order.orderNumber || order.id}.`,
      eyebrow: 'Support ticket received',
      title: `We received your ${sanitizedIssueType} request`,
      statusLabel: issue.status || 'OPEN',
      statusColor: '#2563eb',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Your support ticket for <strong>${sanitizedOrderTitle}</strong> has been created.</p>
        <div style="background:#fafaf9;border-radius:18px;margin-top:20px;padding:18px;">
          <p style="color:#78716c;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Ticket details</p>
          <p style="color:#1c1917;font-size:14px;line-height:1.7;margin:0;"><strong>Ticket:</strong> #${issue.id}<br/>
          <strong>Type:</strong> ${sanitizedIssueType}<br/>
          <strong>Request:</strong> ${sanitizedIssueTitle}<br/>
          <strong>Order:</strong> ${sanitizeHtml(order.orderNumber || String(order.id))}</p>
        </div>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:18px 0 0;">Our team will review the request and share the next update by email and in your support ticket tracking page.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">${this.buildItemRows(order)}</table>
      `,
      ctaLabel: 'Track support ticket',
      ctaUrl: this.buildOrderUrl('/orders/support'),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.ORDER_STATUS_UPDATED,
      subject,
      html,
      this.buildText(
        order,
        `support request received for ${order.orderTitle || 'your order'}.`,
      ),
      {
        issueId: issue.id,
        issueType: issue.type ?? null,
        issueStatus: issue.status ?? null,
      },
    );
  }

  async sendSupportIssueUpdated(
    order: OrderNotificationOrder,
    issue: OrderIssueNotification,
  ) {
    const sanitizedUserName = order.user?.name
      ? sanitizeHtml(order.user.name)
      : 'Customer';
    const sanitizedOrderTitle = order.orderTitle
      ? sanitizeHtml(order.orderTitle)
      : 'your order';
    const sanitizedStatus = issue.status
      ? sanitizeHtml(issue.status.replace(/_/g, ' ').toLowerCase())
      : 'updated';
    const sanitizedIssueTitle = issue.title
      ? sanitizeHtml(issue.title)
      : 'Support request';
    const sanitizedAdminResponse = issue.adminResponse
      ? sanitizeHtml(issue.adminResponse)
      : '';
    const sanitizedResolutionSummary = issue.resolutionSummary
      ? sanitizeHtml(issue.resolutionSummary)
      : '';

    const subject = `Support request ${sanitizedStatus} for ${sanitizedOrderTitle}`;
    const html = this.buildEmailShell({
      preview: `Support ticket #${issue.id} is now ${sanitizedStatus}.`,
      eyebrow: 'Support ticket update',
      title: `Your support request is ${sanitizedStatus}`,
      statusLabel: issue.status || 'UPDATED',
      statusColor: ['RESOLVED', 'APPROVED'].includes(issue.status || '')
        ? '#047857'
        : ['REJECTED', 'CANCELLED'].includes(issue.status || '')
          ? '#dc2626'
          : '#2563eb',
      body: `
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello ${sanitizedUserName},</p>
        <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;">Your support request for <strong>${sanitizedOrderTitle}</strong> is now <strong>${sanitizedStatus}</strong>.</p>
        <div style="background:#fafaf9;border-radius:18px;margin-top:20px;padding:18px;">
          <p style="color:#78716c;font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Ticket #${issue.id}</p>
          <p style="color:#1c1917;font-size:14px;line-height:1.7;margin:0;"><strong>Request:</strong> ${sanitizedIssueTitle}<br/>
          <strong>Order:</strong> ${sanitizeHtml(order.orderNumber || String(order.id))}</p>
        </div>
        ${
          sanitizedAdminResponse
            ? `<div style="background:#ecfdf5;border-radius:18px;margin-top:18px;padding:18px;"><p style="color:#047857;font-size:12px;font-weight:800;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Admin response</p><p style="color:#064e3b;font-size:15px;line-height:1.7;margin:0;">${sanitizedAdminResponse}</p></div>`
            : ''
        }
        ${
          sanitizedResolutionSummary
            ? `<div style="background:#fafaf9;border-radius:18px;margin-top:18px;padding:18px;"><p style="color:#78716c;font-size:12px;font-weight:800;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase;">Resolution</p><p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">${sanitizedResolutionSummary}</p></div>`
            : ''
        }
      `,
      ctaLabel: 'Track support ticket',
      ctaUrl: this.buildOrderUrl('/orders/support'),
    });

    await this.queueCustomerNotifications(
      order,
      NotificationType.ORDER_STATUS_UPDATED,
      subject,
      html,
      this.buildText(
        order,
        `support request ${issue.status || 'updated'} for ${order.orderTitle || 'your order'}.`,
      ),
      {
        issueId: issue.id,
        issueType: issue.type ?? null,
        issueStatus: issue.status ?? null,
      },
    );
  }

  async sendLowStock(productName: string, stock: number) {
    const sanitizedProductName = sanitizeHtml(productName);
    const subject = `Low stock alert: ${sanitizedProductName}`;
    const html = `
      <div style="display:none;max-height:0;overflow:hidden;">Low stock alert for ${sanitizedProductName}. Current stock: ${stock}.</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f7f3;margin:0;padding:28px 0;width:100%;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:24px;max-width:680px;overflow:hidden;width:100%;">
              <tr>
                <td style="background:#0f5132;color:#ffffff;padding:26px 28px;">
                  <p style="font-size:12px;font-weight:700;letter-spacing:.18em;margin:0 0 10px;text-transform:uppercase;">Moringa Store</p>
                  <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:500;line-height:1.2;margin:0;">Low stock alert</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="color:#44403c;font-size:15px;line-height:1.7;margin:0;">Hello Admin,</p>
                  <p style="color:#44403c;font-size:15px;line-height:1.7;margin:12px 0 0;"><strong>${sanitizedProductName}</strong> is running low on stock.</p>
                  <div style="background:#fafaf9;border-radius:18px;margin-top:20px;padding:18px;">
                    <p style="color:#1c1917;font-size:14px;line-height:1.7;margin:0;"><strong>Product:</strong> ${sanitizedProductName}<br/>
                    <strong>Current stock:</strong> ${stock}</p>
                  </div>
                  <p style="color:#44403c;font-size:15px;line-height:1.7;margin:18px 0 0;">Please review inventory and restock if needed.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    });

    const notifications = admins
      .filter((admin) => Boolean(admin.email))
      .map((admin) => ({
        userId: admin.id,
        type: NotificationType.LOW_STOCK,
        channel: NotificationChannel.EMAIL,
        recipient: admin.email,
        subject,
        body: html,
        payload: { productName, stock },
      }));

    if (notifications.length > 0) {
      await this.notificationService.queueMany(notifications);
    }
  }
}
