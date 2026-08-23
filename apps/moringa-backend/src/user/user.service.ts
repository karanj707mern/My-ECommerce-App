import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CaptchaService } from '@/auth/services/captcha.service';

export interface DeviceInfo {
  ip?: string;
  country?: string;
  city?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
}

@Injectable()
export class UserService {
  private readonly safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isEmailVerified: true,
    authProvider: true,
    phoneNumber: true,
    addressLine1: true,
    addressLine2: true,
    city: true,
    state: true,
    postalCode: true,
    country: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly captchaService: CaptchaService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  create(createUserDto: CreateUserDto) {
    return bcrypt.hash(createUserDto.password, 10).then((hashedPassword) =>
      this.prisma.user.create({
        data: {
          name: createUserDto.name.trim(),
          email: this.normalizeEmail(createUserDto.email),
          password: hashedPassword,
        },
        select: this.safeUserSelect,
      }),
    );
  }

  findAll() {
    return this.prisma.user.findMany({
      select: this.safeUserSelect,
    });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    captchaId?: string,
    captchaInput?: string,
    deviceInfo?: {
      ip?: string;
      country?: string;
      city?: string;
      userAgent?: string;
      browser?: string;
      os?: string;
      device?: string;
    },
  ) {
    // Check if we're modifying sensitive fields
    const sensitiveFields = ['email', 'password'];
    const isModifyingSensitive = sensitiveFields.some(
      (field) => updateUserDto[field as keyof UpdateUserDto] !== undefined,
    );

    // If modifying sensitive fields, require CAPTCHA verification
    if (isModifyingSensitive) {
      if (!captchaId || !captchaInput) {
        throw new BadRequestException(
          'CAPTCHA verification is required for security changes',
        );
      }

      const isValid = await this.captchaService.verifyCaptcha(
        captchaId,
        captchaInput,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid or expired CAPTCHA');
      }
    }

    const data: Record<string, unknown> = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name.trim();
    }

    if (updateUserDto.email !== undefined) {
      data.email = this.normalizeEmail(updateUserDto.email);
    }

    if (updateUserDto.password !== undefined) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const result = await this.prisma.user.update({
      where: { id },
      data,
      select: this.safeUserSelect,
    });

    // Log security audit for sensitive changes
    if (isModifyingSensitive && deviceInfo) {
      this.logSecurityAudit(
        id,
        {
          emailChanged: updateUserDto.email !== undefined,
          passwordChanged: updateUserDto.password !== undefined,
        },
        deviceInfo,
      );
    }

    return result;
  }

  private logSecurityAudit(
    userId: number,
    changes: Record<string, unknown>,
    deviceInfo: {
      ip?: string;
      country?: string;
      city?: string;
      userAgent?: string;
      browser?: string;
      os?: string;
      device?: string;
    },
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      changes,
      deviceInfo: {
        ip: deviceInfo.ip || 'unknown',
        country: deviceInfo.country || null,
        city: deviceInfo.city || null,
        userAgent: deviceInfo.userAgent || null,
        browser: deviceInfo.browser || null,
        os: deviceInfo.os || null,
        device: deviceInfo.device || null,
      },
    };

    console.log('SECURITY AUDIT LOG:', JSON.stringify(logEntry, null, 2));
  }

  remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
      select: this.safeUserSelect,
    });
  }
}
