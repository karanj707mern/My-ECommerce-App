import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis.service';

@Injectable()
export class TokenRevocationService implements OnModuleDestroy {
  private readonly REVOKED_PREFIX = 'revoked:token:';
  private readonly TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly redisService: RedisService) {}

  async revoke(tokenId: string): Promise<void> {
    await this.redisService
      .getClient()
      .setex(`${this.REVOKED_PREFIX}${tokenId}`, this.TTL, 'revoked');
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    const result = await this.redisService.getClient().get(`${this.REVOKED_PREFIX}${tokenId}`);
    return result === 'revoked';
  }

  async onModuleDestroy() {
    // Connection lifecycle managed by RedisService
  }
}
