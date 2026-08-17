import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLoggerService } from '@/audit/audit-logger.service';

describe('CouponController', () => {
  let controller: CouponController;

  const couponServiceMock = {
    validateForUser: jest.fn(),
    findAll: jest.fn(),
    getCouponAnalytics: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const auditLoggerServiceMock = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponController],
      providers: [
        {
          provide: CouponService,
          useValue: couponServiceMock,
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

    controller = module.get<CouponController>(CouponController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
