import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AdminAuditLog, Prisma } from '@prisma/client';

interface AuditLogWithUser extends AdminAuditLog {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('log')
  async getAuditLogs(@Query() query: AuditLogQueryDto): Promise<{
    data: AuditLogWithUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  @Get('log/:id')
  async getAuditLog(@Param('id') id: string): Promise<AuditLogWithUser> {
    return this.prisma.adminAuditLog.findUniqueOrThrow({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
