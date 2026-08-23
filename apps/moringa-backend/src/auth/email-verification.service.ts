import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
} from '@/generated/prisma/client';
import { NotificationService } from '@/notification/notification.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';

/**
 * Auth-related transactional emails, all dispatched through the notification
 * pipeline (queued, retried, template-rendered) so registration/password
 * flows never hard-fail on a transient SMTP outage (legacy parity).
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string,
    userId?: number,
  ): Promise<string> {
    const verificationUrl = this.buildVerificationUrl(token);

    if (!this.notificationService.isEmailConfigured) {
      if (this.isProduction) {
        throw new Error('SMTP transport is not configured');
      }

      this.logger.warn(
        `SMTP transport is not configured. Verification link for ${email}: ${verificationUrl}`,
      );

      return verificationUrl;
    }

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.EMAIL_VERIFICATION,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'EMAIL_VERIFICATION',
          variables: { name: this.safeName(name), verificationUrl },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue verification email for ${email}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (this.isProduction) {
        throw error;
      }
    }

    return verificationUrl;
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    name?: string,
    userId?: number,
  ): Promise<string> {
    const resetUrl = this.buildPasswordResetUrl(token);

    if (!this.notificationService.isEmailConfigured) {
      if (this.isProduction) {
        throw new Error('SMTP transport is not configured');
      }

      this.logger.warn(
        `SMTP transport is not configured. Password reset link for ${email}: ${resetUrl}`,
      );

      return resetUrl;
    }

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.PASSWORD_RESET,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'PASSWORD_RESET',
          variables: { name: this.safeName(name), resetUrl },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue password reset email for ${email}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (this.isProduction) {
        throw error;
      }
    }

    return resetUrl;
  }

  async sendReviewPosted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.REVIEW_POSTED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'REVIEW_POSTED',
          variables: { name: this.safeName(name) },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send review posted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async sendCommentPosted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.COMMENT_POSTED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'COMMENT_POSTED',
          variables: { name: this.safeName(name) },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send comment posted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private safeName(name?: string): string {
    return name ? sanitizeHtml(name) ?? 'User' : 'User';
  }

  private buildVerificationUrl(token: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${appUrl}/verify-email?token=${token}`;
  }

  private buildPasswordResetUrl(token: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${appUrl}/reset-password?token=${token}`;
  }
}
