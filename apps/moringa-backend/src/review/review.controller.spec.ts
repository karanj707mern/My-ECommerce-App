import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLoggerService } from '@/audit/audit-logger.service';

describe('ReviewController', () => {
  let controller: ReviewController;

  const reviewServiceMock = {
    getFeaturedReviews: jest.fn(),
    getProductReviews: jest.fn(),
    getReviewEligibility: jest.fn(),
    createReview: jest.fn(),
    createComment: jest.fn(),
    moderateReview: jest.fn(),
    getPendingReviews: jest.fn(),
  };

  const auditLoggerServiceMock = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [
        {
          provide: ReviewService,
          useValue: reviewServiceMock,
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

    controller = module.get<ReviewController>(ReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
