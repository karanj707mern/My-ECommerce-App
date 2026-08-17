const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`Missing .env at ${envPath}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function getCloudinaryConfig() {
  const cloudName = process.env.STORAGE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.STORAGE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.STORAGE_CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.STORAGE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are missing in .env');
  }

  return { cloudName, apiKey, apiSecret, uploadPreset };
}

function initCloudinary() {
  const config = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
  });
  console.log(`Cloudinary configured: cloudName=${config.cloudName}`);
}

async function uploadToCloudinary(buffer, filename, folder, prefix) {
  const targetFolder = folder;
  const uuid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const slug = prefix ? `${prefix}-${uuid}` : uuid;
  const publicId = `${targetFolder}/${slug}`;

  const base64 = `data:image/webp;base64,${buffer.toString('base64')}`;

  const uploadOptions = {
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
    format: 'webp',
    flags: 'progressive',
  };

  const uploadPreset = process.env.STORAGE_CLOUDINARY_UPLOAD_PRESET;
  if (uploadPreset) {
    uploadOptions.upload_preset = uploadPreset;
  }

  const result = await cloudinary.uploader.upload(base64, uploadOptions);
  return {
    url: result.secure_url,
    key: result.public_id,
  };
}

async function migrateProducts(backendDir, dryRun) {
  let migrated = 0;
  let failed = 0;

  const uploadsDir = path.join(backendDir, 'uploads', 'products');

  if (!fs.existsSync(uploadsDir)) {
    console.log('No products upload directory found.');
    return { migrated, failed };
  }

  const files = fs.readdirSync(uploadsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  });

  for (const file of files) {
    const dbKey = `/uploads/products/${file}`;

    const existing = await prisma.product.findFirst({
      where: { image: dbKey },
      select: { id: true, image: true },
    });

    if (!existing) {
      console.log(`Skipping ${file}: no DB record found with image=${dbKey}`);
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY RUN] Would migrate product ${existing.id} ${existing.image}`,
      );
      migrated++;
      continue;
    }

    try {
      const fullPath = path.join(uploadsDir, file);
      const buffer = fs.readFileSync(fullPath);

      const result = await uploadToCloudinary(
        buffer,
        file,
        'products',
        'product',
      );

      await prisma.product.update({
        where: { id: existing.id },
        data: { image: result.url },
      });

      console.log(`Migrated product ${existing.id}: ${dbKey} -> ${result.url}`);
      migrated++;
    } catch (error) {
      failed++;
      console.error(
        `Failed to migrate product ${existing.id} ${dbKey}:`,
        error.message || error,
      );
    }
  }

  return { migrated, failed };
}

async function migrateHeroImages(backendDir, dryRun) {
  let migrated = 0;
  let failed = 0;

  const uploadsDir = path.join(backendDir, 'uploads', 'hero');

  if (!fs.existsSync(uploadsDir)) {
    console.log('No hero upload directory found.');
    return { migrated, failed };
  }

  const files = fs.readdirSync(uploadsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  });

  for (const file of files) {
    const localUrl = `/uploads/hero/${file}`;

    let heroRecord = await prisma.heroImage.findFirst({
      where: { url: localUrl },
      select: { id: true, url: true },
    });

    if (!heroRecord) {
      heroRecord = await prisma.heroImage.create({
        data: {
          url: localUrl,
          alt: path.basename(file, path.extname(file)),
          sortOrder: 0,
          active: true,
        },
        select: { id: true, url: true },
      });
    }

    if (dryRun) {
      console.log(
        `[DRY RUN] Would migrate hero image ${heroRecord.id} ${heroRecord.url}`,
      );
      migrated++;
      continue;
    }

    try {
      const fullPath = path.join(uploadsDir, file);
      const buffer = fs.readFileSync(fullPath);

      const result = await uploadToCloudinary(
        buffer,
        file,
        'hero',
        'home-hero',
      );

      await prisma.heroImage.update({
        where: { id: heroRecord.id },
        data: { url: result.url },
      });

      console.log(
        `Migrated hero image ${heroRecord.id}: ${localUrl} -> ${result.url}`,
      );
      migrated++;
    } catch (error) {
      failed++;
      console.error(
        `Failed to migrate hero image ${heroRecord.id} ${localUrl}:`,
        error.message || error,
      );
    }
  }

  return { migrated, failed };
}

async function main() {
  console.log('=== Cloudinary Migration Script ===');

  const backendDir = process.cwd();
  if (!backendDir.endsWith('Moringa-Backend')) {
    console.warn(
      `Script should be run from Moringa-Backend directory. Current: ${backendDir}`,
    );
  }

  loadEnv();
  initCloudinary();

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log(
      'Running in DRY-RUN mode. No DB or Cloudinary changes will be made.\n',
    );
  }

  console.log('\nMigrating products...');
  const productResult = await migrateProducts(backendDir, dryRun);

  console.log('\nMigrating hero images...');
  const heroResult = await migrateHeroImages(backendDir, dryRun);

  console.log('\n=== Migration Summary ===');
  console.log(
    `Products: migrated=${productResult.migrated}, failed=${productResult.failed}`,
  );
  console.log(
    `Hero images: migrated=${heroResult.migrated}, failed=${heroResult.failed}`,
  );
  console.log(`Total failed=${productResult.failed + heroResult.failed}`);
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
