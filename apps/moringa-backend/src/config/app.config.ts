import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '5000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [],
  isProduction: process.env.NODE_ENV === 'production',
  siteUrl: process.env.SITE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
}));
