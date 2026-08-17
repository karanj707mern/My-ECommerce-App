import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RedisIoAdapter {
  constructor(private readonly app: unknown, private readonly redisUrl: string, private readonly corsOrigins: string[]) {}

  async connectToRedis(): Promise<void> {
    // Redis connection placeholder
  }

  async close(): Promise<void> {
    // Redis close placeholder
  }
}
