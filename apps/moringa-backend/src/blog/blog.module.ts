import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    AuthSharedModule,PrismaModule],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
