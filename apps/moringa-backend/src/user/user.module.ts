import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CaptchaModule } from '@/auth/captcha.module';
import { DeviceInfoService } from '@/auth/services/device-info.service';

@Module({
  imports: [AuthSharedModule, PrismaModule, CaptchaModule],
  controllers: [UserController],
  providers: [UserService, DeviceInfoService],
  exports: [UserService],
})
export class UserModule {}
