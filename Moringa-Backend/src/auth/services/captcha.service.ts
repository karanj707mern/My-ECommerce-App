import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { RedisCacheService } from '@/cache/redis-cache.service';

interface CaptchaEntry {
  text: string;
  expires: number;
}

@Injectable()
export class CaptchaService implements OnModuleDestroy {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly inMemoryStore = new Map<string, CaptchaEntry>();
  private cleanupTimer?: NodeJS.Timeout;
  // Fallback to in-memory storage when Redis is not configured.
  // NOTE: In multi-instance deployments, each instance has its own store.
  // Install Redis and set REDIS_URL to use distributed CAPTCHA storage.
  private readonly useRedis: boolean;

  constructor(
    @Optional()
    @Inject(RedisCacheService)
    private readonly redisCache?: RedisCacheService,
  ) {
    this.useRedis = Boolean(this.redisCache?.isEnabled);

    if (!this.useRedis) {
      this.logger.warn(
        'CAPTCHA storage using in-memory cache. This is not suitable for multi-instance deployments.',
      );
      this.logger.debug(
        'Set REDIS_URL environment variable to enable Redis-backed CAPTCHA storage.',
      );

      // Clean up expired CAPTCHAs every 5 minutes
      this.cleanupTimer = setInterval(
        () => this.cleanupExpiredInMemory(),
        5 * 60 * 1000,
      );
    }
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Generate a new CAPTCHA
   * @returns Object containing the SVG data and a CAPTCHA ID (for verification)
   */
  async generateCaptcha(): Promise<{ data: string; text: string }> {
    const captcha = svgCaptcha.create({
      size: 4, // number of characters
      fontSize: 50,
      width: 150,
      height: 50,
      background: '#ffffff',
      color: true,
      noise: 2,
      ignoreChars: '0o1iIL', // characters that look similar
    });

    const id = randomUUID();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    if (this.useRedis && this.redisCache) {
      await this.redisCache.setJson(
        `captcha:${id}`,
        { text: captcha.text.toLowerCase(), expires },
        300, // 5 minutes TTL in Redis
      );
    } else {
      this.inMemoryStore.set(id, {
        text: captcha.text.toLowerCase(),
        expires,
      });
    }

    this.logger.debug(`Generated CAPTCHA with ID: ${id}`);

    return {
      data: captcha.data,
      text: id, // Return the ID to the client, not the actual text
    };
  }

  /**
   * Verify a CAPTCHA response
   * @param id The CAPTCHA ID returned from generateCaptcha
   * @param userInput The user's input to verify
   * @returns True if the CAPTCHA is valid, false otherwise
   */
  async verifyCaptcha(id: string, userInput: string): Promise<boolean> {
    if (!id || !userInput) {
      return false;
    }

    let captchaData: CaptchaEntry | null = null;

    if (this.useRedis && this.redisCache) {
      captchaData = await this.redisCache.getJson<CaptchaEntry>(
        `captcha:${id}`,
      );
    } else {
      captchaData = this.inMemoryStore.get(id) ?? null;
    }

    if (!captchaData) {
      this.logger.warn(`CAPTCHA not found or expired for ID: ${id}`);
      return false;
    }

    // Check if expired
    if (Date.now() > captchaData.expires) {
      this.clearCaptcha(id);
      this.logger.warn(`CAPTCHA expired for ID: ${id}`);
      return false;
    }

    // Case-insensitive comparison
    const isValid = captchaData.text === userInput.toLowerCase().trim();

    // Remove the CAPTCHA after verification (one-time use)
    await this.clearCaptcha(id);

    if (isValid) {
      this.logger.debug(`CAPTCHA verified successfully for ID: ${id}`);
    } else {
      this.logger.warn(`CAPTCHA verification failed for ID: ${id}`);
    }

    return isValid;
  }

  private async clearCaptcha(id: string): Promise<void> {
    if (this.useRedis && this.redisCache) {
      await this.redisCache.del(`captcha:${id}`);
    } else {
      this.inMemoryStore.delete(id);
    }
  }

  /**
   * Clean up expired CAPTCHAs (in-memory only)
   */
  private cleanupExpiredInMemory(): void {
    const now = Date.now();
    for (const [id, data] of this.inMemoryStore.entries()) {
      if (now > data.expires) {
        this.inMemoryStore.delete(id);
      }
    }
    this.logger.debug(
      `Cleaned up expired CAPTCHAs. Remaining: ${this.inMemoryStore.size}`,
    );
  }
}
