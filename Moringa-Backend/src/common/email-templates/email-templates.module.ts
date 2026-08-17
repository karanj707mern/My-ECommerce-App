import { Module } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailTemplatesModule {}
