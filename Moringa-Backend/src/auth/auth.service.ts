import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

import { ConfigService } from '@nestjs/config';
import { EmailVerificationService } from './email-verification.service';
import { NotificationService } from '@/notification/notification.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { SessionService } from './services/session.service';
import { DeviceInfoService, DeviceInfo } from './services/device-info.service';

interface UserForVerification {
  emailVerifyLastSentAt: Date | null;
}

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: string;
  aud: string;
  name?: string;
}

interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
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
  };
}

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
  ) {}

  // ---------------- HELPERS ----------------

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

  private canSendVerificationEmail(user: UserForVerification) {
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
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = await this.jwt.signAsync(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  async logout(userId: number): Promise<{ message: string }> {
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

  async logoutByRefreshToken(
    refreshToken?: string,
  ): Promise<{ message: string }> {
    if (!refreshToken) {
      return {
        message: 'Logged out successfully',
      };
    }

    try {
      const payload = await this.jwt.verifyAsync<{ id?: number }>(refreshToken);

      if (payload.id) {
        const hashed = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        await this.prisma.session.deleteMany({
          where: { userId: payload.id, refreshToken: hashed },
        });
      }
    } catch {
      // Expired or invalid refresh cookies should still be cleared by the controller.
    }

    return {
      message: 'Logged out successfully',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const hashed = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: hashed },
    });

    if (
      !user?.emailVerifyTokenExpiresAt ||
      user.emailVerifyTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Invalid or expired token');
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
    dto: ResendVerificationDto,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
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

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ message: string; email: string }> {
    const hashed = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: hashed },
    });

    if (
      !user?.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new NotFoundException('Invalid or expired token');
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
      throw new NotFoundException('User not found');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = await this.generateTokens(payload);
    await this.createSession(user.id, refreshToken, deviceInfo);

    return { message, accessToken, refreshToken, user };
  }

  private async createSession(
    userId: number,
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ) {
    await this.sessionService.createSession(userId, refreshToken, deviceInfo);
  }

  async listSessions(userId: number) {
    return this.sessionService.listSessions(userId);
  }

  async revokeSession(userId: number, sessionId: string) {
    return this.sessionService.revokeSession(userId, sessionId);
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

  // ---------------- REGISTER ----------------

  async register(dto: RegisterDto): Promise<{
    message: string;
    requiresEmailVerification: boolean;
    verificationUrl?: string;
  }> {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.authProvider === AuthProvider.GOOGLE) {
        throw new ConflictException('Use Google sign-in for this email');
      }
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const { token, hashedToken } = this.generateVerificationToken();

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hashedPassword,
        role: 'USER',
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: false,
        emailVerifyToken: hashedToken,
        emailVerifyTokenExpiresAt: this.generateEmailVerificationExpiry(),
        emailVerifyLastSentAt: new Date(),
      },
    });

    const verificationUrl =
      await this.emailVerificationService.sendVerificationEmail(
        user.email,
        token,
        user.name,
        user.id,
      );

    return {
      message:
        'User registered successfully. Verify your email before logging in.',
      requiresEmailVerification: true,
      verificationUrl:
        process.env.NODE_ENV === 'production' ? undefined : verificationUrl,
    };
  }

  // ---------------- LOGIN ----------------

  async login(dto: LoginDto, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified && user.role !== 'ADMIN') {
      throw new UnauthorizedException('Please verify email first');
    }

    void this.emailVerificationService.sendLoginAlert(
      user.email,
      user.name,
      user.id,
      deviceInfo,
    );

    return this.buildAuthResponse(user.id, 'Login successful', deviceInfo);
  }

  // ---------------- GOOGLE AUTH ----------------

  private async verifyGoogleCredential(credential: string) {
    const clientId = this.configService.get<string>('app.googleClientId');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
        { signal: controller.signal },
      );

      if (!res.ok) {
        const errorText = await res
          .text()
          .catch(() => 'Google token verification failed');
        throw new UnauthorizedException(`Invalid Google token: ${errorText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: GoogleTokenInfo = await res.json();

      if (!data.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }
      if (!data.email) {
        throw new UnauthorizedException('Missing email');
      }
      if (data.email_verified !== 'true') {
        throw new UnauthorizedException('Email not verified');
      }

      if (data.aud !== clientId) {
        throw new UnauthorizedException('Invalid audience');
      }

      return {
        googleId: data.sub,
        email: this.normalizeEmail(data.email),
        name: data.name || 'Google User',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async googleAuth(
    dto: GoogleAuthDto,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const profile = await this.verifyGoogleCredential(dto.credential);

    const googleUser = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (googleUser) {
      void this.emailVerificationService.sendLoginAlert(
        googleUser.email,
        googleUser.name,
        googleUser.id,
        deviceInfo,
      );

      return this.buildAuthResponse(
        googleUser.id,
        'Google login success',
        deviceInfo,
      );
    }

    const emailUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (emailUser) {
      if (emailUser.authProvider === AuthProvider.GOOGLE) {
        void this.emailVerificationService.sendLoginAlert(
          emailUser.email,
          emailUser.name,
          emailUser.id,
          deviceInfo,
        );

        return this.buildAuthResponse(
          emailUser.id,
          'Google login success',
          deviceInfo,
        );
      }

      throw new UnauthorizedException(
        'This email is already registered with password login. Please sign in with your password, or use the account linking option to connect Google sign-in.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        password: await bcrypt.hash(this.generateRandomPassword(), 10),
        role: 'USER',
        isEmailVerified: true,
      },
    });

    return this.buildAuthResponse(
      user.id,
      'Google account created',
      deviceInfo,
    );
  }

  private generateRandomPassword() {
    return randomBytes(32).toString('hex');
  }

  // ---------------- REFRESH ----------------

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.jwt.verifyAsync<{ id: number }>(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const hashed = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const session = await this.sessionService.findSessionByRefreshToken(
      user.id,
      hashed,
    );

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

    const newHashed = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id, refreshToken: hashed },
        data: {
          refreshToken: newHashed,
          expiresAt: newExpiresAt,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          refreshToken: newHashed,
          refreshTokenExpiresAt: newExpiresAt,
        },
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: this.getSafeUserSelect(),
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Token refreshed',
      accessToken,
      refreshToken: newRefreshToken,
      user: updatedUser,
    };
  }

  async getSession(
    accessToken?: string,
    refreshToken?: string,
  ): Promise<{
    authenticated: boolean;
    refreshed: boolean;
    user: SafeUser | null;
    accessToken?: string;
    refreshToken?: string;
  }> {
    if (accessToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ id?: number }>(
          accessToken,
        );

        if (payload.id) {
          const session = await this.prisma.session.findFirst({
            where: {
              userId: payload.id,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
          });

          if (!session) {
            return {
              authenticated: false,
              refreshed: false,
              user: null,
            };
          }

          const profile = await this.getProfile(payload.id);
          return {
            authenticated: true,
            refreshed: false,
            user: profile.user,
          };
        }
      } catch {
        // Fall through to refresh-token recovery below.
      }
    }

    if (!refreshToken) {
      return {
        authenticated: false,
        refreshed: false,
        user: null,
      };
    }

    const refreshedSession = await this.refreshAccessToken(refreshToken);

    return {
      authenticated: true,
      refreshed: true,
      user: refreshedSession.user,
      accessToken: refreshedSession.accessToken,
      refreshToken: refreshedSession.refreshToken,
    };
  }

  // ---------------- PROFILE ----------------

  async getProfile(
    userId: number,
  ): Promise<{ message: string; user: SafeUser }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.getSafeUserSelect(),
    });

    if (!user) {
      throw new NotFoundException();
    }

    return { message: 'Profile loaded', user };
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<{ message: string; user: SafeUser }> {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phoneNumber !== undefined)
      data.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.addressLine1 !== undefined)
      data.addressLine1 = dto.addressLine1.trim() || null;
    if (dto.addressLine2 !== undefined)
      data.addressLine2 = dto.addressLine2.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.state !== undefined) data.state = dto.state.trim() || null;
    if (dto.postalCode !== undefined)
      data.postalCode = dto.postalCode.trim() || null;
    if (dto.country !== undefined) data.country = dto.country.trim() || null;
    if (dto.avatar !== undefined) data.avatar = dto.avatar.trim() || null;

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  // ---------------- ADDRESSES ----------------

  async listAddresses(userId: number) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createAddress(
    userId: number,
    dto: CreateUserAddressDto,
  ): Promise<{ message: string; user: SafeUser }> {
    await this.prisma.userAddress.create({
      data: { ...dto, userId },
    });

    return this.getProfile(userId);
  }

  async updateAddress(
    userId: number,
    id: number,
    dto: UpdateUserAddressDto,
  ): Promise<{ message: string; user: SafeUser }> {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
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
      throw new NotFoundException('Address not found');
    }

    await this.prisma.userAddress.delete({ where: { id } });
    return this.getProfile(userId);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
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

  async mergeGuestData(
    userId: number,
    guestToken: string,
  ): Promise<{ message: string }> {
    await this.prisma.$transaction(async (tx) => {
      const guestCartItems = await tx.cartItem.findMany({
        where: {
          guestCartToken: guestToken,
          createdAt: { gt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });

      for (const guestItem of guestCartItems) {
        const existingItem = await tx.cartItem.findUnique({
          where: {
            userId_productId: {
              userId,
              productId: guestItem.productId,
            },
          },
        });

        const product = await tx.product.findUnique({
          where: { id: guestItem.productId },
        });

        if (!product || product.stock <= 0) {
          continue;
        }

        const nextQuantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
        if (nextQuantity > product.stock) {
          continue;
        }

        if (existingItem) {
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: nextQuantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              userId,
              productId: guestItem.productId,
              quantity: guestItem.quantity,
            },
          });
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          guestCartToken: guestToken,
          createdAt: { gt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });

      const guestWishlistItems = await tx.wishlist.findMany({
        where: {
          guestWishlistToken: guestToken,
          createdAt: { gt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
        select: { productId: true },
      });

      for (const item of guestWishlistItems) {
        await tx.wishlist.upsert({
          where: {
            userId_productId: {
              userId,
              productId: item.productId,
            },
          },
          update: {},
          create: {
            userId,
            productId: item.productId,
          },
        });
      }

      await tx.wishlist.deleteMany({
        where: {
          guestWishlistToken: guestToken,
          createdAt: { gt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });
    });

    return { message: 'Guest data merged' };
  }

  async deleteAccount(
    userId: number,
    dto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'Account deleted successfully' };
  }
}
