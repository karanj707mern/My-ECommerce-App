import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AbandonedCartService } from './abandoned-cart.service';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly abandonedCartService: AbandonedCartService) {}

  onModuleInit(): void {
    this.logger.log('Scheduled jobs registered: abandoned-cart-cleanup (0 0 * * * Asia/Kolkata)');
  }

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
