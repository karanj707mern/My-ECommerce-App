import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Res,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AuthThrottlerGuard } from '@/auth/guards/auth-throttler.guard';
import { Throttle } from '@nestjs/throttler';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import type { File as MulterFile } from 'multer';

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
  ) {}

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('login')
  @ApiOperation({ summary: 'Login user with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: { email: string; password: string; captchaId?: string; captchaInput?: string }) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: { name: string; email: string; password: string; captchaId?: string; captchaInput?: string }) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: { user?: { id: number }; cookies?: { refreshToken?: string } }, @Res() res: Response) {
    const result = await this.authService.logout(req.user?.id);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json(result);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Req() req: { cookies?: { refreshToken?: string } }, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }
    const result = await this.authService.refreshAccessToken(refreshToken);
    res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ message: result.message });
  }

  @Get('session')
  @ApiOperation({ summary: 'Get current session' })
  @ApiResponse({ status: 200, description: 'Session status' })
  async session(@Req() req: { cookies?: { accessToken?: string; refreshToken?: string } }, @Res() res: Response) {
    const result = await this.authService.getSession(req.cookies?.accessToken, req.cookies?.refreshToken);
    return res.json(result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Req() req: { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@Req() req: { user: { id: number } }, @Body() dto: Record<string, unknown>) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(@Req() req: { user: { id: number } }, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset' })
  async resetPassword(@Body() dto: { token: string; password: string }) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Body() dto: { token: string }) {
    return this.authService.verifyEmail(dto);
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 120 } })
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email resent' })
  async resendVerification(@Body() dto: { email: string }) {
    return this.authService.resendVerification(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  @ApiOperation({ summary: 'List user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  async listAddresses(@Req() req: { user: { id: number } }) {
    return this.authService.listAddresses(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  @ApiOperation({ summary: 'Create user address' })
  @ApiResponse({ status: 201, description: 'Address created' })
  async createAddress(@Req() req: { user: { id: number } }, @Body() dto: Record<string, unknown>) {
    return this.authService.createAddress(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update user address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  async updateAddress(@Req() req: { user: { id: number } }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.authService.updateAddress(req.user.id, Number(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user address' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  async removeAddress(@Req() req: { user: { id: number } }, @Param('id') id: string) {
    return this.authService.removeAddress(req.user.id, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload user avatar' })
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
          callback(new Error('Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.'), false);
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadAvatar(@Req() req: { user: { id: number } }, @UploadedFile() file: MulterFile) {
    if (!file) {
      throw new Error('An avatar image is required.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true },
    });

    if (currentUser?.avatar) {
      const key = currentUser.avatar.replace(/^\/uploads\//, '');
      await this.storageService.deleteFile(key);
    }

    const result = await this.storageService.uploadFile(file, 'avatars');

    await this.authService.updateProfile(req.user.id, { avatar: result.url });

    return { avatarUrl: result.url };
  }
}
