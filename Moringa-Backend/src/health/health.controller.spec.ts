import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { RabbitMqService } from '@/notification/rabbitmq/rabbitmq.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const originalRedisUrl = process.env.REDIS_URL;

  const prismaServiceMock = {
    $queryRaw: jest.fn(),
  };

  const rabbitMqServiceMock = {
    isConfigured: true,
    isConnected: true,
  };

  beforeEach(async () => {
    delete process.env.REDIS_URL;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: RabbitMqService,
          useValue: rabbitMqServiceMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterAll(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
      return;
    }

    process.env.REDIS_URL = originalRedisUrl;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return ok status when database is reachable', async () => {
    prismaServiceMock.$queryRaw.mockResolvedValue([]);

    const result = await controller.check();

    expect(result.checks.database.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });

  it('should return degraded status when database is down', async () => {
    prismaServiceMock.$queryRaw.mockRejectedValue(new Error('DB error'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.status).toBe('down');
  });

  it('should return ready 200 when all checks are ok', async () => {
    prismaServiceMock.$queryRaw.mockResolvedValue([]);
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.ready(response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ status: 'ready' });
  });

  it('should return not_ready 503 when checks are degraded', async () => {
    prismaServiceMock.$queryRaw.mockRejectedValue(new Error('DB error'));
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.ready(response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ status: 'not_ready' });
  });

  it('should bound rabbitmq isConnected check with timeout', async () => {
    prismaServiceMock.$queryRaw.mockResolvedValue([]);
    rabbitMqServiceMock.isConnected = false;

    const result = await controller.check();

    expect(result.checks.rabbitmq.status).toBe('degraded');
  });
});
