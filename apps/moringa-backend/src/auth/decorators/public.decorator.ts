import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or entire controller) as publicly accessible.
 *
 * Consumed by {@link JwtAuthGuard}: when present on handler or class
 * metadata, authentication is skipped entirely. Required for the global
 * default-deny registration flip (APP_GUARD); harmless under current
 * per-route `@UseGuards` wiring, where public routes simply omit the guard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
