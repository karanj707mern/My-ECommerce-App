import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RecentlyViewedController } from './recently-viewed.controller';
import { RecentlyViewedService } from './recently-viewed.service';

describe('RecentlyViewedController', () => {
  let controller: RecentlyViewedController;

  const recentlyViewedServiceMock = {
    addView: jest.fn(),
    getRecentlyViewed: jest.fn(),
    clearHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecentlyViewedController],
      providers: [
        {
          provide: RecentlyViewedService,
          useValue: recentlyViewedServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RecentlyViewedController>(RecentlyViewedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
