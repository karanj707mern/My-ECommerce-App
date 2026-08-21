import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: number, refreshToken: string, deviceInfo?: { userAgent?: string; ip?: string }, jti?: string) {
    const hashedToken = Buffer.from(refreshToken).toString('base64');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: jti || crypto.randomUUID(),
        userId,
        refreshToken: hashedToken,
        userAgent: deviceInfo?.userAgent,
        ip: deviceInfo?.ip,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  }

  async findSessionByRefreshToken(userId: number, refreshToken: string) {
    const hashedToken = Buffer.from(refreshToken).toString('base64');
    return this.prisma.session.findFirst({
      where: {
        userId,
        refreshToken: hashedToken,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async listSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(userId: number, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return { message: 'Session revoked' };
  }
}
