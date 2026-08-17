import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailVerificationService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendVerificationEmail(email: string, token: string, name: string, userId: number): Promise<string> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: '"Moringa Store" <noreply@moringa.com>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });

    return verificationUrl;
  }

  async sendPasswordResetEmail(email: string, token: string, name: string, userId: number): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: '"Moringa Store" <noreply@moringa.com>',
      to: email,
      subject: 'Reset your password',
      html: `
        <h1>Hello ${name}!</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
      `,
    });
  }

  async sendLoginAlert(email: string, name: string, userId: number, deviceInfo?: { userAgent?: string; ip?: string }): Promise<void> {
    await this.transporter.sendMail({
      from: '"Moringa Store" <noreply@moringa.com>',
      to: email,
      subject: 'New login detected',
      html: `
        <h1>Hello ${name}!</h1>
        <p>A new login was detected on your account.</p>
        ${deviceInfo?.ip ? `<p><strong>IP:</strong> ${deviceInfo.ip}</p>` : ''}
        ${deviceInfo?.userAgent ? `<p><strong>Device:</strong> ${deviceInfo.userAgent}</p>` : ''}
      `,
    });
  }
}
