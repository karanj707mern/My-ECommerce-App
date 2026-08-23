import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Scope } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable({ scope: Scope.DEFAULT })
export class AuditLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    entityType: string,
    entityId: number | null,
    oldValue?: string,
    newValue?: string,
    req?: FastifyRequest & { user?: { id: number } },
  ): Promise<void> {
    const userId = req?.user?.id;
    if (!userId) {
      return;
    }

    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    await this.prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }
}