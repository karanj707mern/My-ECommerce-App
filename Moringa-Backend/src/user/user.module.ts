import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesGuard } from '@/auth/rolesguard';
import { CaptchaModule } from '@/auth/captcha.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, CaptchaModule, AuthModule],
  controllers: [UserController],
  providers: [UserService, RolesGuard],
  exports: [UserService],
})
export class UserModule {}
