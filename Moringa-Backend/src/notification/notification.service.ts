import {
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as amqp from 'amqplib';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailTemplateService as HandlebarsEmailTemplateService } from '@/common/email-templates/email-template.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';
import { RabbitMqService } from './rabbitmq/rabbitmq.service';
import { BullMqService } from './bullmq/bullmq.service';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';

interface QueueNotificationInput {
  userId?: number | null;
  orderId?: number | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string | null | undefined;
  subject?: string | null;
  body?: string;
  payload?: Prisma.InputJsonValue;
  skipPreferenceCheck?: boolean;
}

interface RenderTemplateInput {
  templateName: string;
  variables: Record<string, unknown>;
}

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly emailFrom: string;
  private readonly maxAttempts: number;
  private readonly retryIntervalMs: number;
  private retryTimer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly bullMqService: BullMqService,
    @Inject('HANDLEBARS_EMAIL_TEMPLATE_SERVICE')
    private readonly handlebarsTemplateService: HandlebarsEmailTemplateService,
  ) {
    const host = this.configService.get<string>('email.host', '');
    this.emailFrom = this.configService.get<string>('email.from', '');
    this.maxAttempts = this.configService.get<number>(
      'notifications.maxAttempts',
      3,
    );
    this.retryIntervalMs = this.configService.get<number>(
      'notifications.retryIntervalMs',
      60000,
    );

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.configService.get<number>('email.port', 587),
          secure: this.configService.get<boolean>('email.secure', false),
          auth: {
            user: this.configService.get<string>('email.user', ''),
            pass: this.configService.get<string>('email.pass', ''),
          },
        })
      : null;
  }

  onModuleInit() {
    if (this.bullMqService?.isConfigured) {
      this.bullMqService.setHandler((notificationId) =>
        this.handleBullMqNotification(notificationId),
      );
      return;
    }

    setTimeout(() => {
      void this.processPendingNotifications();
    }, 15000);

    this.retryTimer = setInterval(() => {
      void this.processPendingNotifications();
    }, this.retryIntervalMs);

    if (this.rabbitMqService?.isConfigured) {
      this.rabbitMqService
        .registerConsumer(
          this.handleRabbitMqNotification.bind(this) as (
            message: amqp.ConsumeMessage,
          ) => Promise<void>,
        )
        .catch((error) => {
          this.logger.error(
            'Failed to register RabbitMQ consumer',
            error instanceof Error ? error.stack : undefined,
          );
        });
    }
  }
  onModuleDestroy() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }

  private async handleRabbitMqNotification(message: amqp.Message) {
    const payload = JSON.parse(message.content.toString()) as {
      notificationId: number;
    };

    await this.dispatchNotification(payload.notificationId);
  }

  private async handleBullMqNotification(notificationId: number) {
    await this.dispatchNotification(notificationId);
  }

  async queue(
    input: QueueNotificationInput,
    renderInput?: RenderTemplateInput,
  ) {
    let subject = input.subject?.trim();
    let body = input.body;

    if (renderInput?.templateName) {
      const rendered = await this.renderTemplate(
        renderInput.templateName,
        renderInput.variables,
      );
      subject = rendered.subject;
      body = rendered.htmlBody;
    }

    if (!body) {
      throw new Error(
        'Notification body is required when no template is provided',
      );
    }

    const recipient = input.recipient?.trim();

    if (!recipient) {
      return null;
    }

    if (input.userId && !input.skipPreferenceCheck) {
      const preference = await this.prisma.notificationPreference.findFirst({
        where: {
          userId: input.userId,
          type: input.type,
          channel: input.channel,
          enabled: false,
        },
      });

      if (preference) {
        this.logger.debug(
          `Notification ${input.type} via ${input.channel} skipped for user ${input.userId} due to disabled preference`,
        );
        return null;
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        orderId: input.orderId ?? null,
        type: input.type,
        channel: input.channel,
        recipient,
        subject: subject || null,
        body,
        payload: input.payload ?? Prisma.JsonNull,
        maxAttempts: this.maxAttempts,
      },
    });

    if (this.bullMqService?.isConfigured) {
      void this.bullMqService.addJob(notification.id).catch((error) => {
        this.logger.error(
          `Notification ${notification.id} BullMQ add failed`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    } else if (this.rabbitMqService?.isConfigured) {
      void this.publishToRabbitMq(notification).catch((error) => {
        this.logger.error(
          `Notification ${notification.id} RabbitMQ publish failed`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    } else {
      void this.dispatchNotification(notification.id).catch((error) => {
        this.logger.error(
          `Notification ${notification.id} dispatch failed`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return notification;
  }

  private async publishToRabbitMq(notification: {
    id: number;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    subject?: string | null;
    body: string;
    payload?: unknown;
    maxAttempts: number;
  }) {
    if (!this.rabbitMqService?.isConfigured) {
      return;
    }

    await this.rabbitMqService.publish({
      notificationId: notification.id,
      type: notification.type,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject,
      body: notification.body,
      payload: notification.payload,
      maxAttempts: notification.maxAttempts,
    });
  }

  async queueMany(inputs: QueueNotificationInput[]) {
    return Promise.all(inputs.map((input) => this.queue(input)));
  }

  async getUserNotifications(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{
    data: Notification[];
    meta: { total: number; page: number; pages: number };
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationAsRead(
    notificationId: number,
    userId: number,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
      },
    });
  }

  async markAllNotificationsAsRead(userId: number): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: { not: NotificationStatus.SENT },
      },
      data: {
        status: NotificationStatus.SENT,
      },
    });

    return { count: result.count };
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: { not: NotificationStatus.SENT },
      },
    });

    return { count };
  }

  async updateNotificationPreference(
    userId: number,
    dto: NotificationPreferenceDto,
  ): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type: dto.type,
          channel: dto.channel,
        },
      },
      update: { enabled: dto.enabled },
      create: {
        userId,
        type: dto.type,
        channel: dto.channel,
        enabled: dto.enabled,
      },
    });
  }

  async getUserPreferences(
    userId: number,
  ): Promise<NotificationPreferenceDto[]> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { type: 'asc', channel: 'asc' },
    });

    return preferences.map((p) => ({
      type: p.type,
      channel: p.channel,
      enabled: p.enabled,
    }));
  }

  get isEmailConfigured() {
    return Boolean(this.transporter);
  }

  get isSmsConfigured() {
    return Boolean(
      this.configService.get<string>('notifications.twilio.accountSid', '') &&
      this.configService.get<string>('notifications.twilio.authToken', '') &&
      this.configService.get<string>('notifications.twilio.smsFrom', ''),
    );
  }

  get isWhatsappConfigured() {
    const hasTwilioWhatsapp = Boolean(
      this.configService.get<string>('notifications.twilio.accountSid', '') &&
      this.configService.get<string>('notifications.twilio.authToken', '') &&
      this.configService.get<string>('notifications.twilio.whatsappFrom', ''),
    );
    const hasCloudApi = Boolean(
      this.configService.get<string>(
        'notifications.whatsappCloud.accessToken',
        '',
      ) &&
      this.configService.get<string>(
        'notifications.whatsappCloud.phoneNumberId',
        '',
      ),
    );

    return hasTwilioWhatsapp || hasCloudApi;
  }

  async processPendingNotifications() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingNotifications = await this.prisma.notification.findMany({
        where: {
          status: {
            in: [NotificationStatus.PENDING, NotificationStatus.FAILED],
          },
          attempts: {
            lt: this.maxAttempts,
          },
          scheduledAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 25,
      });

      for (const notification of pendingNotifications) {
        try {
          await this.dispatchNotification(notification.id);
        } catch (error) {
          this.logger.error(
            `Failed dispatching notification ${notification.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to process notifications',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchNotification(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (
      !notification ||
      notification.status === NotificationStatus.SENT ||
      notification.attempts >= notification.maxAttempts
    ) {
      return;
    }

    try {
      const providerMessageId = await this.sendNotification(notification);

      await this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          attempts: { increment: 1 },
          providerMessageId,
          lastError: null,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      const attempts = notification.attempts + 1;
      const failedPermanently = attempts >= notification.maxAttempts;
      const nextDelayMs = Math.min(1000 * 60 * 15, 1000 * 30 * attempts);

      await this.prisma.notification.update({
        where: { id },
        data: {
          status: failedPermanently
            ? NotificationStatus.FAILED
            : NotificationStatus.PENDING,
          attempts,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          scheduledAt: failedPermanently
            ? notification.scheduledAt
            : new Date(Date.now() + nextDelayMs),
        },
      });
    }
  }

  private async sendNotification(notification: {
    channel: NotificationChannel;
    recipient: string;
    subject: string | null;
    body: string;
  }): Promise<string | null> {
    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        return this.sendEmail(
          notification.recipient,
          notification.subject || 'Moringa Store update',
          notification.body,
        );
      case NotificationChannel.SMS:
        return this.sendSms(notification.recipient, notification.body);
      case NotificationChannel.WHATSAPP:
        return this.sendWhatsapp(notification.recipient, notification.body);
      default: {
        const exhaustiveChannel: never = notification.channel;
        void exhaustiveChannel;
        throw new Error('Unsupported notification channel');
      }
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      throw new Error('SMTP transport is not configured');
    }

    const result = (await this.transporter.sendMail({
      from: this.emailFrom,
      to,
      subject,
      html,
      text: html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
    })) as { messageId?: string };

    return typeof result.messageId === 'string' ? result.messageId : null;
  }

  private async sendSms(to: string, body: string) {
    const accountSid = this.configService.get<string>(
      'notifications.twilio.accountSid',
      '',
    );
    const authToken = this.configService.get<string>(
      'notifications.twilio.authToken',
      '',
    );
    const from = this.configService.get<string>(
      'notifications.twilio.smsFrom',
      '',
    );

    if (!accountSid || !authToken || !from) {
      throw new Error('Twilio SMS is not configured');
    }

    return this.sendTwilioMessage(accountSid, authToken, from, to, body);
  }

  private async sendWhatsapp(to: string, body: string) {
    const twilioWhatsappFrom = this.configService.get<string>(
      'notifications.twilio.whatsappFrom',
      '',
    );
    const accountSid = this.configService.get<string>(
      'notifications.twilio.accountSid',
      '',
    );
    const authToken = this.configService.get<string>(
      'notifications.twilio.authToken',
      '',
    );

    if (accountSid && authToken && twilioWhatsappFrom) {
      return this.sendTwilioMessage(
        accountSid,
        authToken,
        twilioWhatsappFrom,
        `whatsapp:${to}`,
        body,
      );
    }

    return this.sendWhatsappCloudMessage(to, body);
  }

  private async sendTwilioMessage(
    accountSid: string,
    authToken: string,
    from: string,
    to: string,
    body: string,
  ) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body,
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || 'Twilio notification failed');
    }

    return payload.sid ?? null;
  }

  private async sendWhatsappCloudMessage(to: string, body: string) {
    const accessToken = this.configService.get<string>(
      'notifications.whatsappCloud.accessToken',
      '',
    );
    const phoneNumberId = this.configService.get<string>(
      'notifications.whatsappCloud.phoneNumberId',
      '',
    );

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp provider is not configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/^\+/, ''),
          type: 'text',
          text: {
            preview_url: false,
            body,
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(payload.error?.message || 'WhatsApp notification failed');
    }

    return payload.messages?.[0]?.id ?? null;
  }

  async findAdminNotifications(input: {
    orderId?: number;
    status?: NotificationStatus;
    channel?: NotificationChannel;
    type?: NotificationType;
    page: number;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};

    if (input.orderId !== undefined) {
      where.orderId = input.orderId;
    }
    if (input.status) {
      where.status = input.status;
    }
    if (input.channel) {
      where.channel = input.channel;
    }
    if (input.type) {
      where.type = input.type;
    }

    const skip = (input.page - 1) * input.limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async renderTemplate(
    templateName: string,
    variables: Record<string, unknown>,
  ): Promise<{ subject: string; htmlBody: string; textBody: string }> {
    const dbTemplate = await this.prisma.emailTemplate.findFirst({
      where: { name: templateName, isActive: true },
    });

    const subject = dbTemplate?.subject || this.defaultSubject(templateName);
    let htmlBody = '';

    try {
      htmlBody = this.handlebarsTemplateService.render(
        templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        variables,
      );
    } catch {
      // Handlebars template not found or failed to render; fall back to DB.
    }

    if (!htmlBody && dbTemplate) {
      htmlBody = this.replacePlaceholders(dbTemplate.htmlBody, variables);
    }

    if (!htmlBody) {
      throw new Error(
        `Email template "${templateName}" not found or is inactive`,
      );
    }

    const textBody = dbTemplate?.textBody
      ? this.replacePlaceholders(dbTemplate.textBody, variables)
      : sanitizeHtml(htmlBody)!;

    return { subject, htmlBody, textBody };
  }

  private defaultSubject(templateName: string): string {
    return templateName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private replacePlaceholders(
    content: string,
    variables: Record<string, unknown>,
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      const record = variables as Record<string, string | number | boolean>;
      const value = record[key];
      if (value === undefined) return _match;
      return String(value);
    });
  }

  getHealth() {
    return {
      rabbitMq: this.rabbitMqService?.isConfigured ?? false,
      bullMq: this.bullMqService?.isConfigured ?? false,
    };
  }
}
