import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AbandonedCartService } from './abandoned-cart.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly abandonedCartService: AbandonedCartService) {}

  @Cron('0 0 * * *', {
    name: 'abandoned-cart-cleanup',
    timeZone: 'Asia/Kolkata',
  })
  async handleAbandonedCartCleanup() {
    this.logger.log('Starting abandoned cart cleanup job');
    try {
      await this.abandonedCartService.cleanupExpired();
      this.logger.log('Abandoned cart cleanup completed');
    } catch (error) {
      this.logger.error(
        'Abandoned cart cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
