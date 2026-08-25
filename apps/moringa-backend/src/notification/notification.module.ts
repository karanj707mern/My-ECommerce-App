import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailTemplateController } from './email-template.controller';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplateService as HandlebarsEmailTemplateService } from '../common/email-templates/email-template.service';
import { EmailTemplatesModule } from '../common/email-templates/email-templates.module';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module';
import { BullMqModule } from './bullmq/bullmq.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthSharedModule } from '../auth/auth-shared.module';

@Module({
  imports: [
    AuthSharedModule,
    RabbitMqModule,
    BullMqModule,
    PrismaModule,
    AuditModule,
    EmailTemplatesModule,
  ],
  controllers: [NotificationController, EmailTemplateController],
  providers: [
    NotificationService,
    EmailTemplateService,
    {
      provide: 'HANDLEBARS_EMAIL_TEMPLATE_SERVICE',
      useClass: HandlebarsEmailTemplateService,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}