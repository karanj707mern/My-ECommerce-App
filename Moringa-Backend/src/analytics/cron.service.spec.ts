import { Test, type TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { AbandonedCartService } from './abandoned-cart.service';

describe('CronService', () => {
  let service: CronService;

  const abandonedCartServiceMock = {
    cleanupExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: AbandonedCartService,
          useValue: abandonedCartServiceMock,
        },
      ],
    }).compile();

    service = module.get<CronService>(CronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call cleanupExpired on handleAbandonedCartCleanup', async () => {
    abandonedCartServiceMock.cleanupExpired.mockResolvedValue(undefined);

    await service.handleAbandonedCartCleanup();

    expect(abandonedCartServiceMock.cleanupExpired).toHaveBeenCalled();
  });
});
