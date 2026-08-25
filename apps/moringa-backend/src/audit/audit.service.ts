import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: number, action: string, entityType: string, entityId?: number) {
    return this.prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
      },
    });
  }
}
