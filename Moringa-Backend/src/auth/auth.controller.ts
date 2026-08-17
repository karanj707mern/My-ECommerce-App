import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConsumes } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import type { SafeUser } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { AuthCookiesService } from './services/auth-cookies.service';
import { DeviceInfoService } from './services/device-info.service';
import { CaptchaService } from './services/captcha.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import type { File as MulterFile } from 'multer';
import { randomBytes } from 'crypto';

const allowedImageMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly cookiesService: AuthCookiesService,
    private readonly deviceInfoService: DeviceInfoService,
    private readonly captchaService: CaptchaService,
  ) {}

  private getAuthCookieOptions(maxAge: number): Record<string, unknown> {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
    };
  }

  // ---------------------------------------------------------------------------
  // CAPTCHA
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Get('captcha')
  @ApiOperation({ summary: 'Generate a new CAPTCHA' })
  @ApiResponse({ status: 200, description: 'CAPTCHA generated successfully' })
  async generateCaptcha() {
    const captcha = await this.captchaService.generateCaptcha();
    return {
      captchaId: captcha.text,
      image: captcha.data,
    };
  }

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login user with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: { type: 'object' },
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Body('captchaId') captchaId?: string,
    @Body('captchaInput') captchaInput?: string,
    @Req() req?: Request & { guestToken?: string },
    @Res() res?: Response,
  ) {
    if (!captchaId || !captchaInput) {
      throw new BadRequestException('CAPTCHA verification is required');
    }

    const isValid = await this.captchaService.verifyCaptcha(
      captchaId,
      captchaInput,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid or expired CAPTCHA');
    }

    const deviceInfo = this.deviceInfoService.extractDeviceInfo(req!);
    const guestToken = req?.guestToken;
    const result = await this.authService.login(dto, deviceInfo);

    this.cookiesService.setAuthCookies(
      res!,
      result.accessToken,
      result.refreshToken,
    );

    if (guestToken) {
      await this.authService.mergeGuestData(result.user.id, guestToken);
    }

    return res!.json({
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  // ---------------------------------------------------------------------------
  // GOOGLE AUTH
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('google')
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  @ApiBody({ type: GoogleAuthDto })
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() req: Request & { guestToken?: string },
    @Res() res: Response,
  ) {
    const deviceInfo = this.deviceInfoService.extractDeviceInfo(req);
    const guestToken = req.guestToken;
    const result = await this.authService.googleAuth(dto, deviceInfo);

    this.cookiesService.setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
    );

    if (guestToken) {
      await this.authService.mergeGuestData(result.user.id, guestToken);
    }

    return res.json({
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req()
    req: Request & {
      user?: { id: number };
      cookies?: { refreshToken?: string };
    },
    @Res() res: Response,
  ) {
    await this.authService.logoutByRefreshToken(req.cookies?.refreshToken);

    this.cookiesService.clearAuthCookies(res);
    this.cookiesService.clearCsrfCookie(res);

    const newGuestToken = randomBytes(32).toString('hex');
    res.cookie('guest_token', newGuestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      message: 'Logged out successfully',
    });
  }

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Req()
    req: Request & {
      cookies: {
        refreshToken?: string;
      };
    },
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    res.cookie(
      'accessToken',
      result.accessToken,
      this.getAuthCookieOptions(60 * 60 * 1000),
    );

    res.cookie(
      'refreshToken',
      result.refreshToken,
      this.getAuthCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return res.json({
      message: result.message,
    });
  }

  // ---------------------------------------------------------------------------
  // SESSION
  // ---------------------------------------------------------------------------

  @Get('session')
  @ApiOperation({ summary: 'Get current session status' })
  @ApiResponse({ status: 200, description: 'Session status retrieved' })
  async session(
    @Req()
    req: Request & {
      user?: Record<string, unknown>;
      cookies?: {
        accessToken?: string;
        refreshToken?: string;
      };
    },
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.getSession(
        req.cookies?.accessToken,
        req.cookies?.refreshToken,
      );

      if (
        result.authenticated &&
        result.refreshed &&
        result.accessToken &&
        result.refreshToken
      ) {
        this.cookiesService.setAuthCookies(
          res,
          result.accessToken,
          result.refreshToken,
        );
      }

      return res.json({
        authenticated: result.authenticated,
        user: result.user,
        csrfToken: req.cookies?.['csrf-token'] || null,
      });
    } catch (error) {
      this.cookiesService.clearAuthCookies(res);

      const message = 'Session check failed';

      return res.status(500).json({
        authenticated: false,
        user: null,
        error: message,
      });
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async listSessions(
    @Req()
    req: Request & {
      user: { id: number };
    },
  ) {
    const sessions = await this.authService.listSessions(req.user.id);

    return {
      sessions,
    };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Param('id') id: string,
  ) {
    const result = await this.authService.revokeSession(req.user.id, id);

    return result;
  }

  // ---------------------------------------------------------------------------
  // REGISTER
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() dto: RegisterDto,
    @Body('captchaId') captchaId?: string,
    @Body('captchaInput') captchaInput?: string,
  ) {
    if (!captchaId || !captchaInput) {
      throw new BadRequestException('CAPTCHA verification is required');
    }

    const isValid = await this.captchaService.verifyCaptcha(
      captchaId,
      captchaInput,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid or expired CAPTCHA');
    }

    return this.authService.register(dto);
  }

  // ---------------------------------------------------------------------------
  // EMAIL VERIFICATION
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 120 } })
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email resent' })
  @ApiBody({ type: ResendVerificationDto })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  // ---------------------------------------------------------------------------
  // PASSWORD RESET
  // ---------------------------------------------------------------------------

  @UseGuards(AuthThrottlerGuard)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ---------------------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  getProfile(
    @Req()
    req: Request & {
      user: { id: number };
    },
  ): Promise<{ message: string; user: SafeUser }> {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiBody({ type: UpdateProfileDto })
  updateProfile(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Body()
    dto: UpdateProfileDto,
  ): Promise<{ message: string; user: SafeUser }> {
    return this.authService.updateProfile(req.user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // PASSWORD CHANGE
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // ACCOUNT DELETION
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiBody({ type: DeleteAccountDto })
  async deleteAccount(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Res() res: Response,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.authService.deleteAccount(req.user.id, dto);
    this.cookiesService.clearAuthCookies(res);
    res.status(204).send();
  }

  // ---------------------------------------------------------------------------
  // AVATAR UPLOAD
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      fileFilter: (_req: Request, file: any, callback: any) => {
        const mimeType = file.mimetype;
        if (!(mimeType in allowedImageMimeTypes)) {
          callback(
            new BadRequestException(
              'Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadAvatar(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @UploadedFile() file: unknown,
  ) {
    if (!file) {
      throw new BadRequestException('An avatar image is required.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true },
    });

    if (currentUser?.avatar) {
      const key = currentUser.avatar.replace(/^\/uploads\//, '');
      await this.storageService.deleteFile(key);
    }

    const result = await this.storageService.uploadFile(
      file as MulterFile,
      'avatars',
    );

    await this.authService.updateProfile(req.user.id, { avatar: result.url });

    return { avatarUrl: result.url };
  }

  // ---------------------------------------------------------------------------
  // ADDRESSES
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  @ApiOperation({ summary: 'List user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  listAddresses(
    @Req()
    req: Request & {
      user: { id: number };
    },
  ) {
    return this.authService.listAddresses(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  @ApiOperation({ summary: 'Create user address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  @ApiBody({ type: CreateUserAddressDto })
  createAddress(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Body()
    dto: CreateUserAddressDto,
  ): Promise<{ message: string; user: SafeUser }> {
    return this.authService.createAddress(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update user address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiBody({ type: UpdateUserAddressDto })
  updateAddress(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: UpdateUserAddressDto,
  ): Promise<{ message: string; user: SafeUser }> {
    return this.authService.updateAddress(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete user address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  removeAddress(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.authService.removeAddress(req.user.id, Number(id));
  }
}
