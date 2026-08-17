import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';

@Injectable({ scope: Scope.DEFAULT })
export class AuditLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    entityType: string,
    entityId: number | null,
    oldValue?: string,
    newValue?: string,
    req?: Request & { user?: { id: number } },
  ): Promise<void> {
    const userId = req?.user?.id;
    if (!userId) {
      return;
    }

    const ipAddress = req?.ip || req?.connection?.remoteAddress;
    const userAgent = req?.get('user-agent');

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
