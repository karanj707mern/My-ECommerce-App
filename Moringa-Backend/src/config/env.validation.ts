const NODE_ENVS = ['development', 'test', 'production'] as const;

function getString(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function requireEnv(config: Record<string, unknown>, key: string) {
  const value = getString(config, key);

  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

function parseNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const rawValue = getString(config, key);

  if (!rawValue) {
    config[key] = fallback;
    return;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  config[key] = parsedValue;
}

function parseBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const rawValue = getString(config, key).toLowerCase();

  if (!rawValue) {
    config[key] = fallback;
    return;
  }

  if (rawValue === 'true') {
    config[key] = true;
    return;
  }

  if (rawValue === 'false') {
    config[key] = false;
    return;
  }

  throw new Error(`Environment variable ${key} must be true or false`);
}

export function validateEnv(config: Record<string, unknown>) {
  const nodeEnv = getString(config, 'NODE_ENV') || 'development';

  if (!NODE_ENVS.includes(nodeEnv as (typeof NODE_ENVS)[number])) {
    throw new Error(
      'Environment variable NODE_ENV must be one of development, test, production',
    );
  }

  config.NODE_ENV = nodeEnv;

  requireEnv(config, 'DATABASE_URL');
  requireEnv(config, 'JWT_SECRET');
  requireEnv(config, 'FRONTEND_URL');

  parseNumber(config, 'PORT', 5000);
  parseNumber(config, 'SMTP_PORT', 587);
  parseNumber(config, 'REDIS_CACHE_TTL_SECONDS', 300);
  parseNumber(config, 'NOTIFICATION_RETRY_INTERVAL_MS', 60000);
  parseNumber(config, 'NOTIFICATION_MAX_ATTEMPTS', 3);
  parseBoolean(config, 'SMTP_SECURE', false);

  parseNumber(config, 'RABBITMQ_PORT', 5672);
  getString(config, 'RABBITMQ_URL');
  getString(config, 'RABBITMQ_HOST');
  getString(config, 'RABBITMQ_USER');
  getString(config, 'RABBITMQ_PASS');
  getString(config, 'RABBITMQ_VHOST');

  const smtpHost = getString(config, 'SMTP_HOST');
  const smtpUser = getString(config, 'SMTP_USER');
  const smtpPass = getString(config, 'SMTP_PASS');
  const emailFrom = getString(config, 'EMAIL_FROM');
  const razorpayKeyId = getString(config, 'RAZORPAY_KEY_ID');
  const razorpayKeySecret = getString(config, 'RAZORPAY_KEY_SECRET');
  const razorpayWebhookSecret = getString(config, 'RAZORPAY_WEBHOOK_SECRET');
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']) {
      requireEnv(config, key);
    }
  } else {
    if (smtpHost) {
      requireEnv(config, 'SMTP_USER');
      requireEnv(config, 'SMTP_PASS');
      requireEnv(config, 'EMAIL_FROM');
    }

    config.SMTP_HOST = smtpHost;
    config.SMTP_USER = smtpUser;
    config.SMTP_PASS = smtpPass;
    config.EMAIL_FROM = emailFrom;
  }

  if (isProduction) {
    for (const key of [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ]) {
      requireEnv(config, key);
    }
  } else {
    config.RAZORPAY_KEY_ID = razorpayKeyId;
    config.RAZORPAY_KEY_SECRET = razorpayKeySecret;
    config.RAZORPAY_WEBHOOK_SECRET = razorpayWebhookSecret;
  }

  const storageProvider = getString(config, 'STORAGE_PROVIDER');

  if (storageProvider) {
    if (!['local', 'cloudinary', 'r2'].includes(storageProvider)) {
      throw new Error(
        'Environment variable STORAGE_PROVIDER must be local, r2, or cloudinary',
      );
    }

    config.STORAGE_PROVIDER = storageProvider;
  }

  if (storageProvider === 'r2') {
    const endpointKey = 'STORAGE_R2_ENDPOINT';
    const regionKey = 'STORAGE_R2_REGION';
    const accessKeyIdKey = 'STORAGE_R2_ACCESS_KEY_ID';
    const secretAccessKeyKey = 'STORAGE_R2_SECRET_ACCESS_KEY';
    const bucketKey = 'STORAGE_R2_BUCKET';

    requireEnv(config, endpointKey);
    requireEnv(config, regionKey);
    requireEnv(config, accessKeyIdKey);
    requireEnv(config, secretAccessKeyKey);
    requireEnv(config, bucketKey);
  }

  if (storageProvider === 'cloudinary') {
    requireEnv(config, 'STORAGE_CLOUDINARY_CLOUD_NAME');
    requireEnv(config, 'STORAGE_CLOUDINARY_API_KEY');
    requireEnv(config, 'STORAGE_CLOUDINARY_API_SECRET');
    getString(config, 'STORAGE_CLOUDINARY_FOLDER');
    getString(config, 'STORAGE_CLOUDINARY_PUBLIC_URL');
    getString(config, 'STORAGE_CLOUDINARY_UPLOAD_PRESET');
  }

  if (storageProvider === 'local') {
    const uploadsPath =
      getString(config, 'STORAGE_LOCAL_UPLOADS_PATH') || './uploads';
    config.STORAGE_LOCAL_UPLOADS_PATH = uploadsPath;
  }

  getString(config, 'STORAGE_R2_PUBLIC_URL');
  getString(config, 'STORAGE_CLOUDINARY_PUBLIC_URL');

  return config;
}
