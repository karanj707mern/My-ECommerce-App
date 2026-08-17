import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationService } from '@/notification/notification.service';
import { sanitizeHtml } from '@/common/utils/sanitize.util';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.isProduction = this.configService.get<boolean>(
      'app.isProduction',
      false,
    );
  }

  private getFrontendUrl() {
    const configuredUrl = this.configService.get<string>('app.frontendUrl', '');
    const normalizedUrl = configuredUrl.trim().split(/[,\s]+/)[0] ?? '';

    if (!normalizedUrl) {
      return '';
    }

    try {
      return new URL(normalizedUrl).toString();
    } catch {
      this.logger.warn(
        `Invalid FRONTEND_URL configuration "${configuredUrl}". Falling back to a relative auth URL.`,
      );
      return '';
    }
  }

  private async renderLoginAlertTemplate(input: {
    name: string;
    browser: string;
    os: string;
    device: string;
    ip: string;
    location: string;
  }): Promise<string> {
    const rendered = await this.notificationService.renderTemplate(
      'LOGIN_ALERT',
      input,
    );
    return rendered.htmlBody;
  }

  private formatLocation(deviceInfo?: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
  }): string {
    const parts = [
      deviceInfo?.city,
      deviceInfo?.region,
      deviceInfo?.country,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(', ');
    }

    if (deviceInfo?.timezone) {
      return deviceInfo.timezone;
    }

    return 'Unknown location';
  }

  private buildAuthUrl(mode: 'verify-email' | 'reset-password', token: string) {
    const frontendUrl = this.getFrontendUrl();
    if (!frontendUrl) {
      return `/auth?mode=${mode}&token=${encodeURIComponent(token)}`;
    }

    const authUrl = new URL('/auth', frontendUrl);
    authUrl.searchParams.set('mode', mode);
    authUrl.searchParams.set('token', token);
    return authUrl.toString();
  }

  buildVerificationUrl(token: string) {
    return this.buildAuthUrl('verify-email', token);
  }

  buildPasswordResetUrl(token: string) {
    return this.buildAuthUrl('reset-password', token);
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string,
    userId?: number,
  ) {
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
          variables: { verificationUrl, name: name || 'User' },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Email service is unavailable. Check SMTP credentials and try again.',
      );
    }

    this.logger.log(`Verification email sent to ${email}`);

    return verificationUrl;
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    name?: string,
    userId?: number,
  ) {
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
          skipPreferenceCheck: true,
        },
        {
          templateName: 'PASSWORD_RESET',
          variables: { resetUrl, name: name || 'User' },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Email service is unavailable. Check SMTP credentials and try again.',
      );
    }

    this.logger.log(`Password reset email sent to ${email}`);

    return resetUrl;
  }

  async sendLoginAlert(
    email: string,
    name: string,
    userId?: number,
    deviceInfo?: {
      browser?: string;
      os?: string;
      device?: string;
      ip?: string;
      country?: string;
      region?: string;
      city?: string;
      timezone?: string;
    },
  ) {
    if (!this.notificationService.isEmailConfigured) {
      if (this.isProduction) {
        throw new Error('SMTP transport is not configured');
      }

      this.logger.warn(
        `SMTP transport is not configured. Login alert for ${email}`,
      );

      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';
    const browser = deviceInfo?.browser || 'Unknown browser';
    const os = deviceInfo?.os || 'Unknown OS';
    const device = deviceInfo?.device || 'Unknown device';
    const ip = deviceInfo?.ip || 'Unknown IP';
    const location = this.formatLocation(deviceInfo);

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.LOGIN_ALERT,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'LOGIN_ALERT',
          variables: {
            name: sanitizedName,
            browser,
            os,
            device,
            ip,
            location,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send login alert email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Email service is unavailable. Check SMTP credentials and try again.',
      );
    }

    this.logger.log(`Login alert email sent to ${email}`);

    return true;
  }

  async sendWelcome(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.WELCOME,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'WELCOME',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Welcome email sent to ${email}`);

    return true;
  }

  async sendEmailVerified(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.EMAIL_VERIFIED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'EMAIL_VERIFIED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email verified notification to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Email verified notification sent to ${email}`);

    return true;
  }

  async sendProfileUpdated(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.PROFILE_UPDATED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'PROFILE_UPDATED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send profile updated email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Profile updated email sent to ${email}`);

    return true;
  }

  async sendAddressAdded(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.ADDRESS_ADDED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'ADDRESS_ADDED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send address added email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Address added email sent to ${email}`);

    return true;
  }

  async sendAddressUpdated(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.ADDRESS_UPDATED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'ADDRESS_UPDATED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send address updated email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Address updated email sent to ${email}`);

    return true;
  }

  async sendAddressDeleted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.ADDRESS_DELETED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'ADDRESS_DELETED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send address deleted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Address deleted email sent to ${email}`);

    return true;
  }

  async sendReviewPosted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

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
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send review posted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Review posted email sent to ${email}`);

    return true;
  }

  async sendCommentPosted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

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
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send comment posted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Comment posted email sent to ${email}`);

    return true;
  }

  async sendBlogPosted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.BLOG_POSTED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'BLOG_POSTED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send blog posted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Blog posted email sent to ${email}`);

    return true;
  }

  async sendBlogUpdated(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.BLOG_UPDATED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'BLOG_UPDATED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send blog updated email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Blog updated email sent to ${email}`);

    return true;
  }

  async sendBlogDeleted(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.BLOG_DELETED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'BLOG_DELETED',
          variables: { name: sanitizedName },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send blog deleted email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Blog deleted email sent to ${email}`);

    return true;
  }

  async sendNewUserRegistered(email: string, name: string, userId?: number) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'Someone';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.NEW_USER_REGISTERED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'NEW_USER_REGISTERED',
          variables: { name: sanitizedName, email },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send new user registered email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`New user registered email sent to ${email}`);

    return true;
  }

  async sendLowStock(
    email: string,
    name: string,
    userId?: number,
    productName?: string,
  ) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedProduct = productName
      ? sanitizeHtml(productName)
      : 'a product';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.LOW_STOCK,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'LOW_STOCK',
          variables: { productName: sanitizedProduct },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send low stock email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Low stock email sent to ${email}`);

    return true;
  }

  async sendSupportIssueCreated(
    email: string,
    name: string,
    userId?: number,
    issueTitle?: string,
  ) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';
    const sanitizedTitle = issueTitle
      ? sanitizeHtml(issueTitle)
      : 'Support request';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.SUPPORT_ISSUE_CREATED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'SUPPORT_ISSUE_CREATED',
          variables: { name: sanitizedName, issueTitle: sanitizedTitle },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send support issue created email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Support issue created email sent to ${email}`);

    return true;
  }

  async sendSupportIssueUpdated(
    email: string,
    name: string,
    userId?: number,
    issueTitle?: string,
  ) {
    if (!this.notificationService.isEmailConfigured) {
      return null;
    }

    const sanitizedName = name ? sanitizeHtml(name) : 'User';
    const sanitizedTitle = issueTitle
      ? sanitizeHtml(issueTitle)
      : 'Support request';

    try {
      await this.notificationService.queue(
        {
          userId,
          type: NotificationType.SUPPORT_ISSUE_UPDATED,
          channel: NotificationChannel.EMAIL,
          recipient: email,
        },
        {
          templateName: 'SUPPORT_ISSUE_UPDATED',
          variables: { name: sanitizedName, issueTitle: sanitizedTitle },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send support issue updated email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    this.logger.log(`Support issue updated email sent to ${email}`);

    return true;
  }
}
