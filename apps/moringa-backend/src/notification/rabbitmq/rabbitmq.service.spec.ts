import { Test, type TestingModule } from '@nestjs/testing';
import { RabbitMqService } from './rabbitmq.service';
import { PinoLogger } from '@/common/logger/pino.service';
import { ConfigService } from '@nestjs/config';

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'notifications' }),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(true),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test' }),
      cancel: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('RabbitMqService', () => {
  let service: RabbitMqService;
  let mockConfigService: Partial<ConfigService>;
  let mockLogger: Partial<PinoLogger>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'rabbitmq.host') return 'localhost';
        if (key === 'rabbitmq.port') return 5672;
        if (key === 'rabbitmq.user') return 'admin';
        if (key === 'rabbitmq.pass') return 'admin123';
        if (key === 'rabbitmq.vhost') return '/';
        if (key === 'rabbitmq.url') return '';
        return undefined;
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMqService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RabbitMqService>(RabbitMqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build connection URL from parts', () => {
    const connectionUrl = (service as any).buildConnectionUrl();
    expect(connectionUrl).toBe('amqp://admin:admin123@localhost:5672');
  });

  it('should return true when host is configured', () => {
    expect(service.isConfigured).toBe(true);
  });
});
