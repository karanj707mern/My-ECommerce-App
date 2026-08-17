/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';
import type { File as MulterFile } from 'multer';
import * as crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

const QUALITY = 80;
const MAX_DIMENSION = 1200;

@Injectable()
export class StorageService {
  private readonly provider: 'cloudinary' | 'local';

  get isCloudinaryProvider(): boolean {
    return this.provider === 'cloudinary';
  }
  private readonly cloudName: string | null = null;
  private readonly apiKey: string | null = null;
  private readonly apiSecret: string | null = null;
  private readonly folder: string | null = null;
  private readonly publicUrl: string | null = null;
  private readonly uploadPreset: string | null = null;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    // Cloudinary is now the primary provider
    this.provider = this.configService.get<string>(
      'storage.provider',
      'cloudinary',
    ) as 'cloudinary' | 'local';

    this.cloudName = this.configService.get<string>(
      'storage.cloudinary.cloudName',
      '',
    );
    this.apiKey = this.configService.get<string>(
      'storage.cloudinary.apiKey',
      '',
    );
    this.apiSecret = this.configService.get<string>(
      'storage.cloudinary.apiSecret',
      '',
    );
    this.folder = this.configService.get<string>(
      'storage.cloudinary.folder',
      'moringa-store',
    );
    this.publicUrl = this.configService.get<string>(
      'storage.cloudinary.publicUrl',
      '',
    );
    this.uploadPreset = this.configService.get<string>(
      'storage.cloudinary.uploadPreset',
      '',
    );

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
      });
      this.logger.log(
        `Cloudinary configured: cloudName=${this.cloudName}, folder=${this.folder}`,
      );
    } else {
      this.logger.warn(
        'Cloudinary credentials missing; uploads will fall back to local storage',
      );
    }
  }

  async uploadFile(
    file: MulterFile,
    folder?: string,
    prefix?: string,
  ): Promise<{ url: string; key: string }> {
    await this.validateImage(file.buffer);

    // Make Cloudinary the primary; fall back to local on failure or if not configured.
    if (this.cloudName && this.apiKey && this.apiSecret) {
      try {
        this.logger.debug('Attempting Cloudinary upload');
        return await this.uploadToCloudinary(file, folder, prefix);
      } catch (error) {
        this.logger.warn(
          `Cloudinary upload failed, falling back to local storage: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.debug('Using local storage upload');
    return this.uploadLocal(file, folder, prefix);
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      return this.deleteLocal(key);
    }

    try {
      await cloudinary.uploader.destroy(key, { resource_type: 'image' });
      this.logger.log(`Deleted file from Cloudinary: ${key}`);
      return;
    } catch (error) {
      this.logger.warn(
        `Cloudinary delete failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Fallback to local deletion only if not already known as Cloudinary URL
    if (!key.includes('/')) {
      return this.deleteLocal(key);
    }
  }

  getSignedUrl(key: string): string {
    if (
      this.cloudName &&
      this.apiKey &&
      this.apiSecret &&
      this.isCloudinaryUrl(key)
    ) {
      return key;
    }

    const deliveredUrl =
      this.publicUrl ||
      `https://res.cloudinary.com/${this.cloudName}/image/upload`;

    if (this.isCloudinaryUrl(key)) {
      return key;
    }

    return `/uploads/${key}`;
  }

  // Cloudinary doesn't expose directory listing from here; combine local filesystem
  // with any remotely-known entries from DB or existing metadata elsewhere.
  listFiles(folder: string): string[] {
    const sanitizedFolder = folder
      .replace(/^(\.\.(\/)?|(\/\.\.)+|\/\.{1,2}$)/, '')
      .replace(/[\\]+/g, '/');
    const uploadsPath = join(process.cwd(), 'uploads', sanitizedFolder);

    if (!existsSync(uploadsPath)) {
      return [];
    }

    return readdirSync(uploadsPath).filter((file) => {
      const ext = extname(file).toLowerCase();
      return ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });
  }

  private async uploadToCloudinary(
    file: MulterFile,
    folder?: string,
    prefix?: string,
  ): Promise<{ url: string; key: string }> {
    const targetFolder = folder || this.folder || 'moringa-store';
    const publicId = this.buildPublicId(targetFolder, prefix);
    const optimizedBuffer = await this.optimizeImage(file.buffer);

    const uploadOptions: Record<string, unknown> = {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      format: 'webp',
      flags: 'progressive',
    };

    if (this.uploadPreset) {
      uploadOptions.upload_preset = this.uploadPreset;
    }

    const result = await cloudinary.uploader.upload(
      `data:image/webp;base64,${optimizedBuffer.toString('base64')}`,
      uploadOptions,
    );

    return {
      url: result.secure_url,
      key: result.public_id,
    };
  }

  private async uploadLocal(
    file: MulterFile,
    folder?: string,
    prefix?: string,
  ): Promise<{ url: string; key: string }> {
    await this.validateImage(file.buffer);

    const sanitizedFolder = folder
      ? folder
          .replace(/^(\.\.(\/)?|(\/\.\.)+|\/\.{1,2}$)/, '')
          .replace(/[\\]+/g, '/')
      : '';
    const uploadsPath = join(process.cwd(), 'uploads', sanitizedFolder);
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }

    const filename = this.generateFilename(sanitizedFolder, prefix);
    const filepath = join(uploadsPath, filename);

    const optimizedBuffer = await this.optimizeImage(file.buffer);
    writeFileSync(filepath, optimizedBuffer);

    return {
      url: `/uploads/${sanitizedFolder ? sanitizedFolder + '/' : ''}${filename}`,
      key: sanitizedFolder ? `${sanitizedFolder}/${filename}` : filename,
    };
  }

  private generateFilename(folder?: string, prefix?: string): string {
    const sanitizedFolder = folder
      ? folder
          .replace(/^(\.\.(\/)?|(\/\.\.)+|\/\.{1,2}$)/, '')
          .replace(/[\\]+/g, '/')
      : '';
    if (!prefix) {
      const uniqueSuffix = `${Date.now()}-${crypto.randomInt(0, 1e9).toString()}`;
      return `${uniqueSuffix}.webp`;
    }

    const uploadsPath = join(process.cwd(), 'uploads', sanitizedFolder);
    let maxNumber = 0;

    if (existsSync(uploadsPath)) {
      const files = readdirSync(uploadsPath);
      const pattern = new RegExp(`^${prefix}-(\\d+)\\.webp$`, 'i');
      for (const file of files) {
        const match = file.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    return `${prefix}-${maxNumber + 1}.webp`;
  }

  private async validateImage(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.format) {
        throw new BadRequestException('Invalid image file');
      }
    } catch {
      throw new BadRequestException('Invalid image file');
    }
  }

  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer();
  }

  private deleteLocal(key: string): void {
    const sanitizedKey = key
      .replace(/^(\.\.(\/)?|(\/\.\.)+|\/\.{1,2}$)/, '')
      .replace(/[\\]+/g, '/');
    const filepath = join(process.cwd(), 'uploads', sanitizedKey);
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }
  }

  private buildPublicId(folder: string, prefix?: string): string {
    const sanitizedFolder = folder
      ? folder
          .replace(/^(\.\.(\/)?|(\/\.\.)+|\/\.{1,2}$)/, '')
          .replace(/[\\]+/g, '/')
      : '';
    const slug = prefix
      ? prefix
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : `${Date.now()}-${crypto.randomInt(0, 1e9).toString()}`;

    return `${sanitizedFolder}/${slug}`;
  }

  private isCloudinaryUrl(url: string): boolean {
    return (
      url.includes('res.cloudinary.com') ||
      url.includes('cloudinary.com') ||
      (this.publicUrl ? url.startsWith(this.publicUrl) : false)
    );
  }
}
