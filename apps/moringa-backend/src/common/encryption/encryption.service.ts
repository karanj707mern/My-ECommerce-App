import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptedValue {
  encrypted: string;
  iv: string;
  tag?: string;
}

@Injectable()
export class EncryptionService implements OnModuleDestroy {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      throw new Error('ENCRYPTION_KEY environment variable is required for field-level encryption');
    }
    this.key = crypto.scryptSync(secret, 'salt', this.keyLength);
  }

  encrypt(plaintext: string): EncryptedValue {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipherGCM(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(data: EncryptedValue): string {
    const decipher = crypto.createDecipherGCM(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(data.tag!, 'hex'));
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptFields<T extends Record<string, unknown>>(
    dto: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...dto };
    for (const field of fields) {
      if (typeof result[field] === 'string' && result[field]) {
        const encrypted = this.encrypt(result[field] as string);
        result[field] = `${encrypted.iv}:${encrypted.tag}:${encrypted.encrypted}`;
      }
    }
    return result as T;
  }

  decryptFields<T extends Record<string, unknown>>(
    dto: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...dto };
    for (const field of fields) {
      const value = result[field] as string | undefined;
      if (value && value.includes(':')) {
        const [iv, tag, encrypted] = value.split(':');
        result[field] = this.decrypt({ encrypted, iv, tag });
      }
    }
    return result as T;
  }

  onModuleDestroy() {
    // No persistent resources to clean up
  }
}
