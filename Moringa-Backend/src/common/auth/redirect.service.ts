import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AllowedRedirectService {
  private readonly allowedPrefixes: string[];

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('app.frontendUrl', '');
    this.allowedPrefixes = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return value.replace(/\/+$/, '');
        }
      });
  }

  ensureAllowed(from: string | null | undefined): string {
    if (!from) {
      return '/';
    }

    const trimmed = from.trim();

    if (!trimmed || trimmed === '/') {
      return '/';
    }

    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }

    try {
      const origin = new URL(trimmed).origin;

      if (
        this.allowedPrefixes.some(
          (prefix) => origin === prefix || origin.startsWith(prefix),
        )
      ) {
        return trimmed;
      }
    } catch {
      // fall through
    }

    throw new UnprocessableEntityException('Redirect target is not allowed.');
  }
}
