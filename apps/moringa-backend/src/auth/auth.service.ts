import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { SessionService } from './services/session.service';
import { DeviceInfoService, DeviceInfo } from './services/device-info.service';
import { EmailVerificationService } from './email-verification.service';
import { NotificationService } from '@/notification/notification.service';
import { AuthProvider, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomBytes } from 'crypto';
import { TokenRevocationService } from './services/token-revocation.service';

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  addresses: {
    isDefault: boolean;
    updatedAt: Date;
  }[];
}

interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly cache: RedisCacheService,
    private readonly sessionService: SessionService,
    private readonly deviceInfoService: DeviceInfoService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private generateVerificationToken() {
    const token = randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hashedToken };
  }

  private generatePasswordResetExpiry() {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private generateEmailVerificationExpiry() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private canSendVerificationEmail(user: { emailVerifyLastSentAt: Date | null }) {
    if (!user.emailVerifyLastSentAt) {
      return true;
    }
    return user.emailVerifyLastSentAt.getTime() <= Date.now() - 2 * 60 * 1000;
  }

  private async generateTokens(payload: {
    id: number;
    email: string;
    role: string;
  }) {
    const jti = crypto.randomUUID();
    const accessToken = await this.jwt.signAsync(
      { ...payload, jti },
      { expiresIn: '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti },
      { expiresIn: '7d' },
    );
    return { accessToken, refreshToken, jti };
  }

  async logout(userId: number): Promise<{ message: string }> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });

    for (const session of sessions) {
      await this.tokenRevocationService.revoke(session.id);
    }

    await this.prisma.session.deleteMany({
      where: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async verifyEmail(dto: { token: string }): Promise<{ message: string }> {
    const hashed = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: hashed },
    });

    if (
      !user?.emailVerifyTokenExpiresAt ||
      user.emailVerifyTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new Error('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerification(
    dto: { email: string },
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.isEmailVerified) {
      return {
        message: 'If account exists, email will be sent',
      };
    }

    if (!this.canSendVerificationEmail(user)) {
      return {
        message: 'Please wait before requesting another verification email',
      };
    }

    const { token, hashedToken } = this.generateVerificationToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashedToken,
        emailVerifyTokenExpiresAt: this.generateEmailVerificationExpiry(),
        emailVerifyLastSentAt: new Date(),
      },
    });

    await this.emailVerificationService.sendVerificationEmail(
      user.email,
      token,
      user.name,
      user.id,
    );

    return {
      message: 'Verification email sent',
    };
  }

  async forgotPassword(dto: { email: string }): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If account exists, reset link will be sent',
      };
    }

    if (user.authProvider === AuthProvider.GOOGLE) {
      return {
        message: 'If account exists, reset link will be sent',
      };
    }

    const { token, hashedToken } = this.generateVerificationToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: this.generatePasswordResetExpiry(),
      },
    });

    await this.emailVerificationService.sendPasswordResetEmail(
      user.email,
      token,
      user.name,
      user.id,
    );

    return {
      message: 'If account exists, reset link will be sent',
    };
  }

  async resetPassword(dto: { token: string; password: string }): Promise<{ message: string; email: string }> {
    const hashed = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: hashed },
    });

    if (
      !user?.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new Error('Invalid or expired token');
    }

    const password = await bcrypt.hash(dto.password, 10);

    await this.prisma.session.deleteMany({ where: { userId: user.id } });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    return {
      message: 'Password reset successful',
      email: user.email,
    };
  }

  private getSafeUserSelect(): Prisma.UserSelect {
    return {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneNumber: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      avatar: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        orderBy: [
          { isDefault: 'desc' as const },
          { updatedAt: 'desc' as const },
        ],
      },
    };
  }

  private async buildAuthResponse(
    userId: number,
    message: string,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.getSafeUserSelect(),
    });

    if (!user) {
      throw new Error('User not found');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken, jti } = await this.generateTokens(payload);
    await this.createSession(user.id, refreshToken, deviceInfo, jti);

    return { message, accessToken, refreshToken, user: user as SafeUser };
  }

  private async createSession(
    userId: number,
    refreshToken: string,
    deviceInfo?: DeviceInfo,
    jti?: string,
  ) {
    await this.sessionService.createSession(userId, refreshToken, deviceInfo, jti);
  }

  async getProfile(userId: number): Promise<{ message: string; user: SafeUser }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.getSafeUserSelect(),
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'Profile loaded', user: user as SafeUser };
  }

  async updateProfile(
    userId: number,
    dto: {
      name?: string;
      phoneNumber?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      avatar?: string;
    },
  ): Promise<{ message: string; user: SafeUser }> {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1.trim() || null;
    if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.state !== undefined) data.state = dto.state.trim() || null;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode.trim() || null;
    if (dto.country !== undefined) data.country = dto.country.trim() || null;
    if (dto.avatar !== undefined) data.avatar = dto.avatar.trim() || null;

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  async listAddresses(userId: number) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createAddress(
    userId: number,
    dto: {
      label: string;
      recipientName: string;
      phoneNumber: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault?: boolean;
    },
  ): Promise<{ message: string; user: SafeUser }> {
    await this.prisma.userAddress.create({
      data: { ...dto, userId },
    });

    return this.getProfile(userId);
  }

  async updateAddress(
    userId: number,
    id: number,
    dto: {
      label?: string;
      recipientName?: string;
      phoneNumber?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      isDefault?: boolean;
    },
  ): Promise<{ message: string; user: SafeUser }> {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    await this.prisma.userAddress.update({
      where: { id },
      data: dto,
    });

    return this.getProfile(userId);
  }

  async removeAddress(
    userId: number,
    id: number,
  ): Promise<{ message: string; user: SafeUser }> {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    await this.prisma.userAddress.delete({ where: { id } });
    return this.getProfile(userId);
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async login(dto: { email: string; password: string; captchaId?: string; captchaInput?: string }): Promise<{ message: string; accessToken: string; refreshToken: string; user: SafeUser }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.authProvider === AuthProvider.GOOGLE) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    const result = await this.buildAuthResponse(user.id, 'Login successful');
    await this.notificationService.create({
      userId: user.id,
      type: 'LOGIN_ALERT',
      channel: 'EMAIL',
      recipient: user.email,
      subject: 'New login detected',
      body: 'Your account was just logged in. If this was not you, please secure your account.',
      status: 'PENDING',
      scheduledAt: new Date(),
      maxAttempts: 3,
    });

    return result;
  }

  async register(dto: { name: string; email: string; password: string; captchaId?: string; captchaInput?: string }): Promise<{ message: string; accessToken: string; refreshToken: string; user: SafeUser }> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new Error('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const { token, hashedToken } = this.generateVerificationToken();

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password,
        emailVerifyToken: hashedToken,
        emailVerifyTokenExpiresAt: this.generateEmailVerificationExpiry(),
        emailVerifyLastSentAt: new Date(),
      },
      select: this.getSafeUserSelect(),
    });

    await this.emailVerificationService.sendVerificationEmail(
      email,
      token,
      user.name,
      user.id,
    );

    const result = await this.buildAuthResponse(user.id, 'Registration successful');
    return result;
  }

  async getSession(accessToken?: string, refreshToken?: string): Promise<{ authenticated: boolean; user: SafeUser | null }> {
    if (!accessToken && !refreshToken) {
      return { authenticated: false, user: null };
    }

    try {
      const token = accessToken || refreshToken;
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: this.getSafeUserSelect(),
      });

      return { authenticated: true, user: user as SafeUser };
    } catch {
      return { authenticated: false, user: null };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    const session = await this.sessionService.findSessionByRefreshToken(0, refreshToken);

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    const payload = await this.jwt.verifyAsync(refreshToken, {
      secret: this.configService.get<string>('app.jwtSecret'),
    });

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: Buffer.from(newRefreshToken).toString('base64'),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    return {
      message: 'Token refreshed',
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
