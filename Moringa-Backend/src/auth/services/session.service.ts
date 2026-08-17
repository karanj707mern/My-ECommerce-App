import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';

interface DeviceInfo {
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    userId: number,
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<void> {
    const hashed = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const id = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id,
        userId,
        refreshToken: hashed,
        userAgent: deviceInfo?.userAgent || null,
        ip: deviceInfo?.ip || null,
        country: deviceInfo?.country || null,
        city: deviceInfo?.city || null,
        device: deviceInfo?.device || null,
        browser: deviceInfo?.browser || null,
        os: deviceInfo?.os || null,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashed,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  }

  async listSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        country: true,
        city: true,
        device: true,
        browser: true,
        os: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: number, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });

    return { message: 'Session revoked' };
  }

  async createRotatedSession(
    userId: number,
    userAgent?: string,
    ip?: string,
    country?: string,
    city?: string,
    device?: string,
    browser?: string,
    os?: string,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const newSessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: newSessionId,
        userId,
        refreshToken: hashed,
        userAgent: userAgent || null,
        ip: ip || null,
        country: country || null,
        city: city || null,
        device: device || null,
        browser: browser || null,
        os: os || null,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashed,
        refreshTokenExpiresAt: expiresAt,
      },
    });

    return { sessionId: newSessionId, expiresAt };
  }

  async getSessionById(userId: number, sessionId: string) {
    return this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
  }
  async deleteAllUserSessions(userId: number) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async findSessionByRefreshToken(userId: number, hashedRefreshToken: string) {
    return this.prisma.session.findFirst({
      where: {
        userId,
        refreshToken: hashedRefreshToken,
        expiresAt: { gt: new Date() },
      },
    });
  }
}
