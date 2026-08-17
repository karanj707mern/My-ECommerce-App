import sharp from 'sharp';
import { readdir, stat, unlink } from 'fs/promises';
import { join, basename } from 'path';

const BACKEND_UPLOADS_DIR = join(process.cwd(), 'uploads');
const FRONTEND_IMAGES_DIR = join(
  process.cwd(),
  '..',
  'Moringa-Frontend',
  'public',
  'images',
);
const QUALITY = 80;
const MAX_DIMENSION = 1200;

async function convertToWebp(filePath: string): Promise<void> {
  const webpPath = filePath.replace(
    /\.(png|jpe?g|gif|bmp|avif|webp)$/i,
    '.webp',
  );

  try {
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    await sharp(filePath)
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    const originalSize = (await stat(filePath)).size;
    const webpSize = (await stat(webpPath)).size;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);

    console.log(
      `✓ ${basename(filePath)} -> ${basename(webpPath)} (${(originalSize / 1024).toFixed(1)}KB -> ${(webpSize / 1024).toFixed(1)}KB, ${savings}% smaller)`,
    );

    await unlink(filePath);
    console.log(`  Deleted original: ${basename(filePath)}`);
  } catch (error) {
    console.error(`✗ Failed to convert ${filePath}:`, error);
  }
}

async function processDirectory(dir: string, label: string): Promise<number> {
  let count = 0;

  async function walk(targetDir: string): Promise<void> {
    const entries = await readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (/\.(png|jpe?g|gif|bmp|avif|webp)$/i.test(entry.name)) {
        await convertToWebp(fullPath);
        count++;
      }
    }
  }

  try {
    await walk(dir);
  } catch (error) {
    console.error(`Error processing ${label}:`, error);
  }

  return count;
}

async function main() {
  console.log('Starting WebP conversion for all images...\n');

  const backendCount = await processDirectory(
    BACKEND_UPLOADS_DIR,
    'backend uploads',
  );
  console.log(`\nBackend uploads converted: ${backendCount}`);

  const frontendCount = await processDirectory(
    FRONTEND_IMAGES_DIR,
    'frontend images',
  );
  console.log(`Frontend images converted: ${frontendCount}`);

  console.log(
    `\nAll conversions complete! Total: ${backendCount + frontendCount} images`,
  );
}

main();
