const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://localhost:3000',
  'https://*.vercel.app',
  'https://*.vercel-preview.com',
];

export default () => ({
  app: {
    environment: process.env.NODE_ENV ?? 'development',
    isProduction: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT ?? '5000', 10),
    siteUrl:
      process.env.SITE_URL ??
      process.env.FRONTEND_URL?.split(',')[0]?.trim() ??
      '',
    frontendUrl: process.env.FRONTEND_URL ?? '',
    backendUrl:
      process.env.BACKEND_URL ??
      process.env.API_PUBLIC_URL ??
      process.env.FRONTEND_URL ??
      '',
    corsOrigins: Array.from(
      new Set(
        [
          ...(process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? '').split(
            ',',
          ),
          ...defaultCorsOrigins,
        ]
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    ),
    jwtSecret: process.env.JWT_SECRET ?? '',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  email: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    currency: (process.env.RAZORPAY_CURRENCY ?? 'INR').toUpperCase(),
  },
  redis: {
    url: process.env.REDIS_URL ?? '',
    cacheTtlSeconds: parseInt(process.env.REDIS_CACHE_TTL_SECONDS ?? '300', 10),
  },
  notifications: {
    retryIntervalMs: parseInt(
      process.env.NOTIFICATION_RETRY_INTERVAL_MS ?? '60000',
      10,
    ),
    maxAttempts: parseInt(process.env.NOTIFICATION_MAX_ATTEMPTS ?? '3', 10),
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      smsFrom: process.env.TWILIO_SMS_FROM ?? '',
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
    },
    whatsappCloud: {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    },
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? '',
    host: process.env.RABBITMQ_HOST ?? '',
    port: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
    user: process.env.RABBITMQ_USER ?? '',
    pass: process.env.RABBITMQ_PASS ?? '',
    vhost: process.env.RABBITMQ_VHOST ?? '/',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'local',
    cloudinary: {
      cloudName: process.env.STORAGE_CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.STORAGE_CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.STORAGE_CLOUDINARY_API_SECRET ?? '',
      folder: process.env.STORAGE_CLOUDINARY_FOLDER ?? 'moringa-store',
      publicUrl: process.env.STORAGE_CLOUDINARY_PUBLIC_URL ?? '',
      uploadPreset: process.env.STORAGE_CLOUDINARY_UPLOAD_PRESET ?? '',
    },
    r2: {
      endpoint: process.env.STORAGE_R2_ENDPOINT ?? '',
      region: process.env.STORAGE_R2_REGION ?? '',
      accessKeyId: process.env.STORAGE_R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.STORAGE_R2_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.STORAGE_R2_BUCKET ?? '',
      publicUrl: process.env.STORAGE_R2_PUBLIC_URL ?? '',
    },
    local: {
      uploadsPath: process.env.STORAGE_LOCAL_UPLOADS_PATH ?? './uploads',
    },
  },
});
