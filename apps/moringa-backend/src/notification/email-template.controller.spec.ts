import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { EmailTemplateController } from './email-template.controller';
import { EmailTemplateService } from './email-template.service';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLoggerService } from '@/audit/audit-logger.service';

describe('EmailTemplateController', () => {
  let controller: EmailTemplateController;

  const emailTemplateServiceMock = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const auditLoggerServiceMock = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplateController],
      providers: [
        {
          provide: EmailTemplateService,
          useValue: emailTemplateServiceMock,
        },
        {
          provide: AuditLoggerService,
          useValue: auditLoggerServiceMock,
        },
        AuditInterceptor,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmailTemplateController>(EmailTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
